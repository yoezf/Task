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
