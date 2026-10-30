// Każde wysłanie dopisuje nowe wiersze. Bez listy gości, kodów i wykrywania duplikatów.
const RESPONSE_SHEET = 'Zgloszenia';
const ANSWER_HEADERS = ['Data wpisu (Europe/Warsaw)', 'Imię', 'Nazwisko', 'Obecność', 'Menu', 'Nocleg', 'Alergie', 'Uwagi'];
function setup() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('Otwórz Apps Script z menu Rozszerzenia w arkuszu.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', book.getId());
  const sheet = book.getSheetByName(RESPONSE_SHEET) || book.insertSheet(RESPONSE_SHEET);
  if (!sheet.getLastRow()) sheet.appendRow(ANSWER_HEADERS);
  sheet.setFrozenRows(1);
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
    if (data.version !== 4) return jsonResponse({ok:false,version:4,code:'VERSION'});
    // Sprawdzamy tylko wymagane odpowiedzi. Nie sprawdzamy listy gości ani powtórzeń.
    if (!Array.isArray(data.people) || !data.people.length) throw new Error('Missing rows');
    const menus = {classic:'Klasyczne',vegetarian:'Wegetariańskie',vegan:'Wegańskie',child:'Dziecięce'};
    const stays = {yes:'Tak',no:'Nie',unsure:'Jeszcze nie wiem'};
    for (let index = 0; index < data.people.length; index++) {
      const person = data.people[index] || {};
      const missing = [];
      ['firstName','lastName'].forEach(function(name) {
        if (typeof person[name] !== 'string' || !person[name].trim()) missing.push(name);
      });
      if (['yes','no'].indexOf(person.attendance) < 0) missing.push('attendance');
      if (person.attendance === 'yes') {
        if (!Object.prototype.hasOwnProperty.call(menus,person.menu)) missing.push('menu');
        if (!Object.prototype.hasOwnProperty.call(stays,person.stay)) missing.push('stay');
      }
      if (missing.length) return jsonResponse({ok:false,version:4,code:'FIELDS',personIndex:index,fields:missing});
    }
    const translated = function(map,value) { return Object.prototype.hasOwnProperty.call(map,value) ? map[value] : value; };
    const timestamp = Utilities.formatDate(new Date(),'Europe/Warsaw','yyyy-MM-dd HH:mm:ss');
    const rows = data.people.map(function(person) {
      person = person || {};
      return [timestamp,safeCell(person.firstName),safeCell(person.lastName),safeCell(translated({yes:'Tak',no:'Nie'},person.attendance)),safeCell(translated(menus,person.menu)),safeCell(translated(stays,person.stay)),safeCell(person.allergies),safeCell(person.notes)];
    });
    lock.waitLock(20000);
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) return jsonResponse({ok:false,version:4,code:'SETUP'});
    const book = SpreadsheetApp.openById(id);
    const sheet = book.getSheetByName(RESPONSE_SHEET);
    if (!sheet) return jsonResponse({ok:false,version:4,code:'SETUP'});
    sheet.getRange(sheet.getLastRow()+1,1,rows.length,ANSWER_HEADERS.length).setValues(rows);
    SpreadsheetApp.flush();
    return jsonResponse({ok:true,version:4,count:rows.length});
  } catch (error) {
    return jsonResponse({ok:false,version:4,code:'SAVE'});
  } finally { if (lock.hasLock()) lock.releaseLock(); }
}
function jsonResponse(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
