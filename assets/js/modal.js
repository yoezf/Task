/**
 * ======================================================================
 * MODAL.JS - MODAL & FORM MANAGEMENT
 * ----------------------------------------------------------------------
 * Mengelola tampilan modal detail task, form edit/buat task, dan semua
 * interaksi terkait modal (render spesifikasi, aksi per role, dll).
 * ======================================================================
 */

const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    }
  },

  close(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  },

  // Tampilkan modal detail task
  openDetail(taskId) {
    const task = STATE.allTasks.find(x => String(x['Task ID']) === String(taskId));
    if (!task) return;

    const c1 = UI_COLORS[task['Status']] || UI_COLORS['Offline'];
    const c2 = UI_COLORS[task['Workflow']] || UI_COLORS['Waiting Received'];

    // Header
    document.getElementById('modalTaskId').innerText = '#' + task['Task ID'];
    document.getElementById('modalProjectName').querySelector('span').innerText = task['Project Name'] || '-';

    // Update By
    document.getElementById('modalUpdatedBy').innerHTML = 
      `<i class="fa-solid fa-clock-rotate-left"></i> Diupdate oleh <b>${task['Updated By'] || 'Sistem'}</b> pada ${task['Last Update'] || '-'}`;

    // Notifikasi QC untuk sample
    const notif = document.getElementById('modalNotif');
    if (task['Workflow'] === 'Sample Video' && STATE.role === 'qc') {
      notif.innerHTML = '<i class="fa-solid fa-bell animate-pulse"></i>&nbsp; Leader meminta pembuatan sample untuk task ini';
      notif.classList.remove('hidden');
      notif.classList.add('flex');
    } else {
      notif.classList.add('hidden');
      notif.classList.remove('flex');
    }

    // Badges
    document.getElementById('modalBadges').innerHTML = 
      `<span class="badge ${c1.c}"><i class="fa-solid ${c1.i || 'fa-circle'}"></i> ${task['Status']}</span>
       <span class="badge ${c2.c || 'bg-slate-100 text-slate-600 border-slate-200'}">${Utils.wfLabel(task['Workflow'])}</span>`;

    // Video Preview
    document.getElementById('modalVideoThumb').innerHTML = Utils.getVideoEmbedHtml(task['Video URL']);

    // Notes
    document.getElementById('modalClientNote').innerText = task['Client Note'] || '-';
    document.getElementById('modalCatatan').innerText = task['Catatan'] || '-';

    // QR Code
    const qrImg = document.getElementById('modalQRImg');
    const qrEmpty = document.getElementById('modalQREmpty');
    const qrUrl = Utils.getImageDisplayUrl(task['QR Code URL']);
    if (qrUrl) {
      qrImg.src = qrUrl;
      qrImg.classList.remove('hidden');
      qrEmpty.classList.add('hidden');
    } else {
      qrImg.classList.add('hidden');
      qrEmpty.classList.remove('hidden');
    }

    // Spesifikasi metadata
    const specFields = [
      ['Task Name', task['Task Name']],
      ['Description', task['Description']],
      ['Task Goal', task['Task Goal']],
      ['Initialize Status', task['Initialize Status']],
      ['Generalization Direction', task['Generalization Direction']],
      ['Task Type', task['Task Type']],
      ['Num', task['Num']],
      ['Label', task['Label']],
      ['Pullable Num', task['Pullable Num']],
      ['Environment Type', task['Environment Type']],
      ['List Barang', task['List Barang']]
    ];
    document.getElementById('metaGrid').innerHTML = specFields
      .map(([l, v]) => `<div>
          <div class="text-[8px] uppercase font-bold text-slate-400">${l}</div>
          <div class="text-[11px] font-semibold text-slate-700 leading-tight break-all">${v || '-'}</div>
        </div>`)
      .join('');

    // Action buttons berdasarkan role
    document.getElementById('modalActions').innerHTML = this._buildActionButtons(task);

    this.open('detailModal');
  },

  _buildActionButtons(task) {
    const id = task['Task ID'];
    const role = STATE.role;
    let b = '';

    if (role === 'leader') {
      b = `<button onclick="Task.updateWorkflow('${id}','Sample Video')" class="text-[10px] font-bold text-white bg-sky-500 px-3 py-2 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-clapperboard"></i> Request Sample</button>
           <button onclick="Task.updateWorkflow('${id}','Revision')" class="text-[10px] font-bold text-white bg-red-500 px-3 py-2 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-rotate-left"></i> Revisi</button>`;

    } else if (role === 'qc') {
      b = `<button onclick="Modal.openForm('${id}')" class="text-[10px] font-bold text-white bg-amber-500 px-3 py-2 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-pen"></i> Edit</button>`;
      if (task['Workflow'] === 'Sample Video') {
        b += `<button onclick="Task.updateWorkflow('${id}','Sample Done')" class="text-[10px] font-bold text-white bg-teal-500 px-3 py-2 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-clapperboard"></i> Sample Selesai</button>`;
      }
      if (task['Workflow'] === 'Approved') {
        b += `<button onclick="Task.updateWorkflow('${id}','Ready')" class="text-[10px] font-bold text-white bg-emerald-500 px-3 py-2 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-flag-checkered"></i> Ready</button>`;
      }

    } else if (role === 'approved') {
      if (task['Workflow'] === 'Sample Done') {
        b = `<button onclick="Modal.openForm('${id}')" class="text-[10px] font-bold text-white bg-amber-500 px-3 py-2 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-pen"></i> Edit</button>
             <button onclick="Task.updateWorkflow('${id}','Approved')" class="text-[10px] font-bold text-white bg-blue-500 px-3 py-2 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-check"></i> Approve</button>
             <button onclick="Task.updateWorkflow('${id}','Revision')" class="text-[10px] font-bold text-white bg-red-500 px-3 py-2 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-rotate-left"></i> Revisi</button>`;
      } else {
        b = `<div class="text-[10px] text-slate-400 italic p-2"><i class="fa-solid fa-hourglass-half"></i> Menunggu status "Sample Selesai" dari QC untuk dapat mereview</div>`;
      }

    } else if (role === 'admin') {
      b = `<button onclick="Modal.openForm('${id}')" class="text-[10px] font-bold text-white bg-amber-500 px-3 py-2 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-pen"></i> Edit</button>
           <button onclick="Task.delete('${id}','${(task['Project Name']||'').replace(/'/g,"\\'")}') " class="text-[10px] font-bold text-white bg-red-600 px-3 py-2 rounded-lg flex items-center gap-1.5"><i class="fa-solid fa-trash-can"></i> Hapus</button>`;
    }
    return b;
  },

  // Tampilkan form untuk membuat atau mengedit task
  openForm(taskId) {
    const task = taskId ? STATE.allTasks.find(x => String(x['Task ID']) === String(taskId)) : null;

    // Validasi role Approver: hanya bisa edit saat Sample Done
    if (STATE.role === 'approved' && task && task['Workflow'] !== 'Sample Done') {
      Utils.showToast('<i class="fa-solid fa-lock"></i>', 'Hanya bisa edit saat status Sample Selesai', 'bg-red-500');
      return;
    }

    const isEdit = !!task;
    document.getElementById('editModalTitle').innerHTML = isEdit 
      ? '<i class="fa-solid fa-pen"></i> Edit Task' 
      : '<i class="fa-solid fa-plus"></i> Buat Task Baru';
    document.getElementById('editTaskId').value = taskId || '';
    
    // Populate field
    const fieldMap = {
      'form_taskId': 'Task ID',
      'form_taskName': 'Task Name',
      'form_desc': 'Description',
      'form_goal': 'Task Goal',
      'form_initStatus': 'Initialize Status',
      'form_genDir': 'Generalization Direction',
      'form_type': 'Task Type',
      'form_num': 'Num',
      'form_label': 'Label',
      'form_pull': 'Pullable Num',
      'form_env': 'Environment Type',
      'form_status': 'Status',
      'form_wf': 'Workflow',
      'form_video': 'Video URL',
      'form_qr': 'QR Code URL',
      'form_barang': 'List Barang',
      'form_catatan': 'Catatan',
      'form_clientNote': 'Client Note'
    };

    Object.entries(fieldMap).forEach(([elId, fieldKey]) => {
      const el = document.getElementById(elId);
      if (el) el.value = task ? (task[fieldKey] || '') : '';
    });

    if (!task) {
      const statusEl = document.getElementById('form_status');
      const wfEl = document.getElementById('form_wf');
      if (statusEl) statusEl.value = 'Offline';
      if (wfEl) wfEl.value = 'Waiting Received';
    }

    // Task ID tidak boleh diedit jika sudah ada task
    const taskIdEl = document.getElementById('form_taskId');
    if (taskIdEl) {
      taskIdEl.disabled = isEdit;
      taskIdEl.readOnly = isEdit;
    }

    // Lock field metadata jika edit (hanya bisa set saat create)
    const lockedIds = ['form_taskName','form_desc','form_goal','form_initStatus','form_genDir','form_type','form_num','form_label','form_pull','form_env'];
    lockedIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (isEdit) {
        el.readOnly = true;
        el.disabled = true;
        el.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
      } else {
        el.readOnly = false;
        el.disabled = false;
        el.classList.remove('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
      }
    });

    // Client Note: hanya boleh diedit oleh Approver
    const cnEl = document.getElementById('form_clientNote');
    const cnLock = document.getElementById('form_lockInfo');
    if (cnEl) {
      if (STATE.role === 'approved') {
        cnEl.readOnly = false;
        cnEl.classList.remove('bg-slate-100');
        if (cnLock) cnLock.innerHTML = '<i class="fa-solid fa-pen"></i> Bisa diisi';
      } else {
        cnEl.readOnly = true;
        cnEl.classList.add('bg-slate-100');
        if (cnLock) cnLock.innerHTML = '<i class="fa-solid fa-lock"></i> Only Approver';
      }
    }

    // Populate project select
    Filter.populateFormProjectSelect(task ? task['Project Name'] : (STATE.project || ''));

    if (taskId) this.close('detailModal');
    this.open('editModal');
  },

  openAddForm() {
    this.openForm(null);
  },

  openQRFullscreen() {
    const q = document.getElementById('modalQRImg');
    if (q && !q.classList.contains('hidden')) {
      if (q.requestFullscreen) q.requestFullscreen();
      else if (q.webkitRequestFullscreen) q.webkitRequestFullscreen();
    }
  }
};
