/**
 * ======================================================================
 * API.JS - BACKEND API WRAPPER
 * ----------------------------------------------------------------------
 * Mengelola semua komunikasi HTTP fetch ke Google Apps Script backend.
 * ======================================================================
 */

const Api = {
  async fetchAllTasks() {
    const res = await fetch(STATE.apiUrl);
    if (!res.ok) throw new Error('Respon server tidak ok');
    return await res.json();
  },

  async createTask(taskData) {
    const res = await fetch(STATE.apiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'create', task: taskData, user: STATE.username || 'system' })
    });
    return await res.json();
  },

  async updateTask(taskData) {
    const res = await fetch(STATE.apiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'update', task: taskData, user: STATE.username || 'system' })
    });
    return await res.json();
  },

  async deleteTask(taskId, projectName) {
    const res = await fetch(STATE.apiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', taskId: taskId, projectName: projectName, user: STATE.username || 'system' })
    });
    return await res.json();
  },

  async importCsv(csvString) {
    const res = await fetch(STATE.apiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'import-csv', csvData: csvString, user: STATE.username || 'admin' })
    });
    return await res.json();
  },

  async login(username, password) {
    const res = await fetch(STATE.apiUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', username: username, password: password })
    });
    return await res.json();
  }
};
