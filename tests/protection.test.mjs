import {test} from 'node:test';
import assert from 'node:assert/strict';
import {harness,main,invited} from './support/google-fixture.mjs';
const queue=h=>h.tables['Do sprawdzenia']?.slice(1)||[];

test('21st form in five minutes goes to review with all guest rows and its group ID',()=>{
  const h=harness();for(let i=0;i<20;i++) assert.equal(h.send().ok,true);
  const result=h.send([main,invited]);
  assert.equal(result.ok,true);assert.equal(result.count,2);assert.equal(h.tables.Zgloszenia.length,21);
  assert.equal(queue(h).length,2);queue(h).forEach(row=>{assert.equal(row[8],result.submissionId);assert.equal(row[10],'Oczekuje');});
  assert.match(h.tables.Ochrona[1][1],/DO SPRAWDZENIA/);
});
test('a large single form goes entirely to review while normal duplicate names remain allowed',()=>{
  const h=harness();const result=h.send(Array(101).fill(main));
  assert.equal(result.ok,true);assert.equal(h.tables.Zgloszenia.length,1);assert.equal(queue(h).length,101);
});
test('rolling window expires, cooldown retains later forms and then normal mode returns',()=>{
  const h=harness();for(let i=0;i<21;i++) h.send();
  h.advance(6*60*1000);h.send();assert.equal(queue(h).length,2);
  h.advance(25*60*1000);h.send();assert.equal(queue(h).length,2);assert.equal(h.tables.Zgloszenia.length,22);
  const other=harness();for(let i=0;i<20;i++)other.send();other.advance(5*60*1000);other.send();
  assert.equal(queue(other).length,0);
});
test('ongoing surge extends protection and traffic state stays bounded',()=>{
  const h=harness();for(let i=0;i<500;i++)h.send();
  assert.ok(h.properties.get('TRAFFIC_STATE').length<9000);
  assert.equal(JSON.parse(h.properties.get('TRAFFIC_STATE')).recent.length,21);
  h.advance(4*60*1000);h.send();
  const until=JSON.parse(h.properties.get('TRAFFIC_STATE')).until;
  assert.equal(until,h.context.Date.now()+30*60*1000);
});
test('manual review and resume switches work without deleting any responses',()=>{
  const h=harness();h.context.enableReviewMode();h.send();assert.equal(queue(h).length,1);
  h.context.resumeNormalSubmissions();h.send();assert.equal(h.tables.Zgloszenia.length,2);assert.equal(queue(h).length,1);
});
test('malformed traffic state conservatively routes into review',()=>{
  const h=harness();h.properties.set('TRAFFIC_STATE','broken');assert.equal(h.send().ok,true);
  assert.equal(queue(h).length,1);assert.equal(h.tables.Zgloszenia.length,1);
});
test('invalid guest fields never write or count as accepted submissions',()=>{
  const h=harness();assert.equal(h.send([{...main,firstName:''}]).code,'FIELDS');
  assert.equal(h.properties.has('TRAFFIC_STATE'),false);assert.equal(h.writes,0);
});
test('selecting one review row approves the entire group once without deleting audit rows',()=>{
  const h=harness();h.context.enableReviewMode();h.send([main,invited]);h.send();
  h.selectRows(2);h.context.approveSelectedSubmissions();
  assert.equal(h.tables.Zgloszenia.length,3);assert.equal(queue(h)[0][10],'Zatwierdzone');assert.equal(queue(h)[1][10],'Zatwierdzone');assert.equal(queue(h)[2][10],'Oczekuje');
  h.context.approveSelectedSubmissions();assert.equal(h.tables.Zgloszenia.length,3);
});
test('approval retry repairs status after a previous append, without duplicating the group',()=>{
  const h=harness();h.context.enableReviewMode();h.send([main,invited]);
  h.tables.Zgloszenia.push(...queue(h).map(row=>row.slice(0,9)));h.selectRows(2);h.context.approveSelectedSubmissions();
  assert.equal(h.tables.Zgloszenia.length,3);queue(h).forEach(row=>assert.equal(row[10],'Zatwierdzone'));
});
test('installation creates one folder, one daily Warsaw trigger and first full copy',()=>{
  const h=harness();h.send();h.context.installProtection();h.context.installProtection();
  assert.equal(h.cloud.folders,1);assert.equal(h.triggers.length,1);assert.equal(h.triggers[0].hour,3);assert.equal(h.triggers[0].zone,'Europe/Warsaw');assert.equal(h.triggers[0].days,1);
  assert.equal(h.copies.length,1);assert.equal(h.copies[0].tables.Zgloszenia.length,2);
  h.send();assert.equal(h.copies[0].tables.Zgloszenia.length,2);
});
test('next day creates another copy; manual snapshots can be made the same day',()=>{
  const h=harness();h.context.installProtection();h.advance(24*60*60*1000);h.context.dailyBackup();h.context.dailyBackup();
  assert.equal(h.copies.length,2);h.context.createBackupNow();assert.equal(h.copies.length,3);
  assert.ok(h.properties.get('BACKUP_LAST_URL'));assert.equal(h.properties.get('BACKUP_LAST_ERROR'),'');
});
test('failed backup records an error while existing snapshots and normal submission stay intact',()=>{
  const h=harness();h.context.installProtection();h.cloud.failCopy=true;
  assert.throws(()=>h.context.createBackupNow(),/Drive unavailable/);
  assert.equal(h.copies.length,1);assert.match(h.properties.get('BACKUP_LAST_ERROR'),/Drive unavailable/);assert.equal(h.send().ok,true);
  h.cloud.failCopy=false;h.context.createBackupNow();assert.equal(h.properties.get('BACKUP_LAST_ERROR'),'');
});
