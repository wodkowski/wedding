// Wklej do Apps Script otwartego z docelowego Arkusza Google.
// Uruchom setup() raz w edytorze przed wdrożeniem aplikacji internetowej.
function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Otwórz Apps Script z menu Rozszerzenia w arkuszu.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  let sheet = spreadsheet.getSheetByName('Odpowiedzi');
  if (!sheet) sheet = spreadsheet.insertSheet('Odpowiedzi');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID odpowiedzi', 'Data zapisu', 'Imię', 'Nazwisko', 'Obecność', 'Menu', 'Nocleg', 'Alergie', 'Uwagi']);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#742c3d').setFontColor('#ffffff');
    sheet.autoResizeColumns(1, 9);
  }
  // Osobna tabela v2: nie zmieniamy struktury wcześniejszych odpowiedzi.
  const tables = {
    Zaproszenia: ['ID zaproszenia', 'Kod (prywatny)', 'Aktywne (TAK/NIE)', 'Prywatny link dla gości'],
    Goscie: ['ID zaproszenia', 'Imię', 'Nazwisko', 'ID gościa (automatyczne)'],
    OdpowiedziV2: ['ID gościa', 'Data aktualizacji', 'Imię', 'Nazwisko', 'Obecność', 'Menu', 'Nocleg', 'Alergie', 'Uwagi', 'ID zaproszenia', 'ID wysyłki']
  };
  Object.keys(tables).forEach(function(name) {
    const tab = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
    if (!tab.getLastRow()) { tab.appendRow(tables[name]); tab.setFrozenRows(1); }
  });
}

// Uruchamiaj tylko z edytora Apps Script. Nie jest dostępne przez HTTP.
// Wypełnij najpierw w zakładce Goscie kolumny A–C, jeden gość na wiersz.
function generateInvitationCodes() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const book = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    const invitations = book.getSheetByName('Zaproszenia');
    const guests = book.getSheetByName('Goscie');
    const known = invitations.getDataRange().getDisplayValues().slice(1).map(function(row) { return row[0]; });
    const usedCodes = invitations.getDataRange().getDisplayValues().slice(1).map(function(row) { return row[1].trim().toLowerCase(); });
    const rows = guests.getDataRange().getDisplayValues().slice(1);
    rows.forEach(function(row, index) {
      const invitationId = row[0].trim();
      if (!invitationId || !row[1].trim() || !row[2].trim()) return;
      if (known.indexOf(invitationId) < 0) {
        const code = createInvitationCode(usedCodes);
        invitations.appendRow([safeCell(invitationId), code, 'TAK']);
        usedCodes.push(code.toLowerCase());
        known.push(invitationId);
      }
      if (!row[3]) guests.getRange(index + 2, 4).setValue(Utilities.getUuid());
    });
    invitations.getRange(1, 4).setValue('Prywatny link dla gości');
    invitations.getDataRange().getDisplayValues().slice(1).forEach(function(row, index) {
      const code = row[1].trim().toUpperCase();
      const active = row[2].trim().toUpperCase() === 'TAK';
      invitations.getRange(index + 2, 4).setValue(active && /^[2-9A-HJ-NP-Z]{8}$/.test(code)
        ? 'https://wodkowski.github.io/wedding/#zaproszenie=' + encodeURIComponent(code) : '');
    });
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
}

function createInvitationCode(usedCodes) {
  // 40 losowych bitów = 8 znaków. Bez mylących 0, 1, I i O.
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 20; attempt++) {
    let random = parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 10), 16);
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += alphabet[random % 32];
      random = Math.floor(random / 32);
    }
    if (usedCodes.indexOf(code.toLowerCase()) < 0) return code;
  }
  throw new Error('Nie udało się wygenerować unikalnego kodu. Spróbuj ponownie.');
}

function safeCell(value) {
  return /^[=+@\-\t\r\n]/.test(value) ? "'" + value : value;
}

