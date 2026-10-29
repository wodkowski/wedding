import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function harness() {
  const tables = {
    Zaproszenia: [['id','code','active'], ['Z1','a'.repeat(32),'TAK'], ['Z2','b'.repeat(32),'TAK']],
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
  const data = { requestId:'11111111-1111-4111-8111-111111111111', firstName:'Anna',lastName:'Kowalska',attendance:'yes',menu:'classic',stay:'no',invitationCode:'a'.repeat(32),notes:'=SUM(1)' };
  return { tables, context, send: changes => context.doPost({ postData: { contents: JSON.stringify({ ...data,...changes }) } }) };
}
test('unknown, missing, revoked and mismatched invitations cannot write', () => {
  const h = harness();
  for (const change of [{invitationCode:''},{invitationCode:'f'.repeat(32)},{invitationCode:'b'.repeat(32)},{firstName:'Other'}]) assert.equal(h.send(change).ok,false);
  h.tables.Zaproszenia[1][2]='NIE';
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
test('other invitation can only write its own guest; decline clears meals', () => {
  const h=harness(); h.send({});
  assert.equal(h.send({invitationCode:'b'.repeat(32),firstName:'Jan',lastName:'Nowak',attendance:'no'}).ok,true);
  assert.equal(h.tables.OdpowiedziV2.length,3);
  assert.equal(h.tables.OdpowiedziV2[2][0],'guest2');
  assert.equal(h.tables.OdpowiedziV2[2][5],'');
});
test('invalid data rejected and generation preserves existing codes', () => {
  const h=harness();
  assert.equal(h.send({menu:'toString'}).ok,false);
  assert.equal(h.send({notes:'x'.repeat(1001)}).ok,false);
  h.context.generateInvitationCodes();
  assert.equal(h.tables.Zaproszenia.length,3);
  assert.equal(h.tables.Zaproszenia[1][1],'a'.repeat(32));
});
