/**
 * ======================================================================
 * AUTH SERVICE
 * ----------------------------------------------------------------------
 * Mengelola otentikasi user dan pengelolaan role/akses dari sheet USERS.
 * ======================================================================
 */

function getOrCreateUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('USERS');
  if (!sheet) {
    sheet = ss.insertSheet('USERS');
    sheet.appendRow(['Username', 'Password', 'Role', 'FullName']);
    // Tambahkan user default
    sheet.appendRow(['admin', 'admin123', 'admin', 'Super Admin']);
    sheet.appendRow(['qc1', '123', 'qc', 'QC Satu']);
    sheet.appendRow(['leader1', '123', 'leader', 'Leader Satu']);
    sheet.appendRow(['app1', '123', 'approved', 'Approver Satu']);
  }
  return sheet;
}

function loginUser(username, password) {
  const sheet = getOrCreateUsersSheet();
  const values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 4).getValues();
  
  for (let i = 0; i < values.length; i++) {
    const u = String(values[i][0]).trim();
    const p = String(values[i][1]).trim();
    const r = String(values[i][2]).trim();
    const n = String(values[i][3]).trim();
    
    if (u === username && p === password) {
      logActivity(username, 'LOGIN', '-');
      return { success: true, user: { username: u, role: r, name: n } };
    }
  }
  return { success: false, error: 'Username atau password salah' };
}

function getUsers() {
  const sheet = getOrCreateUsersSheet();
  const values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 4).getValues();
  return values.map(row => {
    return { username: row[0], role: row[2], name: row[3] };
  }).filter(u => u.username !== '');
}
