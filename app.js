const config = window.WEDDING_CONFIG;
document.querySelectorAll('[data-couple]').forEach(el => el.textContent = config.couple);
document.querySelectorAll('[data-location]').forEach(el => el.textContent = config.location);
const date = new Date(config.weddingDate);
document.querySelectorAll('[data-wedding-date]').forEach(el => el.textContent = date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Warsaw' }));
function tick() {
  const total = Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
  const values = { days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, seconds: total % 60 };
  Object.entries(values).forEach(([key, value]) => document.getElementById(key).textContent = String(value).padStart(2, '0'));
}
tick(); setInterval(tick, 1000);
const form = document.getElementById('rsvp-form');
const fields = document.getElementById('attending-fields');
const status = document.getElementById('form-status');
const feedbackDialog = document.getElementById('feedback-dialog');
const feedbackTitle = document.getElementById('feedback-title');
const feedbackIcon = document.getElementById('feedback-icon');
document.getElementById('feedback-close').addEventListener('click', () => feedbackDialog.close());
function showFeedback() {
  const positive = status.className === 'success';
  feedbackDialog.dataset.kind = positive ? 'success' : 'error';
  feedbackTitle.textContent = positive ? 'Dziękujemy za odpowiedź!' : 'Sprawdź swoją odpowiedź';
  feedbackIcon.textContent = positive ? '♡' : '!';
  if (!feedbackDialog.open) feedbackDialog.showModal();
}
function clearFieldErrors() {
  form.querySelectorAll('.is-error').forEach(el => {
    el.classList.remove('is-error');
    el.removeAttribute('aria-invalid');
  });
}
function clearSavedFields() {
  form.querySelectorAll('.is-saved').forEach(el => el.classList.remove('is-saved'));
}
function onAnswerEdited(event) {
  clearSavedFields();
  event.target.classList?.remove('is-error');
  event.target.removeAttribute?.('aria-invalid');
  if (status.className === 'success') {
    status.className = '';
    status.textContent = 'Masz niezapisane zmiany. Wyślij odpowiedź ponownie, aby je zapisać.';
  }
}
form.addEventListener('input', onAnswerEdited);
form.addEventListener('change', onAnswerEdited);

function syncAttendance() {
  const attending = form.elements.attendance.value === 'yes';
  fields.hidden = !attending;
  fields.querySelectorAll('input, select').forEach(el => el.disabled = !attending);
  const companionFields = document.getElementById('companion-fields');
  const withCompanion = attending && form.elements.hasCompanion.value === 'yes';
  companionFields.hidden = !withCompanion;
  companionFields.querySelectorAll('input, select').forEach(el => el.disabled = !withCompanion);
}
form.addEventListener('change', syncAttendance);
syncAttendance();
// Reuse an ID after a timeout: a retry must not append a second row.
let pendingId = null;
let pendingBody = null;
form.addEventListener('submit', async event => {
  event.preventDefault();
  clearSavedFields();
  clearFieldErrors();
  status.className = '';
  if (!config.appsScriptUrl) {
    status.className = 'error';
    status.textContent = 'To wersja pokazowa. Odpowiedź nie została wysłana — organizatorzy muszą jeszcze podłączyć Arkusze Google.';
    showFeedback();
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  if (data.website) return;
  const body = JSON.stringify(data);
  const submittedFields = Array.from(form.querySelectorAll('input, select, textarea'))
    .filter(el => !el.disabled && el.name !== 'website')
    .map(el => ({ el, value: el.value, checked: el.checked }));
  if (body !== pendingBody) { pendingId = crypto.randomUUID(); pendingBody = body; }
  const button = form.querySelector('button[type=submit]');
  const originalButtonText = button.textContent;
  button.disabled = true;
  button.textContent = 'Wysyłamy odpowiedź…';
  status.textContent = 'Wysyłamy Twoją odpowiedź…';
  try {
    const response = await fetch(config.appsScriptUrl, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...data, requestId: pendingId }), redirect: 'follow', signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) throw new Error('HTTP');
    const result = await response.json();
    if (result.code === 'GUEST') {
      ['firstName', 'lastName'].forEach(name => {
        form.elements[name].classList.add('is-error');
        form.elements[name].setAttribute('aria-invalid', 'true');
      });
      status.className = 'error';
      status.textContent = 'Nie udało się jednoznacznie dopasować osoby do listy gości. Sprawdź imię i nazwisko zgodne z zaproszeniem. Jeśli problem się powtarza, skontaktuj się z nami.';
      return;
    }
    if (!result.ok || result.requestId !== pendingId) throw new Error('No confirmation');
    status.className = 'success';
    status.textContent = data.attendance === 'yes' ? (data.hasCompanion === 'yes' ? 'Dziękujemy! Twoja odpowiedź i dane osoby towarzyszącej są zapisane. Do zobaczenia na weselu ♡' : 'Dziękujemy! Twoja odpowiedź jest zapisana. Do zobaczenia na weselu ♡') : 'Dziękujemy za wiadomość. Twoja odpowiedź jest zapisana ♡';
    const changed = submittedFields.some(({ el, value, checked }) => el.value !== value || el.checked !== checked);
    if (!changed) {
      submittedFields.forEach(({ el }) => {
        const filled = ['radio', 'checkbox'].includes(el.type) ? el.checked : el.value.trim() !== '';
        if (filled) el.classList.add('is-saved');
      });
    } else {
      status.className = '';
      status.textContent = 'Odpowiedź została zapisana, ale w trakcie wysyłania zmieniono pola. Wyślij ponownie, aby zapisać aktualne dane.';
    }
    pendingId = null; pendingBody = null;
  } catch {
    status.className = 'error';
    status.textContent = 'Nie otrzymaliśmy potwierdzenia zapisu. Spróbuj ponownie z tymi samymi danymi lub skontaktuj się z organizatorami. Twoje pola pozostają uzupełnione.';
  } finally {
    button.disabled = false;
    button.textContent = originalButtonText;
    showFeedback();
  }
});
// Włącz wysyłanie dopiero po poprawnym zarejestrowaniu obsługi formularza.
status.textContent = '';
form.querySelector('button[type=submit]').disabled = false;
