// ===========================
// GLOBAL STATE & STORAGE
// ===========================
let currentEditId = null;

// ===========================
// AUTH & GREETING
// ===========================

function login() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Email dan password wajib diisi");
        return;
    }

    let user = dataPengguna.find(function (u) {
        return u.email === email && u.password === password;
    });

    if (user) {
        // Simpan data user yang login ke localStorage
        localStorage.setItem("activeUser", JSON.stringify(user));
        alert("Login berhasil!");
        window.location.href = "dashboard.html";
    } else {
        alert("email/password yang anda masukkan salah");
    }
}

function lupaPassword() {
    alert("Silakan hubungi admin untuk reset password.");
}

function daftarAkun() {
    document.getElementById("contactModal").style.display = "flex";
}

function closeContactModal() {
    document.getElementById("contactModal").style.display = "none";
}

function greeting() {
    let jam = new Date().getHours();
    let teks = "";

    if (jam < 11) {
        teks = "Selamat pagi";
    } else if (jam < 15) {
        teks = "Selamat siang";
    } else if (jam < 18) {
        teks = "Selamat sore";
    } else {
        teks = "Selamat malam";
    }

    // Ambil data user dari localStorage
    const activeUser = JSON.parse(localStorage.getItem("activeUser"));
    const nama = activeUser ? (activeUser.nama || activeUser.username || activeUser.email) : "Pengguna";
    const role = activeUser ? activeUser.role : "Guest";

    let greet = document.getElementById("greeting");
    if (greet) {
        greet.innerText = `${teks}, ${nama}!`;
    }

    // Sinkronisasi info user di navbar jika ada (untuk dashboard)
    const userInfo = document.getElementById("user-info");
    if (userInfo) {
        userInfo.innerText = `${nama} (${role})`;
    }

    // Update statistik dashboard jika di halaman dashboard
    if (window.location.pathname.includes("dashboard.html")) {
        updateDashboardStats();
    }
}

// Update Angka Statistik di Dashboard
function updateDashboardStats() {
    // Data from data-stock-os.js for Stock OS and Material Codes
    let stockOSData = getStockOSData();
    let totalStockOSQty = stockOSData ? stockOSData.reduce((sum, item) => sum + parseInt(item.stockKg || 0), 0) : 0;

    // Data from data-material.js
    let masterMaterialData = typeof getMaterialData === 'function' ? getMaterialData() : [];
    let totalMaterialCodes = masterMaterialData ? masterMaterialData.length : 0;

    // Data from data-po.js and data-vendor.js
    let poHistoryData = typeof getPOData === 'function' ? getPOData() : [];
    let totalPO = poHistoryData ? poHistoryData.length : 0;
    let vendorData = typeof getVendorData === 'function' ? getVendorData() : [];
    let totalVendor = vendorData ? vendorData.length : 0;

    const stockOSQtyEl = document.getElementById('stat-stock-os-qty');
    const materialCodesEl = document.getElementById('stat-total-material-codes');
    const poEl = document.getElementById('stat-total-po'); // Existing ID
    
    if (stockOSQtyEl) stockOSQtyEl.innerText = totalStockOSQty.toLocaleString('id-ID');
    if (materialCodesEl) materialCodesEl.innerText = totalMaterialCodes;
    if (poEl) poEl.innerText = totalPO;
}

let dashboardSelectedMaterialCode = '';
let dashboardActiveSuggestionIndex = -1;

function getDashboardMaterialMatches(query) {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    if (normalizedQuery.length < 2) return [];

    const materialData = typeof getMaterialData === 'function' ? getMaterialData() : [];
    return materialData
        .filter(material => String(material.kode || '').toLocaleLowerCase('id-ID').includes(normalizedQuery) || String(material.shortText || '').toLocaleLowerCase('id-ID').includes(normalizedQuery))
        .sort((first, second) => {
            const firstStarts = String(first.kode || '').toLocaleLowerCase('id-ID').startsWith(normalizedQuery) || String(first.shortText || '').toLocaleLowerCase('id-ID').startsWith(normalizedQuery);
            const secondStarts = String(second.kode || '').toLocaleLowerCase('id-ID').startsWith(normalizedQuery) || String(second.shortText || '').toLocaleLowerCase('id-ID').startsWith(normalizedQuery);
            return Number(secondStarts) - Number(firstStarts);
        })
        .slice(0, 8);
}

function hideDashboardMaterialSuggestions() {
    const list = document.getElementById('dashboard-material-suggestions');
    const input = document.getElementById('dashboard-search-input');
    if (!list || !input) return;
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    dashboardActiveSuggestionIndex = -1;
}

function selectDashboardMaterial(material) {
    const input = document.getElementById('dashboard-search-input');
    if (!input) return;
    dashboardSelectedMaterialCode = String(material.kode);
    input.value = `${material.kode} - ${material.shortText}`;
    hideDashboardMaterialSuggestions();
    dashboardCheckPrice(dashboardSelectedMaterialCode);
}

