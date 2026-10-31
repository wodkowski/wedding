// Każde wysłanie dopisuje nowe wiersze. Bez listy gości, kodów i wykrywania duplikatów.
const RESPONSE_SHEET = 'Zgloszenia';
const ANSWER_HEADERS = ['Data wpisu (Europe/Warsaw)', 'Imię', 'Nazwisko', 'Obecność', 'Menu', 'Nocleg', 'Alergie', 'Uwagi', 'ID zgłoszenia', 'E-mail', 'Telefon', 'Rodzaj pokoju'];
const PROTECTION = {windowMs:5*60*1000,maxForms:20,maxPeople:100,cooldownMs:30*60*1000};
const REVIEW_SHEET = 'Do sprawdzenia';
const REVIEW_HEADERS = ANSWER_HEADERS.concat(['Powód skierowania','Status weryfikacji']);
function setup() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('Otwórz Apps Script z menu Rozszerzenia w arkuszu.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', book.getId());
  const sheet = book.getSheetByName(RESPONSE_SHEET) || book.insertSheet(RESPONSE_SHEET);
  if (!sheet.getLastRow()) sheet.appendRow(ANSWER_HEADERS);
  else sheet.getRange(1,1,1,ANSWER_HEADERS.length).setValues([ANSWER_HEADERS]);
  sheet.setFrozenRows(1);
  ensureSheet_(book,REVIEW_SHEET,REVIEW_HEADERS);
  updateProtectionStatus_(book);
}
// Wpisany tekst ma pozostać tekstem, a nie wykonać się jako formuła arkusza.
function safeCell(value) {
  const text = value == null ? '' : String(value);
  return /^[=+@\-\t\r\n]/.test(text) ? "'" + text : text;
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.version !== 7) return jsonResponse({ok:false,version:7,code:'VERSION'});
    // Sprawdzamy tylko wymagane odpowiedzi. Nie sprawdzamy listy gości ani powtórzeń.
    if (!Array.isArray(data.people) || !data.people.length) throw new Error('Missing rows');
    if (data.people.length > 2) return jsonResponse({ok:false,version:7,code:'MAX_PEOPLE'});
    const menus = {classic:'Klasyczne',vegetarian:'Wegetariańskie',vegan:'Wegańskie',child:'Dziecięce'};
    const stays = {yes:'Tak',no:'Nie',unsure:'Jeszcze nie wiem'};
    for (let index = 0; index < data.people.length; index++) {
      const person = data.people[index] || {};
      const missing = [];
      ['firstName','lastName'].forEach(function(name) {
        if (typeof person[name] !== 'string' || !person[name].trim()) missing.push(name);
      });
      if (['yes','no'].indexOf(person.attendance) < 0) missing.push('attendance');
      const email = String(person.email || '').trim();
      const phone = String(person.phone || '').trim();
      if (!email && !phone) missing.push('email','phone');
      if (email && !/^[^\s@]+@[^\s@]+$/.test(email)) missing.push('email');
      const digits = phone.replace(/\D/g,'');
      if (phone && (!/^[+\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15)) missing.push('phone');
      if (person.attendance === 'yes') {
        if (!Object.prototype.hasOwnProperty.call(menus,person.menu)) missing.push('menu');
        if (!Object.prototype.hasOwnProperty.call(stays,person.stay)) missing.push('stay');
      }
      if (person.sharedRoom != null && typeof person.sharedRoom !== 'boolean') missing.push('sharedRoom');
      if (person.sharedRoom === true && (data.people.length !== 2 || !data.people.every(function(p) { return p.attendance === 'yes' && p.stay === 'yes' && p.sharedRoom === true; }))) missing.push('sharedRoom');
      if (missing.length) return jsonResponse({ok:false,version:7,code:'FIELDS',personIndex:index,fields:missing});
    }
    const translated = function(map,value) { return Object.prototype.hasOwnProperty.call(map,value) ? map[value] : value; };
    const timestamp = Utilities.formatDate(new Date(),'Europe/Warsaw','yyyy-MM-dd HH:mm:ss');
    const submissionId = Utilities.getUuid();
    const rows = data.people.map(function(person,index) {
      person = person || {};
      const room = person.attendance === 'yes' && person.stay === 'yes' ? person.sharedRoom ? 'Wspólny z Gościem '+(index === 0 ? 2 : 1) : 'Własny pokój' : '';
      return [timestamp,safeCell(person.firstName),safeCell(person.lastName),safeCell(translated({yes:'Tak',no:'Nie'},person.attendance)),safeCell(translated(menus,person.menu)),safeCell(translated(stays,person.stay)),safeCell(person.allergies),safeCell(person.notes),submissionId,safeCell(person.email),safeCell(person.phone),room];
    });
    lock.waitLock(20000);
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) return jsonResponse({ok:false,version:7,code:'SETUP'});
    const book = SpreadsheetApp.openById(id);
    if (!book.getSheetByName(RESPONSE_SHEET)) return jsonResponse({ok:false,version:7,code:'SETUP'});
    const route = routeSubmission_(rows.length,Date.now());
    const sheet = route.review ? ensureSheet_(book,REVIEW_SHEET,REVIEW_HEADERS) : book.getSheetByName(RESPONSE_SHEET);
    sheet.getRange(1,1,1,route.review ? REVIEW_HEADERS.length : ANSWER_HEADERS.length).setValues([route.review ? REVIEW_HEADERS : ANSWER_HEADERS]);
    const savedRows = route.review ? rows.map(function(row) { return row.concat([route.reason,'Oczekuje']); }) : rows;
    sheet.getRange(sheet.getLastRow()+1,1,savedRows.length,savedRows[0].length).setValues(savedRows);
    SpreadsheetApp.flush();
    // Błąd panelu stanu nie może zmienić udanego zapisu w komunikat porażki.
    try { updateProtectionStatus_(book); } catch (statusError) { console.warn('Nie udało się odświeżyć panelu ochrony.'); }
    return jsonResponse({ok:true,version:7,count:rows.length,submissionId:submissionId});
  } catch (error) {
    return jsonResponse({ok:false,version:7,code:'SAVE'});
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
function jsonResponse(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }

// ----- Ochrona ruchu: wszystkie wywołania routeSubmission_ odbywają się pod blokadą. -----
function ensureSheet_(book,name,headers) {
  const sheet = book.getSheetByName(name) || book.insertSheet(name);
  if (!sheet.getLastRow()) { sheet.appendRow(headers); sheet.setFrozenRows(1); }
  else if (name === REVIEW_SHEET) {
    // Zachowaj metadane starszych wersji kolejki po dodaniu nowych kolumn.
    [10,12].some(function(column) {
      if (sheet.getRange(1,column,1,1).getValue() !== 'Powód skierowania') return false;
      sheet.insertColumnsAfter(column-1,ANSWER_HEADERS.length-(column-1));
      sheet.getRange(1,1,1,headers.length).setValues([headers]);
      return true;
    });
  }
  return sheet;
}
function readTrafficState_() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('TRAFFIC_STATE');
    if (!raw) return {recent:[],until:0};
    const state = JSON.parse(raw);
    if (!Array.isArray(state.recent) || !Number.isFinite(state.until) || state.recent.some(function(item) { return !Array.isArray(item) || item.length !== 2 || !Number.isFinite(item[0]) || !Number.isFinite(item[1]) || item[1] < 1; })) throw new Error('Invalid state');
    return state;
  } catch (error) {
    // Przy uszkodzonym stanie zachowujemy dane w kolejce zamiast wpuszczać ruch.
    return {recent:[],until:Date.now()+PROTECTION.cooldownMs};
  }
}
function routeSubmission_(peopleCount,now) {
  const props = PropertiesService.getScriptProperties();
  const state = readTrafficState_();
  state.recent = state.recent.filter(function(item) { return item[0] > now-PROTECTION.windowMs; });
  state.recent.push([now,peopleCount]);
  // Wystarczy ostatnich maxForms+1 zdarzeń: więcej już samo przekracza próg.
  state.recent = state.recent.slice(-(PROTECTION.maxForms+1));
  const forms = state.recent.length;
  const people = state.recent.reduce(function(sum,item) { return sum+item[1]; },0);
  const burst = forms > PROTECTION.maxForms || people > PROTECTION.maxPeople;
  if (burst) state.until = Math.max(state.until,now+PROTECTION.cooldownMs);
  const manual = props.getProperty('REVIEW_MODE') === 'true';
  const review = manual || now < state.until;
  const reason = manual ? 'Ręczny tryb weryfikacji' : burst ? 'Nagły wzrost liczby zgłoszeń' : 'Trwa okres ochronny po wzroście ruchu';
  props.setProperty('TRAFFIC_STATE',JSON.stringify(state));
  return {review:review,reason:review ? reason : ''};
}
function updateProtectionStatus_(book) {
  const props = PropertiesService.getScriptProperties();
  const state = readTrafficState_();
  const manual = props.getProperty('REVIEW_MODE') === 'true';
  const protectedNow = manual || Date.now() < state.until;
  const format = function(value) { return value ? Utilities.formatDate(new Date(Number(value)),'Europe/Warsaw','yyyy-MM-dd HH:mm:ss') : '—'; };
  const folderId = props.getProperty('BACKUP_FOLDER_ID');
  const rows = [
    ['Ochrona formularza','Wartość'],
    ['Stan',protectedNow ? 'NOWE ZGŁOSZENIA TRAFIAJĄ DO SPRAWDZENIA' : 'Normalny zapis do Zgloszenia'],
    ['Tryb ręczny',manual ? 'Włączony' : 'Wyłączony'],
    ['Automatyczna ochrona co najmniej do',format(state.until)],
    ['Progi w 5 minut',PROTECTION.maxForms+' formularzy / '+PROTECTION.maxPeople+' osób'],
    ['Ostatnie odświeżenie panelu',format(Date.now())],
    ['Ostatnia udana kopia',format(props.getProperty('BACKUP_LAST_SUCCESS'))],
    ['Folder kopii',folderId ? 'https://drive.google.com/drive/folders/'+folderId : 'Kopie nie są jeszcze uruchomione'],
    ['Ostatni błąd kopii',props.getProperty('BACKUP_LAST_ERROR') || 'Brak'],
    ['Kopia arkusza',props.getProperty('BACKUP_LAST_URL') || '—'],
    ['Harmonogram','Raz dziennie, między 03:00 a 04:00 czasu polskiego po uruchomieniu installProtection'],
    ['Zgłoszenia do sprawdzenia','Otwórz zakładkę Do sprawdzenia; wybierz wiersze i użyj menu Ochrona formularza']
  ];
  const sheet = book.getSheetByName('Ochrona') || book.insertSheet('Ochrona');
  sheet.getRange(1,1,rows.length,2).setValues(rows);
  sheet.setFrozenRows(1);
}
function protectionBook_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Najpierw uruchom setup.');
  return SpreadsheetApp.openById(id);
}
function refreshProtectionStatus() { updateProtectionStatus_(protectionBook_()); }
function enableReviewMode() {
  PropertiesService.getScriptProperties().setProperty('REVIEW_MODE','true');
  refreshProtectionStatus();
}
function resumeNormalSubmissions() {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('REVIEW_MODE','false');
    props.setProperty('TRAFFIC_STATE',JSON.stringify({recent:[],until:0}));
    updateProtectionStatus_(protectionBook_());
  } finally { lock.releaseLock(); }
}

