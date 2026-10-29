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

const invitationNotice = document.getElementById('invitation-notice');
function readInvitationLink() {
  const code = window.InvitationLinks.read(window.location.hash);
  if (code === null) return; // Zwykłe odnośniki sekcji nie usuwają kodu.
  if (code) {
    form.elements.invitationCode.value = code;

    invitationNotice.textContent = 'Kod z zaproszenia jest już uzupełniony. Wpisz swoje imię i nazwisko zgodnie z zaproszeniem.';
  } else {
    form.elements.invitationCode.value = '';

    invitationNotice.textContent = 'Link zawiera niepoprawny kod. Wpisz kod ręcznie lub poproś nas o nowy link.';
  }
}
readInvitationLink();
window.addEventListener('hashchange', readInvitationLink);

form.elements.invitationCode.addEventListener('input', () => { invitationNotice.textContent = ''; });
function syncAttendance() {
  const attending = form.elements.attendance.value === 'yes';
  fields.hidden = !attending;
  fields.querySelectorAll('input, select').forEach(el => el.disabled = !attending);
}
form.addEventListener('change', syncAttendance);
syncAttendance();
// Reuse an ID after a timeout: a retry must not append a second row.
let pendingId = null;
let pendingBody = null;
form.addEventListener('submit', async event => {
  event.preventDefault();
  status.className = '';
  if (!config.appsScriptUrl) {
    status.className = 'error';
    status.textContent = 'To wersja pokazowa. Odpowiedź nie została wysłana — organizatorzy muszą jeszcze podłączyć Arkusze Google.';
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  if (data.website) return;
  const body = JSON.stringify(data);
  if (body !== pendingBody) { pendingId = crypto.randomUUID(); pendingBody = body; }
  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  status.textContent = 'Wysyłamy Twoją odpowiedź…';
  try {
    const response = await fetch(config.appsScriptUrl, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...data, requestId: pendingId }), redirect: 'follow', signal: AbortSignal.timeout(25000)
    });
    if (!response.ok) throw new Error('HTTP');
    const result = await response.json();
    if (result.code === 'INVITATION') {

      status.className = 'error';
      status.textContent = 'Sprawdź kod zaproszenia oraz imię i nazwisko zgodne z zaproszeniem. Jeśli problem się powtarza, skontaktuj się z nami.';
      return;
    }
    if (!result.ok || result.requestId !== pendingId) throw new Error('No confirmation');
    status.className = 'success';
    status.textContent = data.attendance === 'yes' ? 'Dziękujemy! Twoja odpowiedź jest zapisana. Do zobaczenia na weselu ♡' : 'Dziękujemy za wiadomość. Twoja odpowiedź jest zapisana ♡';
    const invitationCode = form.elements.invitationCode.value;
    form.reset(); form.elements.invitationCode.value = invitationCode;
    syncAttendance(); pendingId = null; pendingBody = null;
  } catch {
    status.className = 'error';
    status.textContent = 'Nie otrzymaliśmy potwierdzenia zapisu. Spróbuj ponownie z tymi samymi danymi lub skontaktuj się z organizatorami. Twoje pola pozostają uzupełnione.';
  } finally { button.disabled = false; }
});
