/**
 * ======================================================================
 * AUTH.JS - AUTHENTICATION MANAGER
 * ----------------------------------------------------------------------
 * Mengelola login, logout, session, dan role-based access.
 * ======================================================================
 */

const Auth = {
  // Login: validasi ke server GAS, simpan session di localStorage
  async login(username, password) {
    if (!username || !password) {
      Utils.showToast('<i class="fa-solid fa-xmark"></i>', 'Username & Password wajib diisi', 'bg-red-500');
      return;
    }
    Utils.showToast('<i class="fa-solid fa-spinner fa-spin"></i>', 'Memverifikasi...', 'bg-sky-600');
    try {
      const result = await Api.login(username, password);
      if (result.success && result.user) {
        this._applySession(result.user.username, result.user.role, result.user.name);
        Utils.showToast('<i class="fa-solid fa-check-circle"></i>', `Halo, ${result.user.name}!`, 'bg-emerald-600');
        Modal.close('loginModal');
        this.updateRoleUI();
        App.renderGrid();
      } else {
        Utils.showToast('<i class="fa-solid fa-xmark"></i>', result.error || 'Login gagal!', 'bg-red-500');
      }
    } catch (e) {
      Utils.showToast('<i class="fa-solid fa-triangle-exclamation"></i>', 'Gagal konek server', 'bg-orange-500');
    }
  },

  logout() {
    STATE.role = 'public';
    STATE.userName = 'Guest';
    STATE.username = '';
    try { localStorage.removeItem('authSession'); } catch(e) {}
    document.getElementById('loginBtn').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    this.updateRoleUI();
    App.renderGrid();
    Utils.showToast('<i class="fa-solid fa-right-from-bracket"></i>', 'Berhasil logout', 'bg-slate-700');
  },

  _applySession(username, role, name) {
    STATE.role = role;
    STATE.userName = name;
    STATE.username = username;
    try { localStorage.setItem('authSession', JSON.stringify({ username, role, name })); } catch(e) {}
    document.getElementById('loginBtn').classList.add('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    const ui = document.getElementById('userInfo');
    const roleIcon = { admin: 'fa-crown', qc: 'fa-pen', leader: 'fa-users', approved: 'fa-stamp' }[role] || 'fa-user';
    ui.innerHTML = `<i class="fa-solid ${roleIcon}"></i> ${name}`;
    ui.classList.remove('hidden');
  },

  restoreSession() {
    try {
      const s = localStorage.getItem('authSession');
      if (s) {
        const { username, role, name } = JSON.parse(s);
        this._applySession(username, role, name);
      }
    } catch(e) {}
  },

  updateRoleUI() {
    const addBtn = document.getElementById('addTaskBtn');
    const csvBtn = document.getElementById('csvImportBtn');
    const logsBtn = document.getElementById('logsBtn');

    const canAdd = ['admin','qc'].includes(STATE.role);
    const canCsv = STATE.role === 'admin';
    const canLogs = STATE.role === 'admin';

    addBtn?.classList.toggle('hidden', !canAdd);
    addBtn?.classList.toggle('flex', canAdd);
    csvBtn?.classList.toggle('hidden', !canCsv);
    logsBtn?.classList.toggle('hidden', !canLogs);
  }
};
