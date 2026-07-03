# TASK MANAGEMENT PRODUKSI V2 - DOKUMENTASI & PANDUAN LENGKAP

Sistem manajemen task produksi realtime, responsif, modern, dan mobile-friendly dengan biaya operasional **Rp0** menggunakan **Google Spreadsheet** sebagai database, **Google Apps Script** sebagai Backend API, dan **GitHub Pages / Netlify / Vercel** sebagai media deployment frontend (HTML5, Tailwind CSS, Vanilla JS).

---

## 1. ANALISIS SISTEM & PRODUKTIVITAS

Sistem **Task Management Produksi V2** dirancang untuk menyelesaikan tantangan koordinasi tim produksi berskala menengah hingga besar tanpa biaya infrastruktur server bulanan. Dengan memanfaatkan ekosistem Google Workspace (Spreadsheet + Apps Script) dan deployment web gratis, sistem ini mencapai efisiensi biaya 100% (Rp0).

### Arsitektur Aliran Data (Data Flow Architecture)
1. **Frontend (SPA)** memuat data dengan metode *Stale-While-Revalidate* menggunakan Cache LocalStorage untuk mempercepat waktu render pertama (<100ms).
2. **Realtime Polling Engine** melakukan query ke backend Apps Script setiap **5 detik (5000ms)** di latar belakang (background sync) tanpa mengganggu interaksi UI atau memicu reload halaman.
3. **Google Apps Script** bertindak sebagai API gateway tanpa server (Serverless API Router) yang memproses permintaan CORS secara aman, memvalidasi input, melakukan enkripsi sederhana, dan memperbarui data di Google Sheets.
4. **Google Spreadsheet** berfungsi sebagai database relasional terdistribusi. Setiap **Project** dipisahkan menjadi satu sheet (tab) tersendiri guna meminimalkan konflik konkurensi data dan mendukung skalabilitas hingga ribuan task.

---

## 2. ERD DATABASE SPREADSHEET

Database diimplementasikan menggunakan Google Spreadsheet dengan struktur multi-sheet relasional:

### Sheet: USERS
Menyimpan data kredensial pengguna dan role akses.
*   `Username` (Plain text, Primary Key)
*   `Password` (Plain text, sandi masuk)
*   `Role` (`admin`, `qc`, `leader`, `approved`)
*   `FullName` (Nama lengkap tampilan)

### Sheet: PROJECTS
Menyimpan daftar master project yang aktif.
*   `Project Name` (Plain text, Primary Key)

### Sheet: [Project Name] (Multi-Tab per Project)
Setiap project baru akan secara otomatis dibuatkan sheet tersendiri oleh Backend API dengan header standar berikut:
*   `Task ID` (Integer, Primary Key)
*   `Task Name` (Plain text)
*   `Description` (Plain text)
*   `Task Goal` (Plain text)
*   `Initialize Status` (Plain text)
*   `Generalization Direction` (Plain text, contoh: Horizontal, Vertical)
*   `Task Type` (Plain text, contoh: Video Pendek, Video Panjang)
*   `Num` (Integer)
*   `Label` (Plain text, contoh: Unboxing, Review)
*   `Pullable Num` (Integer)
*   `Environment Type` (Plain text, contoh: Studio, Outdoor)
*   `Status` (`Online`, `Offline`, `Hold`)
*   `Workflow` (`Waiting Received`, `Received`, `Skip`, `Sample Video`, `Sample Done`, `Approved`, `Revision`, `Ready`)
*   `Video URL` (YouTube / Google Drive URL)
*   `QR Code URL` (Google Drive Image URL / Link Gambar Langsung)
*   `List Barang` (Plain text dengan pemisah semicolon `;`)
*   `Catatan` (Plain text, Catatan internal)
*   `Client Note` (Plain text, Hanya bisa diisi oleh Approver)
*   `Updated By` (Teks pelacak user pengubah)
*   `Last Update` (Timestamp format WIB: `dd/Bulan/yyyy hh:mm`)

### Sheet: LOGS
Audit trail seluruh aktivitas pengguna.
*   `Date` (Timestamp format WIB)
*   `User` (Username pelaku)
*   `Action` (Aktivitas: `LOGIN`, `CREATE_TASK`, `UPDATE_TASK`, `DELETE_TASK`, `IMPORT_INSERT`, `IMPORT_UPDATE`)
*   `Task ID` (ID Task terkait / Project terkait)

---

## 3. STRUKTUR FOLDER FINAL

Aplikasi ini memiliki struktur folder yang rapi, modular, dan terstandardisasi:

