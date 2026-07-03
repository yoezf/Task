/**
 * ======================================================================
 * APP.JS - MAIN APP CONTROLLER (ENTRY POINT)
 * ----------------------------------------------------------------------
 * Mengelola inisialisasi aplikasi, pengambilan data awal, rendering
 * grid task dengan pagination, skeleton loading, dan event listeners.
 * ======================================================================
 */

const App = {

  // Inisialisasi aplikasi
  init() {
    // Pasang event listener
    this._bindEvents();

    // Restore session login dari localStorage
    Auth.restoreSession();
    Auth.updateRoleUI();

    // Load data dengan stale-while-revalidate
    this.loadData(true);

    // Mulai realtime polling
    Realtime.start();
  },

  _bindEvents() {
    // Enter key di password field
    const passInput = document.getElementById('loginPassword');
    if (passInput) passInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        const u = document.getElementById('loginUsername').value.trim();
        const p = document.getElementById('loginPassword').value;
        Auth.login(u, p);
      }
    });

    // Search realtime
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        STATE.search = e.target.value.toLowerCase().trim();
        const clearBtn = document.getElementById('searchClear');
        if (clearBtn) clearBtn.classList.toggle('hidden', !STATE.search);
        STATE.page = 1;
        Filter.apply();
      });
    }

    // Filter dropdowns
    ['filterProject', 'filterStatus', 'filterWorkflow', 'sortSelect'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', e => {
        const v = e.target.value === 'all' ? '' : e.target.value;
        if (id === 'filterProject') STATE.project = v;
        else if (id === 'filterStatus') STATE.status = v;
        else if (id === 'filterWorkflow') STATE.workflow = v;
        else if (id === 'sortSelect') STATE.sort = e.target.value;
        STATE.page = 1;
        Filter.apply();
      });
    });

    // Pagination
    document.getElementById('prevPage')?.addEventListener('click', () => {
      if (STATE.page > 1) { STATE.page--; this.renderGrid(); }
    });
    document.getElementById('nextPage')?.addEventListener('click', () => {
      const total = Math.ceil(STATE.filteredTasks.length / STATE.perPage);
      if (STATE.page < total) { STATE.page++; this.renderGrid(); }
    });

    // CSV file input
    const csvInput = document.getElementById('csvFileInput');
    if (csvInput) csvInput.addEventListener('change', e => CsvImport.handleFile(e));
  },

  // Load data dari server (showSkeleton=true untuk tampil skeleton awal)
  async loadData(showSkeleton = false) {
    // Stale-while-revalidate: tampilkan cache dulu
    const cached = Utils.getCachedLocal();
    if (cached && cached.length > 0) {
      STATE.allTasks = cached;
      Filter.setupProjectDropdown();
      Filter.apply();
    } else if (showSkeleton) {
      this.showLoading(true);
    }

    try {
      const result = await Api.fetchAllTasks();
      if (result.success) {
        STATE.allTasks = result.data || [];
        STATE.projects = result.projects || [];
        Utils.persistLocal(STATE.allTasks);
        Filter.setupProjectDropdown();
        Filter.apply();
      } else {
        Utils.showToast('<i class="fa-solid fa-triangle-exclamation"></i>', 'Gagal memuat data', 'bg-orange-500');
      }
    } catch (e) {
      if (!STATE.allTasks.length) {
        Utils.showToast('<i class="fa-solid fa-triangle-exclamation"></i>', 'Gagal memuat data terbaru', 'bg-orange-500');
      }
    } finally {
      this.showLoading(false);
    }
  },

  // Toggle search popover
  toggleSearch() {
    const el = document.getElementById('searchPopover');
    if (!el) return;
    el.classList.toggle('hidden');
    if (!el.classList.contains('hidden')) {
      document.getElementById('searchInput')?.focus();
    }
  },

  clearSearch() {
    const inp = document.getElementById('searchInput');
    if (inp) inp.value = '';
    STATE.search = '';
    document.getElementById('searchClear')?.classList.add('hidden');
    STATE.page = 1;
    Filter.apply();
  },

  // Show/hide skeleton loading
  showLoading(show) {
    const grid = document.getElementById('taskGrid');
    const loadingGrid = document.getElementById('loadingGrid');
    if (!grid || !loadingGrid) return;

    if (show) {
      grid.classList.add('hidden');
      loadingGrid.classList.remove('hidden');
      loadingGrid.innerHTML = Array(10).fill(
        `<div class="bg-white rounded-xl p-3 border shadow-sm">
          <div class="skeleton h-5 w-1/3 rounded mb-2"></div>
          <div class="skeleton h-3 w-2/5 rounded mb-3"></div>
          <div class="skeleton h-6 w-full rounded mb-2"></div>
          <div class="skeleton h-3 w-3/4 rounded"></div>
        </div>`
      ).join('');
    } else {
      grid.classList.remove('hidden');
      loadingGrid.classList.add('hidden');
    }
  },

  // Render grid task (pagination)
  renderGrid() {
    this.showLoading(false);
    const grid = document.getElementById('taskGrid');
    const emptyState = document.getElementById('emptyState');
    const total = STATE.filteredTasks.length;

    if (total === 0) {
      if (grid) grid.innerHTML = '';
      emptyState?.classList.remove('hidden');
      emptyState?.classList.add('flex');
      document.getElementById('pageInfo').innerText = '0 / 0';
      document.getElementById('prevPage').disabled = true;
      document.getElementById('nextPage').disabled = true;
      return;
    }

    emptyState?.classList.add('hidden');
    emptyState?.classList.remove('flex');

    const start = (STATE.page - 1) * STATE.perPage;
    const paged = STATE.filteredTasks.slice(start, start + STATE.perPage);

    let html = '';
    paged.forEach(task => {
      const isPublic = STATE.role === 'public' && task['Workflow'] !== 'Ready';
      const needsSample = task['Workflow'] === 'Sample Video' && STATE.role === 'qc';
      const c1 = UI_COLORS[task['Status']] || UI_COLORS['Offline'];
      const c2 = UI_COLORS[task['Workflow']] || UI_COLORS['Waiting Received'];
      const tid = String(task['Task ID']).replace(/'/g, "\\'");
      const projectDisplay = (task['Project Name'] || '-');

      html += `<div class="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col p-3.5 relative ${isPublic ? 'opacity-60 bg-slate-50' : 'card-hover cursor-pointer shadow-sm'}" ${isPublic ? '' : `onclick="Modal.openDetail('${tid}')"`}>
        ${isPublic ? '<i class="fa-solid fa-lock absolute top-3 right-3 text-slate-300"></i>' : ''}
        ${needsSample ? '<span class="absolute top-3 right-3 flex items-center gap-1 text-[8px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full animate-pulse"><i class="fa-solid fa-bell"></i> Sample</span>' : ''}
        <div class="text-xl font-black text-slate-800 leading-none mb-1">#${task['Task ID']}</div>
        <div class="text-[8px] font-bold text-sky-600 uppercase tracking-wider mb-2 truncate">${projectDisplay}</div>
        <div class="text-[11px] font-semibold text-slate-600 mb-3 line-clamp-2 leading-snug">${task['Task Name'] || '-'}</div>
        <div class="flex gap-1 mb-2 mt-auto flex-wrap">
          <span class="text-[9px] font-bold px-2 py-0.5 rounded-md border ${c1.c}"><i class="fa-solid ${c1.i || ''}"></i> ${task['Status']}</span>
          <span class="text-[9px] font-bold px-2 py-0.5 rounded-md border ${c2.c || 'bg-slate-100 text-slate-600 border-slate-200'}">${Utils.wfLabel(task['Workflow'])}</span>
        </div>
        <div class="text-[8px] text-slate-400 mt-1 border-t border-slate-100 pt-2 flex justify-between items-center">
          <span>${(task['Last Update'] || '-').split(' ')[0] || '-'}</span>
          <span class="truncate max-w-[100px] font-semibold"><i class="fa-solid fa-user-pen"></i> ${task['Updated By'] || '-'}</span>
        </div>
      </div>`;
    });

    if (grid) grid.innerHTML = html;

    const totalPages = Math.ceil(total / STATE.perPage) || 1;
    document.getElementById('pageInfo').innerText = `${STATE.page} / ${totalPages}`;
    document.getElementById('prevPage').disabled = STATE.page === 1;
    document.getElementById('nextPage').disabled = STATE.page >= totalPages;
  }
};

// === GLOBAL FUNCTION BRIDGES FOR INLINE HTML ONCLICK ===
// (Dibutuhkan karena HTML file menggunakan onclick="..." langsung)
function toggleSearch() { App.toggleSearch(); }
function clearSearch() { App.clearSearch(); }
function resetFilter() { Filter.reset(); }
function openDetail(id) { Modal.openDetail(id); }
function openForm(id) { Modal.openForm(id); }
function openAddModal() { Modal.openAddForm(); }
function saveTask() { Task.save(); }
function processLogin() {
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value;
  Auth.login(u, p);
}
function logout() { Auth.logout(); }
function openModal(id) { Modal.open(id); }
function closeModal(id) { Modal.close(id); }
function openQRFullscreen() { Modal.openQRFullscreen(); }
function toggleNewProjectInput() { Filter.toggleNewProjectInput(); }
function triggerCsvImport() { CsvImport.triggerFileInput(); }

// Mulai aplikasi setelah halaman siap
window.addEventListener('DOMContentLoaded', () => App.init());
