import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('invalid invitation shows an error, cancels navigation and preserves fields', async () => {
  const events = {};
  const button = { disabled: true };
  const status = { textContent: '' };
  const code = { value: 'ZZZZ9999', addEventListener() {} };
  const form = {
    elements: { attendance: { value: 'yes' }, invitationCode: code },
    addEventListener(name, handler) { events[name] = handler; },
    querySelector: () => button,
    reset: () => assert.fail('Must preserve fields after rejection')
  };
  const fields = { querySelectorAll: () => [] };
  const nodes = { 'rsvp-form': form, 'attending-fields': fields, 'form-status': status, 'invitation-notice': {} };
  const context = vm.createContext({
    window: { WEDDING_CONFIG: { weddingDate:'2027-06-12',appsScriptUrl:'https://example.test/exec' }, InvitationLinks:{ read: () => null }, location:{ hash:'#rsvp' }, addEventListener() {} },
    document: { querySelectorAll: () => [], getElementById: id => nodes[id] || {} },
    setInterval() {}, crypto:{ randomUUID: () => 'request-id' }, AbortSignal:{ timeout: () => null },
    FormData: class { *[Symbol.iterator]() { yield ['invitationCode',code.value]; yield ['firstName','Anna']; yield ['lastName','Testowa']; } },
    fetch: async () => ({ ok:true, json:async () => ({ ok:false,code:'INVITATION' }) })
  });
  vm.runInContext(readFileSync(new URL('../app.js', import.meta.url),'utf8'),context);
  assert.equal(button.disabled,false);
  let cancelled = false;
  await events.submit({ preventDefault() { cancelled = true; } });
  assert.equal(cancelled,true);
  assert.equal(status.className,'error');
  assert.match(status.textContent,/Sprawdź kod/);
  assert.equal(code.value,'ZZZZ9999');
  assert.equal(button.disabled,false);
});

test('HTML prevents native navigation and blocks submit until scripts initialize', () => {
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<form id="rsvp-form" onsubmit="event.preventDefault\(\)">/);
  assert.match(html,/<button class="button" type="submit" disabled>/);
});