```text
task-management/
├── index.html                  # Aplikasi SPA utama (Main Entry Point)
├── assets/
│   ├── css/
│   │   ├── style.css           # Styling global, font, reset, & custom scrollbar
│   │   └── dashboard.css       # Layout dashboard, modal animation, skeleton loader
│   └── js/
│       ├── app.js              # Controller utama aplikasi (DOM initialization & event binders)
│       ├── api.js              # Kumpulan fungsi HTTP fetch wrapper ke Google Apps Script
│       ├── auth.js             # Manajemen sesi login, logout, dan role-based access control
│       ├── task.js             # CRUD logic task, optimistic updates, dan instant workflow status
│       ├── filter.js           # Mesin filter realtime client-side (search, sort, multi-filter)
│       ├── realtime.js         # Pengelola background polling (sinkronisasi 5000ms tanpa freeze)
│       ├── csv-import.js       # Client-side FileReader & RFC 4180 parser untuk import massal
│       ├── modal.js            # Render dynamic data ke modal detail, modal edit, & modal QR
│       └── utils.js            # Helper global (format tanggal WIB, parsing link YT/Drive, toasts)
├── components/                 # Referensi dan cetak biru komponen reusable (Dokumentasi/Mockup)
│   ├── navbar.html
│   ├── sidebar.html
│   ├── footer.html
│   ├── task-card.html
│   └── modal.html
├── data/
│   └── template-task.csv       # Template CSV standar yang dapat langsung diunduh & diimpor
├── config/
│   └── config.js               # Konfigurasi endpoint URL API & interval polling global
└── google-apps-script/         # Source code lengkap untuk diletakkan di Google Apps Script
    ├── Code.gs                 # Web App Router (doGet & doPost API)
    ├── TaskService.gs          # Layanan CRUD data Task di Spreadsheet
    ├── CsvImport.gs            # Mesin parser RFC 4180 dan logika sinkronisasi CSV di server-side
    ├── Auth.gs                 # Layanan verifikasi kredensial user & manajemen sheet USERS
    ├── Logs.gs                 # Logger audit trail aktivitas user & manajemen sheet LOGS
    ├── ProjectService.gs       # Manajemen tab sheet project & auto-headers formatter
    └── appsscript.json         # Konfigurasi manifest Apps Script (Jakarta Timezone & Webapp Access)
```

---

## 4. ROLE USER & HAK AKSES

Keamanan sistem dijaga melalui otentikasi ketat di sisi server-side API dan pembatasan UI (Role-Based Access Control) di sisi frontend:

| Fitur / Hak Akses | GUEST / PUBLIC | OPERATOR QC | LEADER | APPROVER | ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Melihat Data Dashboard** | Ya (Hanya Ready) | Ya (Semua) | Ya (Semua) | Ya (Semua) | Ya (Semua) |
| **Melihat Detail Task** | Tidak | Ya | Ya | Ya | Ya |
| **Membuat Task Baru** | Tidak | Ya | Tidak | Tidak | Ya |
| **Mengedit Metadata** | Tidak | Tidak (Hanya saat create) | Tidak | Tidak | Tidak (Hanya saat create) |
| **Mengedit Status / Alur** | Tidak | Ya (Sample Done/Ready) | Ya (Sample Video/Revisi) | Ya (Approved/Revisi) | Ya (Semua) |
| **Mengisi Client Note** | Tidak | Tidak | Tidak | Ya (Bisa edit saat Sample Done) | Tidak |
| **Mengisi Catatan Internal** | Tidak | Ya | Ya | Ya | Ya |
| **Import CSV Massal** | Tidak | Tidak | Tidak | Tidak | Ya |
| **Menghapus Task** | Tidak | Tidak | Tidak | Tidak | Ya |

---

## 5. ALUR IMPORT CSV (UPSERT LOGIC)

Fitur Import CSV memungkinkan Admin mengunggah ribuan task sekaligus dengan logika **UPSERT** yang aman dan anti-duplikasi:

```text
[User Admin Unggah File .csv]
               │
               ▼
   [FileReader parsing teks]
               │
               ▼
[Pemisah RFC 4180 (Quotes/Commas)]
               │
               ▼
  [Kirim JSON array ke Server]
               │
               ▼
     [Iterasi setiap baris]
               │
      ┌────────┴────────┐
      ▼                 ▼
[Task ID Ada?]     [Task ID Baru?]
      │                 │
      ├─► YA: UPDATE    └─► YA: INSERT
      │   Pindahkan sheet   Auto-create sheet project baru (jika belum ada)
      │   jika Project Name set header kolom standar
      │   diubah oleh user.
               │
               ▼
   [Catat Log Audit Trail]
 (IMPORT_INSERT / IMPORT_UPDATE)
               │
               ▼
   [Kembalikan Hasil Ke UI]
  ("+N Sukses, M Diperbarui")
```

---

## 6. PANDUAN DEPLOYMENT (100% GRATIS)

### Langkah 1: Persiapan Google Spreadsheet
1. Buka Google Sheets dan buat spreadsheet baru. Beri nama **Database Task Produksi V2**.
2. Buat tab/sheet baru bernama `USERS` (huruf besar semua). Isi baris pertama dengan header berikut:
   `Username`, `Password`, `Role`, `FullName`.
