/**
 * ======================================================================
 * CONFIG.JS - KONFIGURASI GLOBAL
 * ----------------------------------------------------------------------
 * Menyimpan konfigurasi API endpoint dan default STATE sistem.
 * ======================================================================
 */

const CONFIG = {
  // GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA SETELAH DEPLOY
  API_URL: 'https://docs.google.com/spreadsheets/d/1yGp-IDhYgP1O3s-V9AUNImjvFP6mT2vAc0Bf-TBmtFM/edit?gid=1523672340#gid=1523672340',
  POLLING_INTERVAL: 5000, // Realtime polling setiap 5 detik (5000 ms)
  DEFAULT_PER_PAGE: 30,    // Item per halaman untuk grid pagination
};

// State global aplikasi
let STATE = {
  apiUrl: CONFIG.API_URL,
  allTasks: [],
  filteredTasks: [],
  projects: [],
  role: 'public',      // admin, qc, leader, approved, public (guest)
  userName: 'Guest',
  username: '',
  search: '',
  project: '',
  status: '',
  workflow: '',
  sort: 'update_desc', // update_desc, id_desc, id_asc
  page: 1,
  perPage: CONFIG.DEFAULT_PER_PAGE
};

const UI_COLORS = {
  'Online': { c: 'bg-emerald-100 text-emerald-700 border-emerald-200', i: 'fa-wifi' },
  'Offline': { c: 'bg-slate-100 text-slate-600 border-slate-200', i: 'fa-power-off' },
  'Hold': { c: 'bg-amber-100 text-amber-700 border-amber-200', i: 'fa-pause' },
  'Waiting Received': { c: 'bg-slate-100 text-slate-600 border-slate-200' },
  'Received': { c: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Ready': { c: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' },
  'Sample Video': { c: 'bg-purple-100 text-purple-700 border-purple-200' },
  'Sample Done': { c: 'bg-teal-100 text-teal-700 border-teal-200' },
  'Approved': { c: 'bg-green-100 text-green-700 border-green-200' },
  'Revision': { c: 'bg-red-100 text-red-700 border-red-200' }
};

const WF_LABELS = {
  'Waiting Received': 'Menunggu Diterima',
  'Received': 'Diterima',
  'Skip': 'Skip',
  'Sample Video': 'Sample Diminta',
  'Sample Done': 'Sample Selesai',
  'Approved': 'Disetujui',
  'Revision': 'Revisi',
  'Ready': 'Ready'
};
