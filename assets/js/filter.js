/**
 * ======================================================================
 * FILTER.JS - SEARCH, FILTER, AND SORTING MANAGEMENT
 * ----------------------------------------------------------------------
 * Mengelola logika filtering client-side (realtime), populate dropdown,
 * pengurutan (sorting), reset filter, dan pagination.
 * ======================================================================
 */

const Filter = {
  // Mengisi dropdown filter project di dashboard
  setupProjectDropdown() {
    const sel = document.getElementById('filterProject');
    if (!sel) return;
    const fromTasks = STATE.allTasks.map(t => t['Project Name']).filter(Boolean);
    const projs = [...new Set([...(STATE.projects || []), ...fromTasks])];
    sel.innerHTML = '<option value="all">Semua Project</option>' + 
                    projs.map(p => `<option value="${p}">${p}</option>`).join('');
    
    // Set nilai sesuai state saat ini jika ada
    if (STATE.project) sel.value = STATE.project;
  },

  // Mengisi dropdown pilihan project pada form modal
  populateFormProjectSelect(selected) {
    const sel = document.getElementById('form_project');
    if (!sel) return;
    const fromTasks = STATE.allTasks.map(t => t['Project Name']).filter(Boolean);
    const projs = [...new Set([...(STATE.projects || []), ...fromTasks])];
    let html = projs.map(p => `<option value="${p}">${p}</option>`).join('');
    html += `<option value="__new__">+ Buat Project Baru</option>`;
    sel.innerHTML = html;
    
    if (selected && projs.includes(selected)) {
      sel.value = selected;
    } else if (selected) {
      sel.insertAdjacentHTML('afterbegin', `<option value="${selected}">${selected}</option>`);
      sel.value = selected;
    }
    this.toggleNewProjectInput();
  },

  toggleNewProjectInput() {
    const sel = document.getElementById('form_project');
    const inp = document.getElementById('form_projectNew');
    if (!sel || !inp) return;
    if (sel.value === '__new__') {
      inp.classList.remove('hidden');
      inp.focus();
    } else {
      inp.classList.add('hidden');
      inp.value = '';
    }
  },

  // Menerapkan pencarian, filter, sorting, dan update statistik realtime
  apply() {
    let ts = [...STATE.allTasks];

    // 1. SEARCH: ID, Nama, Project
    if (STATE.search) {
      const q = STATE.search;
      ts = ts.filter(t => 
        String(t['Task ID'] || '').toLowerCase().includes(q) ||
        String(t['Task Name'] || '').toLowerCase().includes(q) ||
        String(t['Project Name'] || '').toLowerCase().includes(q) ||
        String(t['Description'] || '').toLowerCase().includes(q)
      );
    }

    // 2. FILTER
    if (STATE.project) {
      ts = ts.filter(t => t['Project Name'] === STATE.project);
    }
    if (STATE.status) {
      ts = ts.filter(t => t['Status'] === STATE.status);
    }
    if (STATE.workflow) {
      ts = ts.filter(t => t['Workflow'] === STATE.workflow);
    }

    // 3. SORTING
    ts.sort((a, b) => {
      if (STATE.sort === 'id_desc') {
        return (parseInt(b['Task ID']) || 0) - (parseInt(a['Task ID']) || 0);
      }
      if (STATE.sort === 'id_asc') {
        return (parseInt(a['Task ID']) || 0) - (parseInt(b['Task ID']) || 0);
      }
      // default: update_desc (terbaru diupdate)
      return String(b['Last Update'] || '').localeCompare(String(a['Last Update'] || ''));
    });

    STATE.filteredTasks = ts;

    // Update Statistik realtime di bagian bottom bar
    this.updateStats(ts);

    // Render grid task
    App.renderGrid();
  },

  updateStats(ts) {
    const totalEl = document.getElementById('statTotal');
    const onlineEl = document.getElementById('statOnline');
    const holdEl = document.getElementById('statHold');
    const sampleEl = document.getElementById('statSample');
    const readyEl = document.getElementById('statReady');

    if (totalEl) totalEl.innerText = ts.length;
    if (onlineEl) onlineEl.innerText = ts.filter(t => t['Status'] === 'Online').length;
    if (holdEl) holdEl.innerText = ts.filter(t => t['Status'] === 'Hold').length;
    if (sampleEl) sampleEl.innerText = ts.filter(t => t['Workflow'] === 'Sample Video').length;
    if (readyEl) readyEl.innerText = ts.filter(t => t['Workflow'] === 'Ready').length;
  },

  // Reset Filter
  reset() {
    STATE.search = '';
    STATE.project = '';
    STATE.status = '';
    STATE.workflow = '';
    STATE.sort = 'update_desc';
    STATE.page = 1;

    const sInput = document.getElementById('searchInput');
    const sClear = document.getElementById('searchClear');
    const fProj = document.getElementById('filterProject');
    const fStat = document.getElementById('filterStatus');
    const fWf = document.getElementById('filterWorkflow');
    const sSel = document.getElementById('sortSelect');

    if (sInput) sInput.value = '';
    if (sClear) sClear.classList.add('hidden');
    if (fProj) fProj.value = 'all';
    if (fStat) fStat.value = 'all';
    if (fWf) fWf.value = 'all';
    if (sSel) sSel.value = 'update_desc';

    this.apply();
    Utils.showToast('<i class="fa-solid fa-rotate-right"></i>', 'Filter berhasil direset', 'bg-slate-600');
  }
};
