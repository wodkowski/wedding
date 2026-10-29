import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function harness() {
  const tables = {
    Zaproszenia: [['id','code','active'], ['Z1','ABCD2345','TAK'], ['Z2','EFGH6789','TAK']],
    Goscie: [['id','first','last','guest'], ['Z1','Anna','Kowalska','guest1'], ['Z2','Jan','Nowak','guest2']],
    OdpowiedziV2: [Array(11).fill('header')]
  };
  let held = false;
  const sheet = name => ({
    getDataRange: () => ({ getDisplayValues: () => tables[name].map(row => row.map(String)) }),
    getLastRow: () => tables[name].length,
    appendRow: row => tables[name].push(row),
    getRange: (r,c) => ({ setValues: rows => rows.forEach((row,i) => { tables[name][r-1+i] = row; }), setValue: value => { tables[name][r-1][c-1] = value; } })
  });
  const context = vm.createContext({
    LockService: { getScriptLock: () => ({ waitLock: () => { held = true; }, hasLock: () => held, releaseLock: () => { held = false; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'book' }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: sheet }), flush: () => {} },
    Utilities: { getUuid: () => 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: value => ({ setMimeType: () => JSON.parse(value) }) }
  });
  vm.runInContext(readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8'), context);
  const data = { requestId:'11111111-1111-4111-8111-111111111111', firstName:'Anna',lastName:'Kowalska',attendance:'yes',menu:'classic',stay:'no',notes:'=SUM(1)' };
  return { tables, context, send: changes => context.doPost({ postData: { contents: JSON.stringify({ ...data,...changes }) } }) };
}
test('unknown guests and ambiguous names cannot write', () => {
  const h = harness();
  assert.equal(h.send({firstName:'Other'}).ok,false);
  h.tables.Goscie.push(['Z3','Anna','Kowalska','guest3']);
  assert.equal(h.send({}).ok,false);
  assert.equal(h.tables.OdpowiedziV2.length,1);
});
test('valid write, retry and update remain one row; formulas escaped', () => {
  const h=harness();
  assert.equal(h.send({firstName:' ANNA '}).ok,true);
  assert.equal(h.send({}).ok,true);
  assert.equal(h.tables.OdpowiedziV2.length,2);
  assert.equal(h.tables.OdpowiedziV2[1][8][0],"'");
  assert.equal(h.send({requestId:'22222222-2222-4222-8222-222222222222',menu:'vegan'}).ok,true);
  assert.equal(h.tables.OdpowiedziV2.length,2);
  assert.equal(h.tables.OdpowiedziV2[1][5],'Wegańskie');
});
test('listed guest can submit without invitation code; decline clears meals', () => {
  const h=harness(); h.send({});
  assert.equal(h.send({firstName:'Jan',lastName:'Nowak',attendance:'no'}).ok,true);
  assert.equal(h.tables.OdpowiedziV2.length,3);
  assert.equal(h.tables.OdpowiedziV2[2][0],'guest2');
  assert.equal(h.tables.OdpowiedziV2[2][5],'');
});
test('invitation tables are not required and missing guest IDs are assigned', () => {
  const h = harness();
  delete h.tables.Zaproszenia;
  h.tables.Goscie[1][3] = '';
  assert.equal(h.send({firstName:' ANNA '}).ok,true);
  assert.ok(h.tables.Goscie[1][3]);
  assert.equal(h.tables.OdpowiedziV2[1][0],h.tables.Goscie[1][3]);
});

test('generator creates eight character codes and refuses duplicate candidates', () => {
  const h = harness();
  const code = h.context.createInvitationCode([]);
  assert.match(code, /^[2-9A-HJ-NP-Z]{8}$/);
  assert.throws(() => h.context.createInvitationCode([code.toLowerCase()]));
  h.tables.Goscie.push(['Z3','Maria','Testowa','guest3']);
  h.context.generateInvitationCodes();
  assert.equal(h.tables.Zaproszenia[3][1],code);
  assert.equal(h.tables.Zaproszenia[3][3],'https://wodkowski.github.io/wedding/#zaproszenie=' + code);
  h.context.generateInvitationCodes();
  assert.equal(h.tables.Zaproszenia.length,4);
});

test('code cannot authorize a name missing from the guest list', () => {
  const h = harness();
  const oldCode = 'a'.repeat(32);
  h.tables.Zaproszenia[1][1] = oldCode;
  assert.equal(h.send({invitationCode:oldCode,firstName:'Other'}).ok,false);
  assert.equal(h.tables.OdpowiedziV2.length,1);
});

test('invalid data rejected and generation preserves existing codes', () => {
  const h=harness();
  assert.equal(h.send({menu:'toString'}).ok,false);
  assert.equal(h.send({notes:'x'.repeat(1001)}).ok,false);
  h.context.generateInvitationCodes();
  assert.equal(h.tables.Zaproszenia.length,3);
  assert.equal(h.tables.Zaproszenia[1][1],'ABCD2345');
});