3. Buat baris akun default di bawah header tersebut:
   *   `admin` | `admin123` | `admin` | `Super Admin`
   *   `qc1` | `123` | `qc` | `QC Operator`
   *   `leader1` | `123` | `leader` | `Tim Leader`
   *   `app1` | `123` | `approved` | `Approver Client`
4. Buat tab/sheet baru bernama `LOGS` (huruf besar semua) dengan header di baris pertama:
   `Date`, `User`, `Action`, `Task ID`.

### Langkah 2: Deploy Google Apps Script (Backend)
1. Di Google Spreadsheet Anda, klik menu **Extensions** -> **Apps Script** (Ekstensi -> Apps Script).
2. Hapus semua kode default di editor, lalu buat file-file script sesuai dengan struktur di folder `google-apps-script/`:
   *   Buat `Code.gs` dan salin isinya.
   *   Buat `TaskService.gs` dan salin isinya.
   *   Buat `ProjectService.gs` dan salin isinya.
   *   Buat `CsvImport.gs` dan salin isinya.
   *   Buat `Auth.gs` dan salin isinya.
   *   Buat `Logs.gs` dan salin isinya.
3. Di sebelah kiri editor, klik **Project Settings** (ikon roda gigi), pastikan centang "Show appsscript.json manifest file in editor" aktif.
4. Kembali ke editor, klik file `appsscript.json` yang muncul, lalu ganti isinya dengan isi file `appsscript.json` dari folder ini.
5. Klik **Save Project** (ikon disket) di bagian atas.
6. Klik tombol **Deploy** -> **New Deployment** (Terapkan -> Penerapan Baru).
7. Pilih jenis deployment **Web App** (Aplikasi Web).
8. Atur konfigurasi:
   *   **Description**: `Task Management API V2`
   *   **Execute as**: `Me (email-anda@gmail.com)`
   *   **Who has access**: `Anyone` (Siapa saja, ini wajib agar frontend bisa menembus CORS tanpa kendala).
9. Klik **Deploy**. Jika pertama kali, Google akan meminta otorisasi. Klik **Authorize Access**, pilih akun Google Anda, klik **Advanced** (Lanjutan) -> **Go to Task Management (unsafe)**, lalu klik **Allow** (Izinkan).
10. Salin **Web App URL** yang dihasilkan (biasanya berakhiran `/exec`).

### Langkah 3: Konfigurasi Frontend
1. Buka file `task-management/config/config.js` di komputer Anda.
2. Cari variabel `API_URL`, ganti nilainya dengan **Web App URL** yang telah Anda salin pada langkah sebelumnya:
   ```javascript
   API_URL: 'https://script.google.com/macros/s/AKfycb...XXXX.../exec'
   ```
3. Simpan file `config.js`.

### Langkah 4: Deploy Frontend ke GitHub Pages
1. Buat repositori baru di GitHub (misal: `task-management-v2`). Atur opsi menjadi **Public**.
2. Unggah (push) seluruh isi folder `task-management/` (termasuk `index.html`, folder `assets/`, `config/`, dll.) ke cabang `main` atau `master` di repositori GitHub tersebut.
3. Buka repositori Anda di GitHub web, lalu masuk ke menu **Settings** (Pengaturan) -> **Pages**.
4. Di bagian **Build and deployment** -> **Source**, pilih **Deploy from a branch**.
5. Di bagian **Branch**, pilih `main` atau `master` (dan folder `/ (root)`), kemudian klik **Save** (Simpan).
6. Tunggu 1-2 menit. GitHub Pages akan memberikan tautan publik gratis Anda (contoh: `https://username.github.io/task-management-v2/`).
7. Buka tautan tersebut untuk mulai menjalankan sistem secara realtime!

---

## 8. PANDUAN PENGGUNAAN SISTEM

1.  **Akses Publik (Guest)**: Saat pertama kali membuka web, pengguna masuk sebagai Guest. Mereka hanya bisa melihat daftar task yang berstatus workflow **Ready** dan tidak dapat mengklik detail task.
2.  **Login**: Klik ikon gembok kunci di navbar kanan atas, masukkan username `admin` dan password `admin123` (atau QC/Leader/Approver sesuai akun default).
3.  **Membuat Task**: Jika masuk sebagai Admin atau QC, tombol `+` akan muncul di navbar kanan atas. Klik tombol tersebut untuk mengisi metadata task baru secara instan.
4.  **Ubah Workflow Instan**: Klik salah satu kartu task untuk membuka Modal Detail. Berdasarkan role login Anda, tombol aksi yang sesuai alur workflow akan muncul secara otomatis di bagian bawah detail task. Cukup sekali klik untuk mengubah alur tanpa refresh halaman!
5.  **Membuka QR Code Fullscreen**: Di modal detail task, klik gambar QR Code untuk membukanya secara fullscreen agar mudah dipindai oleh kamera smartphone operator di lapangan.
6.  **Import CSV Massal**: Masuk sebagai Admin, klik ikon kertas/import di navbar kanan atas, lalu pilih file CSV hasil ekspor. Data di spreadsheet Anda akan langsung terupdate secara otomatis dan realtime.
