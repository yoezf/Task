/**
 * ======================================================================
 * REALTIME.JS - POLLING AND REALTIME UPDATES
 * ----------------------------------------------------------------------
 * Mengelola sinkronisasi realtime dengan polling interval 5000ms.
 * Memperbarui data, statistik, dan grid tanpa reload halaman browser.
 * ======================================================================
 */

const Realtime = {
  intervalId: null,
  isSyncing: false,

  // Mulai pooling realtime setiap 5 detik
  start() {
    if (this.intervalId) this.stop();
    
    this.intervalId = setInterval(async () => {
      await this.sync();
    }, CONFIG.POLLING_INTERVAL);
    
    console.log(`Realtime polling dimulai: ${CONFIG.POLLING_INTERVAL}ms`);
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Realtime polling dihentikan.');
    }
  },

  // Sinkronisasi data dari server di latar belakang secara transparan (tanpa skeleton loading)
  async sync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    
    try {
      const result = await Api.fetchAllTasks();
      if (result.success && result.data) {
        // Cek apakah ada perubahan data
        const oldLen = STATE.allTasks.length;
        const newLen = result.data.length;
        const hasChanged = JSON.stringify(STATE.allTasks) !== JSON.stringify(result.data);
        
        if (hasChanged) {
          STATE.allTasks = result.data;
          STATE.projects = result.projects || STATE.projects;
          
          Utils.persistLocal(STATE.allTasks);
          Filter.setupProjectDropdown();
          Filter.apply(); // Update grid dan stat secara realtime
          
          console.log('Data disinkronkan secara realtime. Perubahan terdeteksi!');
        }
      }
    } catch (e) {
      console.warn('Realtime sync failed: ', e);
    } finally {
      this.isSyncing = false;
    }
  }
};
