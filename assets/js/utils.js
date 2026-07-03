/**
 * ======================================================================
 * UTILS.JS - REUSABLE UTILITY FUNCTIONS
 * ----------------------------------------------------------------------
 * Helper functions untuk manipulasi DOM, format tanggal, parse URL video,
 * QR, toast, dll.
 * ======================================================================
 */

const Utils = {
  // Ambil waktu sekarang dengan format WIB (dd/Bulan/yyyy hh:mm)
  getWaktu() {
    const d = new Date();
    const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const tgl = String(d.getDate()).padStart(2, '0');
    const bln = BULAN[d.getMonth()];
    const thn = d.getFullYear();
    const jam = String(d.getHours()).padStart(2, '0');
    const mnt = String(d.getMinutes()).padStart(2, '0');
    return `${tgl}/${bln}/${thn} ${jam}:${mnt}`;
  },

  // Ekstrak ID Youtube dari berbagai jenis URL YouTube
  ytEmbedId(url) {
    if (!url) return null;
    const patterns = [
      /youtu\.be/([a-zA-Z0-9_-]{11})/,
      /youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com/embed/([a-zA-Z0-9_-]{11})/,
      /youtube\.com/shorts/([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  },

  // Ekstrak File ID dari berbagai jenis URL Google Drive
  driveFileId(url) {
    if (!url) return null;
    const patterns = [
      /drive\.google\.com/file/d/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com/open\?id=([a-zA-Z0-9_-]+)/,
      /drive\.google\.com/uc\?[^#]*[?&]id=([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  },

  // Mendapatkan HTML untuk iframe video preview
  getVideoEmbedHtml(url) {
    if (!url) {
      return `<div class="text-slate-500 text-xs text-center"><i class="fa-solid fa-video-slash text-2xl mb-1 block"></i>Kosong</div>`;
    }
    const yt = this.ytEmbedId(url);
    if (yt) {
      return `<iframe class="w-full h-full rounded-2xl" src="https://www.youtube.com/embed/${yt}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
    const gd = this.driveFileId(url);
    if (gd) {
      return `<iframe class="w-full h-full rounded-2xl" src="https://drive.google.com/file/d/${gd}/preview" allow="autoplay" allowfullscreen></iframe>`;
    }
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
      return `<video class="w-full h-full rounded-2xl" controls src="${url}"></video>`;
    }
    return `<div class="text-slate-400 text-xs flex flex-col items-center gap-2 px-4 text-center">
              <i class="fa-solid fa-link text-2xl"></i>
              Format video tidak dikenali
              <a href="${url}" target="_blank" rel="noopener" class="text-sky-400 underline font-semibold">Buka link di tab baru</a>
            </div>`;
  },

  // Mendapatkan URL thumbnail gambar Google Drive yang bisa langsung ditampilkan
  getImageDisplayUrl(url) {
    if (!url) return null;
    const gd = this.driveFileId(url);
    if (gd) return `https://drive.google.com/thumbnail?id=${gd}&sz=w1000`;
    return url;
  },

  // Label Workflow Bahasa Indonesia
  wfLabel(w) {
    return WF_LABELS[w] || w || '-';
  },

  // Label Pengupdate
  actorLabel() {
    if (STATE.role === 'approved') return 'approved';
    return STATE.username || STATE.role || 'system';
  },

  // Form input value helper
  v(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  },

  // Toast notification helper
  toastTimer: null,
  showToast(icon, message, bgColorClass = 'bg-slate-800') {
    const el = document.getElementById('toast');
    const content = document.getElementById('toastContent');
    const iconEl = document.getElementById('toastIcon');
    const msgEl = document.getElementById('toastMsg');

    if (!el || !content) return;

    content.className = `flex items-center gap-2 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl ${bgColorClass}`;
    if (iconEl) iconEl.innerHTML = icon;
    if (msgEl) msgEl.innerText = message;
    
    el.classList.remove('hidden');
    
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      el.classList.add('hidden');
    }, 3000);
  },

  // Melakukan persistensi data di LocalStorage agar tidak delay memuat data
  persistLocal(data) {
    try {
      localStorage.setItem('localTasks', JSON.stringify(data));
    } catch (e) {
      console.error('Gagal menyimpan cache lokal: ', e);
    }
  },

  // Membaca data cache LocalStorage
  getCachedLocal() {
    try {
      const cached = localStorage.getItem('localTasks');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  }
};
