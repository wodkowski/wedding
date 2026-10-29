import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

for (const successful of [false, true]) test(successful ? 'saved answers remain filled, turn green and lose saved state on edit' : 'invalid invitation shows an error, cancels navigation and preserves fields', async () => {
  const events = {};
  const button = { disabled: true };
  const status = { textContent: '' };
  const savedClasses = new Set();
  const firstName = { name:'firstName', type:'text', value: 'Anna', setAttribute() {}, removeAttribute() {}, classList:{add: value => savedClasses.add(value),remove: value => savedClasses.delete(value)} };
  const lastName = { classList: { add(value) { this.error = value; } }, setAttribute() {} };
  const dialog = { dataset:{}, open:false, showModal() { this.open = true; }, close() { this.open = false; } };
  const form = {
    elements: { attendance: { value: 'yes' }, firstName, lastName },
    addEventListener(name, handler) { events[name] = handler; },
    querySelector: () => button,
    querySelectorAll: selector => selector === '.is-error' ? [] : selector === '.is-saved' ? (savedClasses.has('is-saved') ? [firstName] : []) : [firstName],
    reset: () => assert.fail('Must preserve fields after submission')
  };
  const fields = { querySelectorAll: () => [] };
  const nodes = { 'rsvp-form': form, 'attending-fields': fields, 'form-status': status, 'invitation-notice': {}, 'feedback-dialog':dialog, 'feedback-title':{}, 'feedback-icon':{}, 'feedback-close':{addEventListener(){}} };
  const context = vm.createContext({
    window: { WEDDING_CONFIG: { weddingDate:'2027-06-12',appsScriptUrl:'https://example.test/exec' }, InvitationLinks:{ read: () => null }, location:{ hash:'#rsvp' }, addEventListener() {} },
    document: { querySelectorAll: () => [], getElementById: id => nodes[id] || {} },
    setInterval() {}, crypto:{ randomUUID: () => 'request-id' }, AbortSignal:{ timeout: () => null },
    FormData: class { *[Symbol.iterator]() { yield ['firstName','Anna']; yield ['lastName','Testowa']; } },
    fetch: async () => ({ ok:true, json:async () => successful ? ({ok:true,requestId:'request-id'}) : ({ ok:false,code:'GUEST' }) })
  });
  vm.runInContext(readFileSync(new URL('../app.js', import.meta.url),'utf8'),context);
  assert.equal(button.disabled,false);
  let cancelled = false;
  await events.submit({ preventDefault() { cancelled = true; } });
  assert.equal(cancelled,true);
  assert.equal(status.className,successful ? 'success' : 'error');
  assert.match(status.textContent,successful ? /zapisana/ : /Sprawdź imię/);
  assert.equal(firstName.value,'Anna');
  assert.equal(button.disabled,false);
  assert.equal(savedClasses.has('is-saved'),successful);
  assert.equal(dialog.open,true);
  assert.equal(dialog.dataset.kind,successful ? 'success' : 'error');
  if (!successful) {
    assert.equal(savedClasses.has('is-error'),true);
    assert.equal(lastName.classList.error,'is-error');
  }
  if (successful) {
    // Edycja innego pola też musi usunąć zieleń z kodu zaproszenia.
    events.input({target:{name:'notes',value:'Nowa wiadomość'}});
    assert.equal(savedClasses.has('is-saved'),false);
    assert.match(status.textContent,/niezapisane zmiany/);
  }
});

test('HTML prevents native navigation and blocks submit until scripts initialize', () => {
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<form id="rsvp-form" onsubmit="event.preventDefault\(\)">/);
  assert.match(html,/<button class="button" type="submit" disabled>/);
});
