import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({ window: {}, URLSearchParams });
vm.runInContext(readFileSync(new URL('../invitation-links.js', import.meta.url), 'utf8'), context);
const read = context.window.InvitationLinks.read;
test('reads invitation fragment and normalizes codes', () => {
  assert.equal(read('#zaproszenie=K7PM4R9A'), 'K7PM4R9A');
  assert.equal(read('#zaproszenie=k7pm-4r9a'), 'K7PM4R9A');
});
test('ordinary section anchors preserve the invitation in memory', () => {
  assert.equal(read('#rsvp'), null);
  assert.equal(read(''), null);
});
test('malformed and legacy codes are rejected', () => {
  for (const code of ['', 'AAAA', 'a'.repeat(32), '0O1I2345', '%3Cscript%3E', '%E0%A4%A']) {
    assert.equal(read('#zaproszenie=' + code), '');
  }
});
