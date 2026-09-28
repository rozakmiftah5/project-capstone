
// Inisialisasi Data dari LocalStorage atau default
var STORAGE_KEY = 'SITTA_BAHAN_AJAR';
var TRACKING_KEY = 'SITTA_TRACKING_DATA';

var dataPengguna = [
  {
    id: 1,
    nama: "Miftahurrozak",
    email: "miftahurrozak",
    password: "12345678",
  }
];

// Load data dari localStorage saat startup
const storedData = localStorage.getItem(STORAGE_KEY);
if (!storedData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultBahanAjar));
} else {
    // Hanya reset jika mendeteksi struktur field yang salah (namaBarang)
    const parsed = JSON.parse(storedData);
    if (parsed.length > 0 && parsed[0].namaBarang) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultBahanAjar));
    }
}

function getStoredBahanAjar() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

const defaultTracking = {
  "DO2025-0001": {
    nomorDO: "DO2025-0001",
    nim: "123456789",
    nama: "Rina Wulandari",
    status: "Dalam Perjalanan",
    ekspedisi: "JNE",
    tanggalKirim: "2025-08-25",
    paket: "PAKET-UT-001",
    total: "Rp 120.000",
    perjalanan: [
      {
        waktu: "2025-08-25 10:12:20",
        keterangan: "Penerimaan di Loket: TANGSEL"
      },
      {
        waktu: "2025-08-25 14:07:56",
        keterangan: "Tiba di Hub: JAKSEL"
      },
      {
        waktu: "2025-08-26 08:44:01",
        keterangan: "Diteruskan ke Kantor Tujuan"
      },
    ]
  },
};

// Inisialisasi dataTracking dari LocalStorage
let dataTracking = JSON.parse(localStorage.getItem(TRACKING_KEY)) || defaultTracking;

// Fungsi pembantu untuk menyimpan tracking
function saveTrackingData() {
    localStorage.setItem(TRACKING_KEY, JSON.stringify(dataTracking));
}