function normalizeName(value) {
  return String(value).trim().normalize('NFC').toLocaleLowerCase('pl-PL').replace(/\s+/g, ' ');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || e.postData.contents.length > 12000) throw new Error('Invalid payload');
    const data = JSON.parse(e.postData.contents);
    if (data.website) throw new Error('Invalid submission');
    const text = function(value, limit, required) {
      if (value == null && !required) return '';
      if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) throw new Error('Invalid field');
      return value.trim();
    };
    const requestId = text(data.requestId, 36, true);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error('Invalid ID');
    const firstName = text(data.firstName, 80, true);
    const lastName = text(data.lastName, 100, true);
    if (['yes', 'no'].indexOf(data.attendance) < 0) throw new Error('Invalid attendance');
    const attending = data.attendance === 'yes';
    const menus = { classic: 'Klasyczne', vegetarian: 'Wegetariańskie', vegan: 'Wegańskie', child: 'Dziecięce' };
    const stays = { yes: 'Tak', no: 'Nie', unsure: 'Jeszcze nie wiem' };
    if (attending && (!Object.prototype.hasOwnProperty.call(menus, data.menu) || !Object.prototype.hasOwnProperty.call(stays, data.stay))) throw new Error('Invalid choice');
    const allergies = attending ? text(data.allergies, 500, false) : '';
    const notes = text(data.notes, 1000, false);
    if (data.hasCompanion != null && ['yes', 'no'].indexOf(data.hasCompanion) < 0) throw new Error('Invalid companion count');
    const hasCompanion = attending && data.hasCompanion === 'yes';
    let companion = ['', '', '', '', ''];
    if (hasCompanion) {
      const companionFirstName = text(data.companionFirstName, 80, true);
      const companionLastName = text(data.companionLastName, 100, true);
      if (!Object.prototype.hasOwnProperty.call(menus, data.companionMenu) || !Object.prototype.hasOwnProperty.call(stays, data.companionStay)) throw new Error('Invalid companion choice');
      companion = [safeCell(companionFirstName), safeCell(companionLastName), menus[data.companionMenu], stays[data.companionStay], safeCell(text(data.companionAllergies, 500, false))];
    }
    lock.waitLock(20000);
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) throw new Error('Run setup first');
    const book = SpreadsheetApp.openById(id);
    const guestSheet = book.getSheetByName('Goscie');
    const guests = guestSheet.getDataRange().getDisplayValues().slice(1).map(function(row, index) {
      return { row: row, sheetRow: index + 2 };
    }).filter(function(entry) {
      return normalizeName(entry.row[1]) === normalizeName(firstName) && normalizeName(entry.row[2]) === normalizeName(lastName);
    });
    // Brak dopasowania i identyczne dane wielu osób są odrzucane.
    if (guests.length !== 1) return jsonResponse({ ok: false, code: 'GUEST' });
    const guest = guests[0].row;
    const invitationId = guest[0];
    if (!guest[3]) {
      guest[3] = Utilities.getUuid();
      guestSheet.getRange(guests[0].sheetRow, 4).setValue(guest[3]);
    }
    const sheet = book.getSheetByName('OdpowiedziV2');
    if (!sheet) throw new Error('Missing sheet');
    if (sheet.getLastRow() > 1) {
      const records = sheet.getDataRange().getDisplayValues();
      const previous = records.findIndex(function(row, index) { return index > 0 && row[0] === guest[3]; });
      if (previous > 0 && records[previous][10] === requestId) return jsonResponse({ ok: true, requestId: requestId });
    }
    const extraHeaders = ['Osoba towarzysząca', 'Imię osoby towarzyszącej', 'Nazwisko osoby towarzyszącej', 'Menu osoby towarzyszącej', 'Nocleg osoby towarzyszącej', 'Alergie osoby towarzyszącej'];
    sheet.getRange(1, 12, 1, extraHeaders.length).setValues([extraHeaders]);
    // Jeden wiersz głównego gościa: ponowny zapis zastępuje także dane towarzyszące.
    const row = [guest[3], new Date(), safeCell(guest[1]), safeCell(guest[2]), attending ? 'Tak' : 'Nie', attending ? menus[data.menu] : '', attending ? stays[data.stay] : '', safeCell(allergies), safeCell(notes), safeCell(invitationId), requestId, hasCompanion ? 'Tak' : 'Nie'].concat(companion);
    const records = sheet.getDataRange().getDisplayValues();
    const existingIndex = records.findIndex(function(record, index) { return index > 0 && record[0] === guest[3]; });
    if (existingIndex > 0) sheet.getRange(existingIndex + 1, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
    SpreadsheetApp.flush();
    return jsonResponse({ ok: true, requestId: requestId });
  } catch (error) {
    return jsonResponse({ ok: false, message: 'Nie udało się zapisać odpowiedzi.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