function renderDashboardMaterialSuggestions(query) {
    const list = document.getElementById('dashboard-material-suggestions');
    const input = document.getElementById('dashboard-search-input');
    if (!list || !input) return;

    list.replaceChildren();
    dashboardActiveSuggestionIndex = -1;
    if (query.trim().length < 2) {
        hideDashboardMaterialSuggestions();
        return;
    }

    const matches = getDashboardMaterialMatches(query);
    if (matches.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'dashboard-suggestion-empty';
        empty.textContent = 'Material tidak ditemukan.';
        list.appendChild(empty);
    } else {
        matches.forEach(material => {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'dashboard-material-option';
            option.setAttribute('role', 'option');
            option.innerHTML = '<span class="dashboard-material-code"></span><span class="dashboard-material-name"></span>';
            option.querySelector('.dashboard-material-code').textContent = material.kode;
            option.querySelector('.dashboard-material-name').textContent = material.shortText || 'Tanpa deskripsi';
            option.addEventListener('mousedown', event => {
                event.preventDefault();
                selectDashboardMaterial(material);
            });
            list.appendChild(option);
        });
    }

    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
}

function setupDashboardMaterialSearch() {
    const input = document.getElementById('dashboard-search-input');
    const list = document.getElementById('dashboard-material-suggestions');
    const button = document.getElementById('dashboard-price-search-button');
    if (!input || !list || !button || input.dataset.searchReady) return;
    input.dataset.searchReady = 'true';

    input.addEventListener('input', () => {
        dashboardSelectedMaterialCode = '';
        document.getElementById('dashboard-price-result').style.display = 'none';
        document.getElementById('dashboard-price-notfound').style.display = 'none';
        renderDashboardMaterialSuggestions(input.value);
    });
    input.addEventListener('focus', () => renderDashboardMaterialSuggestions(input.value));
    input.addEventListener('keydown', event => {
        const options = [...list.querySelectorAll('.dashboard-material-option')];
        if (event.key === 'ArrowDown' && options.length) {
            event.preventDefault();
            dashboardActiveSuggestionIndex = (dashboardActiveSuggestionIndex + 1) % options.length;
        } else if (event.key === 'ArrowUp' && options.length) {
            event.preventDefault();
            dashboardActiveSuggestionIndex = (dashboardActiveSuggestionIndex - 1 + options.length) % options.length;
        } else if (event.key === 'Escape') {
            hideDashboardMaterialSuggestions();
            return;
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (dashboardActiveSuggestionIndex >= 0 && options[dashboardActiveSuggestionIndex]) {
                options[dashboardActiveSuggestionIndex].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            } else {
                dashboardCheckPrice();
            }
            return;
        } else {
            return;
        }

        options.forEach((option, index) => {
            option.classList.toggle('is-active', index === dashboardActiveSuggestionIndex);
            option.setAttribute('aria-selected', String(index === dashboardActiveSuggestionIndex));
        });
    });
    input.addEventListener('blur', () => setTimeout(hideDashboardMaterialSuggestions, 150));
    button.addEventListener('click', () => dashboardCheckPrice());
}

/**
 * Pencarian Harga Terakhir di Dashboard
 */
function dashboardCheckPrice(codeOverride = '') {
    const input = document.getElementById('dashboard-search-input');
    const resultDiv = document.getElementById('dashboard-price-result');
    const notFoundDiv = document.getElementById('dashboard-price-notfound');
    
    if (!input || !resultDiv || !notFoundDiv) return;
    
    const poData = typeof getPOData === 'function' ? getPOData() : [];
    const materialData = typeof getMaterialData === 'function' ? getMaterialData() : [];
    const query = input.value.trim();
    const exactMaterial = materialData.find(material => String(material.kode) === query || String(material.shortText || '').toLocaleLowerCase('id-ID') === query.toLocaleLowerCase('id-ID'));
    const code = codeOverride || dashboardSelectedMaterialCode || (exactMaterial ? String(exactMaterial.kode) : '');
    if (!code) {
        renderDashboardMaterialSuggestions(query);
        return;
    }

    const materialInfo = materialData.find(m => m.kode === code);
    const history = poData.filter(p => p.kodeMaterial === code);

    if (history.length > 0) {
        // Mencari Harga Terakhir (Latest Price) untuk perbandingan
        const latest = [...history].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))[0];

        document.getElementById('res-nama').innerText = materialInfo ? materialInfo.shortText : 'Material ' + code;
        document.getElementById('res-kode').innerText = 'Kode: ' + code + ' | ' + history.length + ' Record Harga';
        document.getElementById('res-group').innerText = 'Group: ' + (materialInfo ? materialInfo.materialGroup : '-');
        // Mengembalikan ke Material Type atau kosong jika tidak ada
        document.getElementById('res-type').innerText = 'Type: ' + (materialInfo ? materialInfo.materialType : '-');
        
        document.getElementById('res-tanggal').innerText = "Tgl PO: " + latest.tanggal;
        document.getElementById('res-harga').innerHTML = `Rp ${latest.harga.toLocaleString('id-ID')}`;
        document.getElementById('res-vendor').innerText = latest.vendor;

        resultDiv.style.display = 'block';
        notFoundDiv.style.display = 'none';
    } else {
        resultDiv.style.display = 'none';
        notFoundDiv.style.display = 'block';
    }
}

