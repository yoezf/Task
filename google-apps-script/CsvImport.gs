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
    } else if (ch === '' || ch === '
') {
      if (quote) {
        cell += ch;
      } else {
        if (ch === '' && next === '
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
