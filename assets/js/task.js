/**
 * ======================================================================
 * TASK.JS - TASK CRUD OPERATIONS
 * ----------------------------------------------------------------------
 * Mengelola logic simpan task (create/update), hapus task, update
 * status workflow, request sample, dan render spesifikasi detail.
 * ======================================================================
 */

const Task = {
  // Simpan data task baru atau update task yang ada
  async save() {
    const oldId = document.getElementById('editTaskId').value;
    const nId = document.getElementById('form_taskId').value.trim();
    if (!nId) {
      alert('Task ID wajib diisi!');
      return;
    }

    let projectVal = Utils.v('form_project');
    if (projectVal === '__new__') {
      projectVal = document.getElementById('form_projectNew').value.trim();
      if (!projectVal) {
        alert('Nama project baru wajib diisi!');
        return;
      }
    }

    const d = {
      'Task ID': nId,
      'Project Name': projectVal,
      'Task Name': Utils.v('form_taskName'),
      'Description': Utils.v('form_desc'),
      'Task Goal': Utils.v('form_goal'),
      'Initialize Status': Utils.v('form_initStatus'),
      'Generalization Direction': Utils.v('form_genDir'),
      'Task Type': Utils.v('form_type'),
      'Num': Utils.v('form_num'),
      'Label': Utils.v('form_label'),
      'Pullable Num': Utils.v('form_pull'),
      'Environment Type': Utils.v('form_env'),
      'Status': Utils.v('form_status'),
      'Workflow': Utils.v('form_wf'),
      'Video URL': Utils.v('form_video'),
      'QR Code URL': Utils.v('form_qr'),
      'List Barang': Utils.v('form_barang'),
      'Catatan': Utils.v('form_catatan'),
      'Client Note': Utils.v('form_clientNote'),
      'Updated By': `by: ${Utils.actorLabel()}`,
      'Last Update': Utils.getWaktu()
    };

    // OPTIMISTIC UPDATE: Terapkan ke state lokal terlebih dahulu
    if (!oldId) {
      STATE.allTasks.unshift(d);
    } else {
      const idx = STATE.allTasks.findIndex(x => String(x['Task ID']) === String(oldId));
      if (idx > -1) STATE.allTasks[idx] = d;
    }

    if (!STATE.projects.includes(projectVal)) {
      STATE.projects.push(projectVal);
      Filter.setupProjectDropdown();
    }

    Modal.close('editModal');
    Filter.apply();
    Utils.persistLocal(STATE.allTasks);

    Utils.showToast('<i class="fa-solid fa-spinner fa-spin"></i>', 'Menyimpan...', 'bg-sky-500');

    try {
      const res = await Api.createTask(d); // Api handler menangani create/update berdasarkan body
      if (oldId) {
        await Api.updateTask(d);
      }
      Utils.showToast('<i class="fa-solid fa-check"></i>', 'Tersimpan!', 'bg-emerald-600');
      App.loadData(false); // Reload di latar belakang tanpa skeleton
    } catch (e) {
      Utils.showToast('<i class="fa-solid fa-triangle-exclamation"></i>', 'Gagal sinkron ke server', 'bg-orange-500');
    }
  },

  // Update status workflow instan dari tombol aksi (Optimistic)
  async updateWorkflow(id, nextWf) {
    const task = STATE.allTasks.find(x => String(x['Task ID']) === String(id));
    if (!task) return;

    if (!confirm(`Ubah workflow task #${id} menjadi "${Utils.wfLabel(nextWf)}"?`)) return;

    Modal.close('detailModal');
    
    // Simpan data lama untuk fallback jika error
    const oldWf = task['Workflow'];
    const oldBy = task['Updated By'];
    const oldTime = task['Last Update'];

    // Update lokal langsung
    task['Workflow'] = nextWf;
    task['Updated By'] = `by: ${Utils.actorLabel()}`;
    task['Last Update'] = Utils.getWaktu();

    Filter.apply();
    Utils.persistLocal(STATE.allTasks);
    Utils.showToast('<i class="fa-solid fa-spinner fa-spin"></i>', 'Mengupdate workflow...', 'bg-sky-500');

    try {
      const res = await Api.updateTask(task);
      if (res.success) {
        Utils.showToast('<i class="fa-solid fa-check"></i>', 'Status berhasil diupdate', 'bg-emerald-600');
        App.loadData(false);
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      // Fallback
      task['Workflow'] = oldWf;
      task['Updated By'] = oldBy;
      task['Last Update'] = oldTime;
      Filter.apply();
      Utils.persistLocal(STATE.allTasks);
      Utils.showToast('<i class="fa-solid fa-triangle-exclamation"></i>', 'Gagal update status server', 'bg-red-500');
    }
  },

  // Hapus task (Hanya Admin)
  async delete(id, projectName) {
    if (!confirm(`Apakah Anda yakin ingin menghapus Task #${id}?`)) return;

    Modal.close('detailModal');
    const oldTasks = [...STATE.allTasks];
    
    // Hapus lokal
    STATE.allTasks = STATE.allTasks.filter(x => String(x['Task ID']) !== String(id));
    Filter.apply();
    Utils.persistLocal(STATE.allTasks);
    Utils.showToast('<i class="fa-solid fa-trash-can"></i>', 'Menghapus task...', 'bg-red-500');

    try {
      const res = await Api.deleteTask(id, projectName);
      if (res.success) {
        Utils.showToast('<i class="fa-solid fa-check"></i>', 'Task berhasil dihapus', 'bg-emerald-600');
        App.loadData(false);
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      STATE.allTasks = oldTasks;
      Filter.apply();
      Utils.persistLocal(STATE.allTasks);
      Utils.showToast('<i class="fa-solid fa-triangle-exclamation"></i>', 'Gagal menghapus di server', 'bg-red-500');
    }
  }
};
