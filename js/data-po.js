const PO_DATA_KEY = 'MM_PO_HISTORY_DATA';

const defaultPO = [
    {
        id: 1,
        nomorPO: "PO/KTI/2024/001",
        kodeMaterial: "1000001",
        harga: 25000000,
        vendor: "PT. Baja Perkasa",
        tanggal: "2024-05-10"
    },
    {
        id: 2,
        nomorPO: "PO/KTI/2024/002",
        kodeMaterial: "2000005",
        harga: 1200000,
        vendor: "CV. Valve Indonesia",
        tanggal: "2024-05-15"
    }
];

function getPOData() {
    let data = JSON.parse(localStorage.getItem(PO_DATA_KEY));
    if (!data || data.length === 0) {
        data = defaultPO;
        localStorage.setItem(PO_DATA_KEY, JSON.stringify(data));
    }
    return data;
}

function savePOData(data) {
    localStorage.setItem(PO_DATA_KEY, JSON.stringify(data));
}

function parsePOExcelRows(rows) {
    const normalize = value => String(value || '').trim().toLowerCase().replace(/[.\s_\/]/g, '');
    const parseNumber = value => {
        if (typeof value === 'number') return value;
        const normalized = String(value || '').trim().replace(/,/g, '.').replace(/(\d)\.(\d{3})/g, '$1$2');
        return parseFloat(normalized) || 0;
    };

    return rows.map((row, index) => {
        const fields = {};
        Object.entries(row).forEach(([key, value]) => { fields[normalize(key)] = value; });
        const pick = (...keys) => keys.map(key => fields[key]).find(value => value !== undefined && value !== null && value !== '');
        const rawDate = pick('documentdate', 'tanggal', 'date', 'podate', 'tgl', 'tanggalpo');
        let tanggal = String(rawDate || '').trim();
        if (typeof rawDate === 'number') {
            tanggal = new Date(Math.round((rawDate - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
        }
        const qty = parseNumber(pick('orderquantity', 'qty', 'quantity', 'jumlah', 'kuantitas', 'jumlahpesan'));
        const harga = parseNumber(pick('netprice', 'harga', 'price', 'unitprice', 'hargasatuan', 'hargaperunit'));
        const nomorPO = String(pick('purchasingdocument', 'nomorpo', 'ponumber', 'pono', 'nopo', 'po', 'nomororder') || '').trim();
        const kodeMaterial = String(pick('kodematerial', 'materialcode', 'materialno', 'material', 'kode', 'nomormaterial', 'itemcode') || '').trim();

        return {
            id: Date.now() + index,
            nomorPO,
            tanggal,
            kodeMaterial,
            shortText: String(pick('shorttext', 'description', 'deskripsimaterial', 'deskripsi', 'namamaterial', 'namabarang', 'materialname') || '').trim(),
            materialGroup: String(pick('materialgroup') || '').trim(),
            vendor: String(pick('suppliersupplyingplant', 'vendor', 'supplier', 'pemasok', 'namavendor', 'namasupplier') || '').trim(),
            qty,
            uom: String(pick('orderunit', 'uom', 'unit', 'satuan', 'baseunit', 'unitofmeasure') || '').trim(),
            currency: String(pick('currency') || 'IDR').trim(),
            harga,
            total: parseNumber(pick('netordervalue')) || qty * harga
        };
    }).filter(item => item.nomorPO && item.kodeMaterial);
}

async function syncPODataFromExcel() {
    if (typeof XLSX === 'undefined') return getPOData();

    for (const filePath of ['data/Riwayat PO.xls', 'data/Riwayat PO.xlsx']) {
        try {
            const response = await fetch(encodeURI(filePath) + '?t=' + Date.now());
            if (!response.ok) continue;

            const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet);
            const syncedData = parsePOExcelRows(rows);
            if (syncedData.length > 0) {
                savePOData(syncedData);
                window.dispatchEvent(new CustomEvent('po-data-synced', { detail: syncedData }));
                return syncedData;
            }
        } catch (error) {
            console.warn(`Gagal membaca ${filePath}:`, error.message);
        }
    }

    return getPOData();
}