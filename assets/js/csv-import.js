/**
 * ======================================================================
 * CSV-IMPORT.JS - CLIENT-SIDE CSV PARSING & UPLOAD
 * ----------------------------------------------------------------------
 * Membaca file CSV dari input file, parsing lokal (validasi), dan
 * mengirimkan payload ke API backend Google Apps Script.
 * ======================================================================
 */

const CsvImport = {
  triggerFileInput() {
    const inp = document.getElementById('csvFileInput');
    if (inp) inp.click();
  },

  async handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      Utils.showToast('<i class="fa-solid fa-triangle-exclamation"></i>', 'Hanya mendukung file .csv!', 'bg-red-500');
      return;
    }

    Utils.showToast('<i class="fa-solid fa-spinner fa-spin"></i>', 'Membaca file CSV...', 'bg-sky-500');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target.result;
      await this.upload(csvText);
    };
    reader.readAsText(file);
    
    // Reset file input agar bisa upload file yang sama jika diinginkan
    event.target.value = '';
  },

  async upload(csvString) {
    Utils.showToast('<i class="fa-solid fa-spinner fa-spin"></i>', 'Mengimpor data ke server...', 'bg-sky-600');
    
    try {
      const res = await Api.importCsv(csvString);
      if (res.success) {
        Utils.showToast('<i class="fa-solid fa-check-double"></i>', `Import sukses! +${res.inserts} Baru, ${res.updates} Update`, 'bg-emerald-600');
        await App.loadData(true); // reload data
      } else {
        Utils.showToast('<i class="fa-solid fa-triangle-exclamation"></i>', res.error || 'Import CSV gagal!', 'bg-red-500');
      }
    } catch (e) {
      Utils.showToast('<i class="fa-solid fa-circle-exclamation"></i>', 'Error koneksi server', 'bg-red-500');
    }
  }
};