// ----- Kopie: uruchom installProtection ręcznie raz z konta właściciela. -----
function installProtection() {
  setup();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const props = PropertiesService.getScriptProperties();
    if (!props.getProperty('BACKUP_FOLDER_ID')) {
      const folder = DriveApp.createFolder('Wesele — kopie arkusza');
      props.setProperty('BACKUP_FOLDER_ID',folder.getId());
    }
    if (!ScriptApp.getProjectTriggers().some(function(trigger) { return trigger.getHandlerFunction() === 'dailyBackup'; })) {
      ScriptApp.newTrigger('dailyBackup').timeBased().atHour(3).everyDays(1).inTimezone('Europe/Warsaw').create();
    }
  } finally { lock.releaseLock(); }
  dailyBackup();
}
function createBackup_(oncePerDay) {
  const lock = LockService.getScriptLock();
  const props = PropertiesService.getScriptProperties();
  try {
    lock.waitLock(20000);
    const book = protectionBook_();
    const now = new Date();
    const day = Utilities.formatDate(now,'Europe/Warsaw','yyyy-MM-dd');
    if (oncePerDay && props.getProperty('BACKUP_LAST_DAY') === day) return;
    const folderId = props.getProperty('BACKUP_FOLDER_ID');
    if (!folderId) throw new Error('Najpierw uruchom installProtection, aby utworzyć folder kopii.');
    SpreadsheetApp.flush();
    const name = 'Wesele — kopia '+Utilities.formatDate(now,'Europe/Warsaw','yyyy-MM-dd HH-mm-ss');
    const copy = DriveApp.getFileById(book.getId()).makeCopy(name,DriveApp.getFolderById(folderId));
    props.setProperty('BACKUP_LAST_SUCCESS',String(now.getTime()));
    props.setProperty('BACKUP_LAST_DAY',day);
    props.setProperty('BACKUP_LAST_URL',copy.getUrl());
    props.setProperty('BACKUP_LAST_ERROR','');
    try { updateProtectionStatus_(book); } catch (error) { console.warn('Panel kopii nie został odświeżony.'); }
  } catch (error) {
    props.setProperty('BACKUP_LAST_ERROR',String(error.message || error));
    try { updateProtectionStatus_(protectionBook_()); } catch (ignored) {}
    throw error;
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
function dailyBackup() { createBackup_(true); }
function createBackupNow() { createBackup_(false); }

// Przenosi całe grupy wybrane w Do sprawdzenia. Niczego nie usuwa.
function approveSelectedSubmissions() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const selected = book.getActiveRange();
  if (!selected || selected.getSheet().getName() !== REVIEW_SHEET) throw new Error('Zaznacz wiersze w zakładce Do sprawdzenia.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const review = ensureSheet_(book,REVIEW_SHEET,REVIEW_HEADERS);
    const records = review.getDataRange().getValues();
    const selectedIds = new Set();
    for (let row = Math.max(2,selected.getRow()); row <= Math.min(records.length,selected.getLastRow()); row++) {
      if (records[row-1][8] && records[row-1][ANSWER_HEADERS.length+1] === 'Oczekuje') selectedIds.add(records[row-1][8]);
    }
    const main = book.getSheetByName(RESPONSE_SHEET);
    const existingIds = new Set(main.getDataRange().getValues().slice(1).map(function(row) { return row[8]; }));
    const pending = records.slice(1).filter(function(row) { return selectedIds.has(row[8]) && row[ANSWER_HEADERS.length+1] === 'Oczekuje' && !existingIds.has(row[8]); });
    if (pending.length) {
      const rows = pending.map(function(row) { return row.slice(0,ANSWER_HEADERS.length).map(safeCell); });
      main.getRange(1,1,1,ANSWER_HEADERS.length).setValues([ANSWER_HEADERS]);
      main.getRange(main.getLastRow()+1,1,rows.length,ANSWER_HEADERS.length).setValues(rows);
      SpreadsheetApp.flush();
    }
    records.slice(1).forEach(function(row,index) {
      if (selectedIds.has(row[8]) && row[ANSWER_HEADERS.length+1] === 'Oczekuje') review.getRange(index+2,ANSWER_HEADERS.length+2,1,1).setValues([['Zatwierdzone']]);
    });
    updateProtectionStatus_(book);
  } finally { lock.releaseLock(); }
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Ochrona formularza')
    .addItem('Odśwież stan ochrony','refreshProtectionStatus')
    .addItem('Zatwierdź wybrane zgłoszenia','approveSelectedSubmissions')
    .addSeparator().addItem('Włącz ręczną weryfikację','enableReviewMode')
    .addItem('Wznów normalny zapis','resumeNormalSubmissions')
    .addSeparator().addItem('Zrób kopię teraz','createBackupNow').addToUi();
}
