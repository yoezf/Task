/**
 * ======================================================================
 * LOGS SERVICE
 * ----------------------------------------------------------------------
 * Mencatat semua aktivitas aksi user ke dalam sheet LOGS.
 * ======================================================================
 */

function getOrCreateLogsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('LOGS');
  if (!sheet) {
    sheet = ss.insertSheet('LOGS');
    sheet.appendRow(['Date', 'User', 'Action', 'Task ID']);
    // Format kolom Date sebagai text atau format khusus agar rapi
    sheet.getRange('A:A').setNumberFormat('@');
  }
  return sheet;
}

function logActivity(user, action, taskId) {
  try {
    const sheet = getOrCreateLogsSheet();
    const now = new Date();
    
    // Format: dd/Bulan/yyyy hh:mm
    const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const tgl = String(now.getDate()).padStart(2,'0');
    const bln = BULAN[now.getMonth()];
    const thn = now.getFullYear();
    const jam = String(now.getHours()).padStart(2,'0');
    const mnt = String(now.getMinutes()).padStart(2,'0');
    const formattedDate = `${tgl}/${bln}/${thn} ${jam}:${mnt}`;
    
    sheet.appendRow([formattedDate, user, action, String(taskId)]);
  } catch (err) {
    Logger.log('Gagal mencatat log: ' + err.message);
  }
}

function getLogs() {
  const sheet = getOrCreateLogsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  return values.map(row => {
    return { date: row[0], user: row[1], action: row[2], taskId: row[3] };
  }).reverse(); // Urutan terbaru di atas
}
