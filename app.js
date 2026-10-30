(() => {
  const config = window.WEDDING_CONFIG;
  document.querySelectorAll('[data-couple]').forEach(el => el.textContent = config.couple);
  document.querySelectorAll('[data-location]').forEach(el => el.textContent = config.location);
  const date = new Date(config.weddingDate);
  document.querySelectorAll('[data-wedding-date]').forEach(el => el.textContent = date.toLocaleDateString('pl-PL', {day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Warsaw'}));
  function tick() {
    const total = Math.max(0,Math.floor((date.getTime()-Date.now())/1000));
    const values = {days:Math.floor(total/86400),hours:Math.floor(total/3600)%24,minutes:Math.floor(total/60)%60,seconds:total%60};
    Object.entries(values).forEach(([key,value]) => document.getElementById(key).textContent = String(value).padStart(2,'0'));
  }
  tick(); setInterval(tick,1000);
  const form = document.getElementById('rsvp-form');
  const list = document.getElementById('people-list');
  const status = document.getElementById('form-status');
  const dialog = document.getElementById('feedback-dialog');
  const reviewDialog = document.getElementById('review-dialog');
  const reviewPeople = document.getElementById('review-people');
  const confirmButton = document.getElementById('review-confirm');
  let pendingReview = null;
  let sending = false;
  const submitButton = form.querySelector('button[type=submit]');
  const addPersonButton = document.getElementById('add-person');
  const removePersonButton = document.getElementById('remove-person');
  const stateNotice = document.getElementById('save-notice');
  let saved = false;
  let counter = 0;
  const cards = () => Array.from(list.querySelectorAll('.person-card'));
  const field = (card,name) => card.querySelector(`[data-field="${name}"]`);
  function feedback(kind,text,buttonText='Rozumiem',summary=null) {
    status.className = kind;
    status.textContent = text;
    if (summary) {
      const intro = document.createElement('p');
      intro.className = 'feedback-intro';
      intro.textContent = text;
      const stats = document.createElement('dl');
      stats.className = 'feedback-stats';
      [
        ['Osób w zgłoszeniu',summary.total],
        ['Potwierdziło przybycie',summary.attending]
      ].forEach(([label,value]) => {
        const tile = document.createElement('div');
        const term = document.createElement('dt');
        term.textContent = label;
        const count = document.createElement('dd');
        const number = document.createElement('strong');
        number.textContent = value;
        count.append(number);
        tile.append(term,count);
        stats.append(tile);
      });
      const outro = document.createElement('p');
      outro.className = 'feedback-outro';
      outro.textContent = 'Do zobaczenia na weselu!';
      status.replaceChildren(intro,stats,outro);
    }
    dialog.dataset.kind = kind;
    document.getElementById('feedback-close').textContent = buttonText;
    document.getElementById('feedback-title').textContent = kind === 'success' ? 'Dziękujemy za odpowiedź!' : 'Nie udało się potwierdzić zapisu';
    document.getElementById('feedback-icon').textContent = kind === 'success' ? '♡' : '!';
    if (!dialog.open) dialog.showModal();
  }
  document.getElementById('feedback-close').addEventListener('click',() => dialog.close());
  function updateFieldError(el) {
    const invalid = !el.disabled && el.willValidate && !el.validity.valid;
    const message = document.getElementById(`${el.id}-error`);
    el.classList.toggle('is-error',invalid);
    if (invalid) {
      el.classList.remove('is-saved');
      el.setAttribute('aria-invalid','true');
    } else el.removeAttribute('aria-invalid');
    if (message) {
      message.hidden = !invalid;
      message.textContent = invalid ? (el.required && !el.value.trim() ? 'Pole nie może być puste' : el.validationMessage) : '';
    }
  }
  // Zdarzenie invalid nie bąbelkuje: przechwytujemy je dla wszystkich pól i kart.
  form.addEventListener('invalid',event => updateFieldError(event.target),true);
  function markDirty(target) {
    form.querySelectorAll('.is-saved').forEach(el => el.classList.remove('is-saved'));
    if (saved) stateNotice.textContent = 'Masz niezapisane zmiany. Wyślij wszystkie odpowiedzi ponownie.';
    stateNotice.classList.remove('is-confirmed');
    saved = false;
  }
  function sync() {
    const current = cards();
    removePersonButton.hidden = current.length <= 1;
    current.forEach((card,index) => {
      card.querySelector('[data-person-title]').textContent = `Gość ${index+1}`;
      card.querySelector('[data-remove]').hidden = index === 0;
      const details = card.querySelector('[data-person-details]');
      const attending = field(card,'attendance').value === 'yes';
      details.hidden = !attending;
      details.querySelectorAll('input,select').forEach(el => {
        el.disabled = !attending;
        if (el.disabled) updateFieldError(el);
      });
      ['firstName','lastName'].forEach(name => {
        const el = field(card,name);
        el.setCustomValidity(el.value && !el.value.trim() ? 'Wpisz imię lub nazwisko, nie same spacje.' : '');
      });
    });
    const attendees = current.filter(card => field(card,'attendance').value === 'yes').length;
    document.getElementById('people-summary').textContent = `Osób w zgłoszeniu: ${current.length} · Potwierdza obecność: ${attendees}`;
  }
  function addPerson(focus=true) {
    const card = document.getElementById('person-template').content.firstElementChild.cloneNode(true);
    card.dataset.key = String(++counter);
    card.querySelectorAll('[data-field]').forEach(el => {
      el.name = `person-${counter}-${el.dataset.field}`;
      el.id = `person-${counter}-${el.dataset.field}`;
      el.autocomplete = 'off';
      const error = document.createElement('span');
      error.id = `${el.id}-error`;
      error.className = 'field-error';
      error.hidden = true;
      el.insertAdjacentElement('afterend',error);
      el.setAttribute('aria-describedby',error.id);
    });
    card.querySelector('[data-remove]').addEventListener('click',() => {
      markDirty(); card.remove(); sync();
      (cards().at(-1)?.querySelector('input') || addPersonButton).focus();
    });
    list.append(card);
    markDirty(); sync();
    if (focus) field(card,'firstName').focus();
  }
  addPersonButton.addEventListener('click',() => addPerson());
  removePersonButton.addEventListener('click',() => {
    const current = cards();
    if (current.length <= 1) return;
    markDirty();
    current.at(-1).remove();
    sync();
    (removePersonButton.hidden ? addPersonButton : removePersonButton).focus();
  });
  function onEdit(event) {
    markDirty(); sync();
    if (event.target.classList.contains('is-error')) updateFieldError(event.target);
  }
  form.addEventListener('input',onEdit);
  form.addEventListener('change',onEdit);
  function serialize() {
    return cards().filter(card => !card.hidden).map(card => {
      const data = {};
      card.querySelectorAll('[data-field]').forEach(el => { if (!el.disabled) data[el.dataset.field] = el.value; });
      return data;
    });
  }
  function showReview(people) {
    const menus = {classic:'Klasyczne (z mięsem)',vegetarian:'Wegetariańskie',vegan:'Wegańskie',child:'Dziecięce'};
    const stays = {yes:'Tak',no:'Nie',unsure:'Jeszcze nie wiem'};
    const content = document.createDocumentFragment();
    people.forEach((person,index) => {
      const card = document.createElement('article');
      card.className = 'review-person';
      const heading = document.createElement('h3');
      heading.textContent = `Gość ${index+1}: ${person.firstName} ${person.lastName}`;
      const answers = document.createElement('dl');
      const attending = person.attendance === 'yes';
      [
        ['Obecność',attending ? 'Tak, będzie z nami' : 'Nie, nie może przyjść'],
        ['Menu',attending ? menus[person.menu] : 'Nie dotyczy'],
        ['Nocleg',attending ? stays[person.stay] : 'Nie dotyczy'],
        ['Alergie',attending ? person.allergies || 'Brak informacji' : 'Nie dotyczy'],
        ['Uwagi',person.notes || 'Brak']
      ].forEach(([label,value]) => {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        term.textContent = label;
        const detail = document.createElement('dd');
        detail.textContent = value;
        row.append(term,detail);
        answers.append(row);
      });
      card.append(heading,answers);
      content.append(card);
    });
    reviewPeople.replaceChildren(content);
    document.getElementById('review-count').textContent = `Zgłoszonych osób: ${people.length} · Przybędzie: ${people.filter(person => person.attendance === 'yes').length}`;
    pendingReview = people;
    reviewDialog.showModal();
    reviewPeople.scrollTop = 0;
  }
  document.getElementById('review-edit').addEventListener('click',() => reviewDialog.close());
  reviewDialog.addEventListener('close',() => { pendingReview = null; });
  confirmButton.addEventListener('click',() => {
    if (!pendingReview || sending) return;
    const people = pendingReview;
    pendingReview = null;
    reviewDialog.close();
    sendPeople(people);
  });
  form.addEventListener('submit',event => {
    event.preventDefault();
    if (sending || reviewDialog.open) return;
    if (!form.reportValidity()) return;
    showReview(serialize());
  });
  async function sendPeople(people) {
    if (sending) return;
    sending = true;
    form.querySelectorAll('.is-error').forEach(el => { el.classList.remove('is-error'); el.removeAttribute('aria-invalid'); });
    form.querySelectorAll('.is-saved').forEach(el => el.classList.remove('is-saved'));
    saved = false;
    stateNotice.textContent = '';
    stateNotice.classList.remove('is-confirmed');
    if (!config.appsScriptUrl) { sending = false; feedback('error','To wersja pokazowa. Organizatorzy muszą jeszcze podłączyć Arkusze Google.'); return; }
    const controls = Array.from(form.querySelectorAll('input,select,textarea,button'));
    const previousDisabled = controls.map(el => el.disabled);
    const originalText = submitButton.textContent;
    controls.forEach(el => el.disabled = true);
    submitButton.textContent = 'Zapisujemy wszystkie odpowiedzi…';
    try {
      const response = await fetch(config.appsScriptUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({version:4,people}),redirect:'follow',signal:AbortSignal.timeout(30000)});
      if (!response.ok) throw new Error('HTTP');
      const result = await response.json();
      if (result.version !== 4 || result.code === 'VERSION' || result.code === 'SETUP') {
        feedback('error','Formularz wymaga aktualizacji skryptu Google przez organizatorów. Nie mamy potwierdzenia zapisu tej grupy.'); return;
      }
      if (result.code === 'FIELDS') {
        const card = cards()[result.personIndex];
        if (card) (result.fields || []).forEach(name => {
          const el = field(card,name);
          if (el) { el.classList.add('is-error'); el.setAttribute('aria-invalid','true'); }
        });
        feedback('error',`Gość ${result.personIndex+1}: uzupełnij imię, nazwisko i obecność. Przy potwierdzonej obecności wybierz również menu i nocleg.`);
        return;
      }
      if (!result.ok || result.count !== people.length) throw new Error('Missing confirmation');
      form.querySelectorAll('.is-saved').forEach(el => el.classList.remove('is-saved'));
      controls.forEach((el,index) => {
        if (previousDisabled[index] || el.tagName === 'BUTTON') return;
        const filled = el.type === 'checkbox' ? el.checked : (el.value || '').trim() !== '';
        if (filled) el.classList.add('is-saved');
      });
      saved = true;
      stateNotice.textContent = 'Twoje odpowiedzi zostały nam przekazane. Dziękujemy.';
      stateNotice.classList.add('is-confirmed');
      const attendingCount = people.filter(person => person.attendance === 'yes').length;
      const anyoneAttending = attendingCount > 0;
      const message = anyoneAttending
        ? 'Wszystkie odpowiedzi są zapisane.'
        : 'Dziękujemy za przekazanie odpowiedzi. Bardzo nam przykro, że nie będziemy mogli świętować razem. Będzie nam Was brakowało. Przesyłamy dużo ciepła i mamy nadzieję, że wkrótce spotkamy się przy innej okazj.';
      feedback('success',message,anyoneAttending ? 'Do zobaczenia!' : 'Dziękujemy',anyoneAttending ? {total:result.count,attending:attendingCount} : null);
    } catch {
      feedback('error','Nie otrzymaliśmy potwierdzenia zapisu. Dane pozostają w formularzu. Spróbuj ponownie z tymi samymi danymi lub skontaktuj się z nami.');
    } finally {
      sending = false;
      controls.forEach((el,index) => el.disabled = previousDisabled[index]);
      submitButton.textContent = originalText;
      sync();
    }
  }
  addPerson(false);
  addPersonButton.disabled = false;
  submitButton.disabled = false;
})();
