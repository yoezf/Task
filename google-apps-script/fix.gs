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

/**
 * ======================================================================
 * TASK MANAGEMENT PRODUKSI V2 - BACKEND (Code.gs)
 * ----------------------------------------------------------------------
 * Main router for Google Apps Script Web App API.
 * Handles doGet (GET requests) and doPost (POST requests).
 * ======================================================================
 */

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action;

    // Menangani CORS preflight secara implisit dengan JSON output yang tepat
    if (action === 'listProjects') {
      const projects = getProjectNames();
      return jsonOut({ success: true, projects: projects });
    }

    if (action === 'getLogs') {
      const logs = getLogs();
      return jsonOut({ success: true, data: logs });
    }

    if (action === 'getUsers') {
      const users = getUsers();
      return jsonOut({ success: true, data: users });
    }

    // Default: Ambil semua task atau berdasarkan project
    let allTasks = [];
    if (params.project && params.project !== 'all') {
      const sheet = getProjectSheet(params.project, false);
      if (sheet) {
        allTasks = readTasksFromSheet(sheet);
      }
    } else {
      getAllProjectSheets().forEach(sheet => {
        allTasks = allTasks.concat(readTasksFromSheet(sheet));
      });
    }

    // Urutkan task berdasarkan Last Update terbaru secara default
    allTasks.sort((a, b) => {
      return String(b['Last Update'] || '').localeCompare(String(a['Last Update'] || ''));
    });

    const projects = getProjectNames();

    return jsonOut({
      success: true,
      data: allTasks,
      projects: projects
    });

  } catch (err) {
    return jsonOut({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Payload kosong atau tidak valid');
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const task = body.task || {};
    const user = body.user || 'system';

    if (action === 'login') {
      const username = body.username;
      const password = body.password;
      if (!username || !password) {
        throw new Error('Username dan Password wajib diisi');
      }
      const loginResult = loginUser(username, password);
      return jsonOut(loginResult);
    }

    if (action === 'create') {
      const result = createTask(task);
      return jsonOut(result);
    }

    if (action === 'update') {
      const result = updateTask(task);
      return jsonOut(result);
    }

    if (action === 'delete') {
      const taskId = body.taskId;
      const projectName = body.projectName;
      if (!taskId) throw new Error('Task ID wajib diisi untuk menghapus');
      const result = deleteTask(taskId, projectName, user);
      return jsonOut(result);
    }

    if (action === 'createProject') {
      const projectName = String(body.projectName || '').trim();
      if (!projectName) throw new Error('Nama project wajib diisi');
      getProjectSheet(projectName, true);
      logActivity(user, 'CREATE_PROJECT', projectName);
      return jsonOut({ success: true, projects: getProjectNames() });
    }

    if (action === 'import-csv') {
      const csvString = body.csvData;
      const updatedBy = body.user || 'admin';
      const result = importCsvData(csvString, updatedBy);
      return jsonOut(result);
    }

    throw new Error('Action tidak dikenali: ' + action);

  } catch (err) {
    return jsonOut({ success: false, error: err.message });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ======================================================================
 * CSV IMPORT SERVICE
 * ----------------------------------------------------------------------
 * Mengelola import massal dari data CSV ke Spreadsheet.
 * Logika import:
 * - Jika Task ID sudah ada: UPDATE (selain field terkunci jika update biasa,
 *   namun untuk import CSV, jika user admin mengupload, kita bisa perbarui)
 * - Jika Task ID belum ada: INSERT
 * - Membaca data CSV dengan parsing aman untuk tanda kutip dan koma.
 * ======================================================================
 */

function importCsvData(csvString, updatedBy) {
  if (!csvString) throw new Error('Data CSV kosong');
  
  const rows = parseCSV(csvString);
  if (rows.length < 2) throw new Error('Format CSV tidak valid atau baris data kosong');
  
  const headers = rows[0].map(h => String(h).trim());
  const taskIdIdx = headers.indexOf('Task ID');
  const projectIdx = headers.indexOf('Project Name');
  
  if (taskIdIdx === -1) throw new Error('Kolom "Task ID" wajib ada di baris pertama CSV');
  if (projectIdx === -1) throw new Error('Kolom "Project Name" wajib ada di baris pertama CSV');
  
  let inserts = 0;
  let updates = 0;
  
  // Ambil waktu update sekarang
  const now = new Date();
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tgl = String(now.getDate()).padStart(2,'0');
  const bln = BULAN[now.getMonth()];
  const thn = now.getFullYear();
  const jam = String(now.getHours()).padStart(2,'0');
  const mnt = String(now.getMinutes()).padStart(2,'0');
  const lastUpdateStr = `${tgl}/${bln}/${thn} ${jam}:${mnt}`;
  
  // Mulai iterasi baris data (mulai indeks 1)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;
    
    // Bentuk objek task dari baris CSV
    const taskObj = {};
    headers.forEach((h, colIdx) => {
      taskObj[h] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
    });
    
    const taskId = taskObj['Task ID'];
    const projectName = taskObj['Project Name'];
    if (!taskId || !projectName) continue; // Skip jika ID atau project kosong
    
    // Set default status & workflow jika kosong
    if (!taskObj['Status']) taskObj['Status'] = 'Offline';
    if (!taskObj['Workflow']) taskObj['Workflow'] = 'Waiting Received';
    
    taskObj['Updated By'] = 'by: ' + (updatedBy || 'csv_import');
    taskObj['Last Update'] = lastUpdateStr;
    
    const loc = findTaskLocation(taskId);
    if (loc) {
      // UPDATE: perbarui baris yang ada di sheet tujuan
      const currentSheet = loc.sheet;
      const currentHMap = loc.hMap;
      
      // Jika project berubah, pindahkan tab sheet
      if (projectName !== currentSheet.getName()) {
        // Hapus dari sheet lama
        currentSheet.deleteRow(loc.sheetRow);
        
        // Buat di sheet baru
        const targetSheet = getProjectSheet(projectName, true);
        const targetHMap = ensureHeaders(targetSheet);
        const newRow = new Array(targetSheet.getLastColumn()).fill('');
        
        REQUIRED_HEADERS.forEach(h => {
          const col = targetHMap[h];
          if (col) {
            // Gabungkan header yang ada dari CSV, jika tidak ada gunakan default/kosong
            newRow[col - 1] = taskObj[h] !== undefined ? taskObj[h] : '';
          }
        });
        targetSheet.appendRow(newRow);
      } else {
        // Update biasa di sheet yang sama
        REQUIRED_HEADERS.forEach(h => {
          const col = currentHMap[h];
          if (col && taskObj[h] !== undefined) {
            currentSheet.getRange(loc.sheetRow, col).setValue(taskObj[h]);
          }
        });
      }
      updates++;
      logActivity(updatedBy || 'csv_import', 'IMPORT_UPDATE', taskId);
    } else {
      // INSERT: buat baru
      const targetSheet = getProjectSheet(projectName, true);
      const targetHMap = ensureHeaders(targetSheet);
      const newRow = new Array(targetSheet.getLastColumn()).fill('');
      
      REQUIRED_HEADERS.forEach(h => {
        const col = targetHMap[h];
        if (col && taskObj[h] !== undefined) {
          newRow[col - 1] = taskObj[h];
        }
      });
      targetSheet.appendRow(newRow);
      inserts++;
      logActivity(updatedBy || 'csv_import', 'IMPORT_INSERT', taskId);
    }
  }
  
  return { success: true, inserts: inserts, updates: updates };
}

/**
 * Parsing CSV dengan dukungan teks berkutip (RFC 4180)
 */
function parseCSV(str) {
  const arr = [];
  let quote = false;
  let col = [];
  let cell = '';
  
  for (let c = 0; c < str.length; c++) {
    const ch = str[c];
    const next = str[c+1];
    
    if (ch === '"') {
      if (quote && next === '"') {
        cell += '"';
        c++;
      } else {
        quote = !quote;
      }
    } else if (ch === ',') {
      if (quote) {
        cell += ',';
      } else {
        col.push(cell);
        cell = '';
      }
    } else if (ch === '
' || ch === '
') {
      if (quote) {
        cell += ch;
      } else {
        if (ch === '
' && next === '
') {
          c++;
        }
        col.push(cell);
        arr.push(col);
        col = [];
        cell = '';
      }
    } else {
      cell += ch;
    }
  }
  if (cell || col.length > 0) {
    col.push(cell);
    arr.push(col);
  }
  return arr;
}

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


/**
 * ======================================================================
 * TASK SERVICE
 * ----------------------------------------------------------------------
 * Mengelola operasi CRUD Task (Create, Read, Update, Delete).
 * Kolom yang bertindak sebagai ID unik adalah "Task ID".
 * ======================================================================
 */

const LOCKED_FIELDS_ON_UPDATE = [
  'Task Name', 'Description', 'Task Goal', 'Initialize Status',
  'Generalization Direction', 'Task Type', 'Num', 'Label',
  'Pullable Num', 'Environment Type'
];

function readTasksFromSheet(sheet) {
  const hMap = ensureHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const lastCol = sheet.getLastColumn();
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const projectName = sheet.getName();

  return values
    .map(row => {
      let obj = { 'Project Name': projectName };
      REQUIRED_HEADERS.forEach(h => {
        const col = hMap[h];
        obj[h] = col ? (row[col - 1] || '') : '';
      });
      return obj;
    })
    .filter(obj => String(obj['Task ID']).trim() !== ''); // Lewati baris kosong
}

function findTaskLocation(taskId, projectHint) {
  const sheets = getAllProjectSheets();
  const ordered = projectHint
    ? [].concat(sheets.filter(s => s.getName() === projectHint), sheets.filter(s => s.getName() !== projectHint))
    : sheets;

  for (const sheet of ordered) {
    const hMap = ensureHeaders(sheet);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    const ids = sheet.getRange(2, hMap['Task ID'], lastRow - 1, 1).getValues().flat().map(String);
    const rowIdx = ids.indexOf(String(taskId));
    if (rowIdx !== -1) return { sheet: sheet, hMap: hMap, sheetRow: rowIdx + 2 };
  }
  return null;
}

function createTask(task) {
  const projectName = String(task['Project Name'] || '').trim();
  if (!projectName) throw new Error('Project Name wajib diisi');
  
  const taskId = String(task['Task ID'] || '').trim();
  if (!taskId) throw new Error('Task ID wajib diisi');

  // Validasi duplicate Task ID
  const loc = findTaskLocation(taskId);
  if (loc) throw new Error('Task ID #' + taskId + ' sudah ada di project ' + loc.sheet.getName());

  const sheet = getProjectSheet(projectName, true);
  const hMap = ensureHeaders(sheet);
  const newRow = new Array(sheet.getLastColumn()).fill('');
  REQUIRED_HEADERS.forEach(h => {
    const col = hMap[h];
    if (col && task[h] !== undefined) newRow[col - 1] = task[h];
  });
  
  sheet.appendRow(newRow);
  
  // Catat Log Aktivitas
  logActivity(task['Updated By'] || 'system', 'CREATE_TASK', taskId);
  
  return { success: true, message: 'Created', task: task };
}

function updateTask(task) {
  const taskId = String(task['Task ID'] || '').trim();
  if (!taskId) throw new Error('Task ID wajib diisi untuk update');

  const loc = findTaskLocation(taskId, task['Project Name']);
  if (!loc) throw new Error('Task #' + taskId + ' tidak ditemukan');

  const targetProject = String(task['Project Name'] || '').trim();
  const currentProject = loc.sheet.getName();

  if (targetProject && targetProject !== currentProject) {
    // Project dipindah -> pindahkan baris ke sheet project baru
    const oldRowValues = loc.sheet.getRange(loc.sheetRow, 1, 1, loc.sheet.getLastColumn()).getValues()[0];
    const oldObj = {};
    REQUIRED_HEADERS.forEach(h => {
      const c = loc.hMap[h];
      oldObj[h] = c ? oldRowValues[c - 1] : '';
    });
    
    // Merge data baru (selain field yang terkunci)
    REQUIRED_HEADERS.forEach(h => {
      if (LOCKED_FIELDS_ON_UPDATE.indexOf(h) === -1 && task[h] !== undefined) {
        oldObj[h] = task[h];
      }
    });

    // Masukkan ke sheet baru
    const newSheet = getProjectSheet(targetProject, true);
    const newHMap = ensureHeaders(newSheet);
    const newRow = new Array(newSheet.getLastColumn()).fill('');
    REQUIRED_HEADERS.forEach(h => {
      const col = newHMap[h];
      if (col) newRow[col - 1] = oldObj[h];
    });
    newSheet.appendRow(newRow);

    // Hapus dari sheet lama
    loc.sheet.deleteRow(loc.sheetRow);
  } else {
    // Update biasa, tetap di sheet yang sama
    REQUIRED_HEADERS.forEach(h => {
      if (LOCKED_FIELDS_ON_UPDATE.indexOf(h) !== -1) return; // field terkunci diabaikan
      const col = loc.hMap[h];
      if (col && task[h] !== undefined) {
        loc.sheet.getRange(loc.sheetRow, col).setValue(task[h]);
      }
    });
  }

  // Catat Log Aktivitas
  logActivity(task['Updated By'] || 'system', 'UPDATE_TASK', taskId);

  return { success: true, message: 'Updated', task: task };
}

function deleteTask(taskId, projectName, updatedBy) {
  const loc = findTaskLocation(taskId, projectName);
  if (!loc) throw new Error('Task tidak ditemukan');
  
  loc.sheet.deleteRow(loc.sheetRow);
  
  // Catat Log Aktivitas
  logActivity(updatedBy || 'system', 'DELETE_TASK', taskId);

  return { success: true, message: 'Deleted' };
}

{
  "timeZone": "Asia/Jakarta",
  "dependencies": {
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}