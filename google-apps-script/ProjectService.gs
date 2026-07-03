/**
 * ======================================================================
 * PROJECT SERVICE
 * ----------------------------------------------------------------------
 * Mengelola tab-tab sheet sebagai representasi Project.
 * Setiap project diwakili oleh satu sheet (tab) tersendiri.
 * ======================================================================
 */

const IGNORED_SHEETS = ['Sheet1', 'Config', 'Template', 'USERS', 'PROJECTS', 'LOGS'];

const REQUIRED_HEADERS = [
  'Task ID', 'Task Name', 'Description', 'Task Goal',
  'Initialize Status', 'Generalization Direction', 'Task Type', 'Num',
  'Label', 'Pullable Num', 'Environment Type', 'Status',
  'Workflow', 'Video URL', 'QR Code URL', 'List Barang', 'Catatan',
  'Last Update', 'Client Note', 'Updated By'
];

function getAllProjectSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().filter(sh => IGNORED_SHEETS.indexOf(sh.getName()) === -1);
}

function getProjectNames() {
  const sheets = getAllProjectSheets();
  return sheets.map(sh => sh.getName());
}

function getProjectSheet(projectName, createIfMissing) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(projectName);
  if (!sheet && createIfMissing) {
    sheet = ss.insertSheet(projectName);
  }
  if (sheet) ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let hMap = {};

  REQUIRED_HEADERS.forEach(header => {
    let colIdx = currentHeaders.indexOf(header) + 1;
    if (colIdx === 0) {
      colIdx = currentHeaders.length + 1;
      sheet.getRange(1, colIdx).setValue(header);
      currentHeaders.push(header);
    }
    hMap[header] = colIdx;
  });

  // Format Last Update selalu teks agar tidak terkonversi otomatis ke format tanggal default Google Sheets
  const maxRows = Math.max(sheet.getMaxRows(), 100);
  if (hMap['Last Update']) {
    sheet.getRange(1, hMap['Last Update'], maxRows, 1).setNumberFormat('@');
  }

  return hMap;
}
