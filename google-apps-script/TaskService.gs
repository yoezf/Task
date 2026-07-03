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
