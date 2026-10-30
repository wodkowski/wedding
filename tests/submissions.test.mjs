import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {harness,main,invited} from './support/google-fixture.mjs';

test('arbitrary guests are accepted without any roster or invitation sheets',()=>{
  const h=harness();const result=h.send([main,invited,{...main,firstName:'Ktoś',lastName:'Spoza Listy'}]);
  assert.equal(result.ok,true);assert.equal(result.count,3);assert.equal(h.tables.Zgloszenia.length,4);
  assert.equal(h.tables.Zgloszenia[3][1],'Ktoś');
});
test('same names within one submission and identical repeated submissions append duplicates',()=>{
  const h=harness();h.send([main,main]);h.send([main,main]);
  assert.equal(h.tables.Zgloszenia.length,5);
  h.tables.Zgloszenia.slice(1).forEach(row=>assert.equal(row[1],main.firstName));
});
test('edited submission appends and never modifies earlier answers',()=>{
  const h=harness();h.send();const old=h.tables.Zgloszenia[1].slice();
  h.send([{...main,menu:'vegan',lastName:'Nowe'}]);
  assert.deepEqual(h.tables.Zgloszenia[1],old);assert.equal(h.tables.Zgloszenia.length,3);
  assert.equal(h.tables.Zgloszenia[2][4],'Wegańskie');
});
test('missing required answers reject the whole submission without partial rows',()=>{
  for (const changes of [{firstName:''},{firstName:'   '},{lastName:''},{attendance:''},{menu:''},{stay:''}]) {
    const h=harness();const result=h.send([main,{...invited,...changes}]);
    assert.equal(result.code,'FIELDS');assert.equal(result.personIndex,1);assert.equal(h.writes,0);
  }
});
test('allergies and notes remain optional; decline does not require menu or stay',()=>{
  const h=harness();assert.equal(h.send([invited,{firstName:'Piotr',lastName:'Testowy',attendance:'no'}]).ok,true);
  assert.equal(h.tables.Zgloszenia[1][6],'');assert.equal(h.tables.Zgloszenia[1][7],'');
  assert.equal(h.tables.Zgloszenia[2][3],'Nie');assert.equal(h.tables.Zgloszenia[2][4],'');
});
test('date and time are recorded for each row in Europe/Warsaw',()=>{
  const h=harness();h.send([main,invited]);
  assert.equal(h.dateCalls[0].zone,'Europe/Warsaw');assert.equal(h.dateCalls[0].format,'yyyy-MM-dd HH:mm:ss');
  h.tables.Zgloszenia.slice(1).forEach(row=>assert.equal(row[0],'2026-10-30 12:34:56'));
});
test('entered text stays text rather than becoming a spreadsheet formula',()=>{
  const h=harness();assert.equal(h.send([{...main,firstName:'=SUM(1)',notes:'@formula'}]).ok,true);
  assert.equal(h.tables.Zgloszenia[1][1],"'=SUM(1)");assert.equal(h.tables.Zgloszenia[1][7],"'@formula");
});
test('setup creates fresh append-only sheet and keeps historic responses untouched',()=>{
  const h=harness();delete h.tables.Zgloszenia;h.tables.OdpowiedziV3=[['old'],['keep']];
  h.context.setup();assert.equal(h.tables.Zgloszenia[0].length,9);assert.equal(h.tables.OdpowiedziV3[1][0],'keep');
});

test('guests sent together share one submission ID; each repeated send gets a new ID',()=>{
  const h=harness();const first=h.send([main,invited]);const second=h.send([main,invited]);
  assert.ok(first.submissionId);assert.notEqual(first.submissionId,second.submissionId);
  assert.equal(h.tables.Zgloszenia[1][8],first.submissionId);assert.equal(h.tables.Zgloszenia[2][8],first.submissionId);
  assert.equal(h.tables.Zgloszenia[3][8],second.submissionId);assert.equal(h.tables.Zgloszenia[4][8],second.submissionId);
  assert.equal(h.tables.Zgloszenia[0][8],'ID zgłoszenia');
});

test('adding submission column does not backfill or alter older guest rows',()=>{
  const h=harness();h.tables.Zgloszenia.push(['2026-01-01','Stary','Wpis','Tak','Menu','Nie','','']);
  const old=h.tables.Zgloszenia[1].slice();h.send();
  assert.deepEqual(h.tables.Zgloszenia[1],old);assert.ok(h.tables.Zgloszenia[2][8]);
});
test('missing setup and old protocol fail without claiming data was saved',()=>{
  const h=harness();assert.equal(h.send([main],{version:3}).code,'VERSION');delete h.tables.Zgloszenia;
  assert.equal(h.send().code,'SETUP');assert.equal(h.writes,0);
});
test('form requires original starred fields but keeps allergies and notes optional',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="add-person"/);assert.doesNotMatch(html,/<form[^>]+novalidate|id="add-(invited|companion)"/);
  for(const name of ['firstName','lastName','attendance','menu','stay']) assert.match(html,new RegExp('data-field="'+name+'" required'));
  for(const name of ['allergies','notes']) assert.doesNotMatch(html,new RegExp('data-field="'+name+'"[^>]*required'));
});