/**
 * Jam Aktual Real-time
 */
function startClock() {
    const clockEl = document.getElementById('live-clock');
    if (!clockEl) return;

    function update() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        };
        clockEl.innerText = now.toLocaleDateString('id-ID', options).replace(/\./g, ':');
    }
    update();
    setInterval(update, 1000);
}

const MATERIAL_REQUESTS_KEY = 'MM_MATERIAL_REQUESTS';

function getMaterialRequests() {
    try {
        const requests = JSON.parse(localStorage.getItem(MATERIAL_REQUESTS_KEY) || '[]');
        return Array.isArray(requests) ? requests : [];
    } catch (error) {
        return [];
    }
}

function renderMaterialRequestInbox() {
    const count = document.getElementById('material-request-notification-count');
    const summary = document.getElementById('material-request-inbox-summary');
    const list = document.getElementById('material-request-inbox-list');
    if (!count || !summary || !list) return;

    const requests = getMaterialRequests();
    const unreadCount = requests.filter(request => !request.read).length;
    count.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    count.hidden = unreadCount === 0;
    summary.textContent = requests.length ? `${requests.length} pengajuan` : 'Belum ada pengajuan';
    list.replaceChildren();

    if (requests.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'material-request-inbox-empty';
        empty.textContent = 'Notifikasi pengajuan baru akan muncul di sini.';
        list.appendChild(empty);
        return;
    }

    requests.slice(0, 10).forEach(request => {
        const item = document.createElement('article');
        item.className = `material-request-inbox-item${request.read ? '' : ' is-unread'}`;

        const title = document.createElement('h3');
        title.textContent = request.metadata?.nomorSurat || request.materials?.[0]?.maktx || request.id || 'Pengajuan material';
        const requester = document.createElement('p');
        requester.textContent = `Diajukan oleh ${request.requester || 'Pengguna'}${request.metadata?.divisiPeminta ? ` - ${request.metadata.divisiPeminta}` : ''}`;
        const materialNames = (request.materials || []).map(material => material.maktx).filter(Boolean);
        const details = document.createElement('p');
        details.textContent = `${materialNames.length} material${materialNames.length === 1 ? '' : ''}: ${materialNames.slice(0, 3).join(', ') || 'Tanpa deskripsi'}`;
        const date = document.createElement('time');
        date.dateTime = request.submittedAt || '';
        date.textContent = request.submittedAt ? new Date(request.submittedAt).toLocaleString('id-ID') : '';

        item.append(title, requester, details, date);
        list.appendChild(item);
    });
}

function setupMaterialRequestInbox() {
    const toggle = document.getElementById('material-request-notification-toggle');
    const panel = document.getElementById('material-request-notification-panel');
    if (!toggle || !panel || toggle.dataset.inboxReady) return;
    toggle.dataset.inboxReady = 'true';

    renderMaterialRequestInbox();
    toggle.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        toggle.setAttribute('aria-expanded', String(!panel.hidden));
        if (!panel.hidden) {
            const requests = getMaterialRequests();
            requests.forEach(request => { request.read = true; });
            localStorage.setItem(MATERIAL_REQUESTS_KEY, JSON.stringify(requests));
            renderMaterialRequestInbox();
        }
    });
    window.addEventListener('storage', event => {
        if (event.key === MATERIAL_REQUESTS_KEY) renderMaterialRequestInbox();
    });
    window.addEventListener('material-request-submitted', renderMaterialRequestInbox);
}

// Jalankan fungsi UI global secara mandiri agar tidak crash pada halaman non-Vue
function initGlobalUI() {
    // Jalankan sapaan dan jam aktual untuk semua halaman
    greeting();
    startClock();
    setupDashboardMaterialSearch();
    setupMaterialRequestInbox();

    if (document.getElementById('stat-total-po') && typeof syncPODataFromExcel === 'function') {
        syncPODataFromExcel().then(updateDashboardStats);
    }
    if (document.getElementById('stat-total-material-codes') && typeof syncMaterialDataFromExcel === 'function') {
        syncMaterialDataFromExcel().then(updateDashboardStats);
    }

    // Animasi fade-in
    document.querySelectorAll('.card, .table-container, .login-box').forEach(el => {
        el.classList.add('fade-in');
    });
}

// Inisialisasi UI segera setelah script dimuat dan DOM siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalUI);
} else {
    initGlobalUI();
}

function rekapBahanAjar() {
    alert("Menu Rekap Bahan Ajar");
}

function historiTransaksi() {
    alert("Menu Histori Transaksi Bahan Ajar");
}

function logout() {
    let konfirmasi = confirm("Apakah Anda yakin ingin logout?");

    if (konfirmasi) {
        // Hapus data user saat logout
        localStorage.removeItem("activeUser");
        alert("Logout berhasil");
        window.location.href = "login.html";
    }
}

// Toggle Sidebar untuk Mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}