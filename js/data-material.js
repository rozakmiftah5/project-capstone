const MATERIAL_DATA_KEY = 'MM_MASTER_MATERIAL_DATA';

const defaultMaterials = [
    {
        id: 1,
        kode: "1000001",
        shortText: "Pipa Baja Seamless DN100",
        uom: "Mtr",
        materialGroup: "STEEL_PIPE",
        materialType: "RAW",
        valuationClass: "3000 - Raw Materials"
    },
    {
        id: 2,
        kode: "2000005",
        shortText: "Valve Gate DN50 PN16",
        uom: "Pcs",
        materialGroup: "VALVE",
        materialType: "SPARE",
        valuationClass: "3100 - Spare Parts"
    },
    {
        id: 3,
        kode: "3000010",
        shortText: "Flange PN16 DN100",
        uom: "Pcs",
        materialGroup: "FITTING",
        materialType: "RAW",
        valuationClass: "3000 - Raw Materials"
    }
];

function getMaterialData() {
    let data = JSON.parse(localStorage.getItem(MATERIAL_DATA_KEY));
    if (!data || data.length === 0) {
        data = defaultMaterials;
        localStorage.setItem(MATERIAL_DATA_KEY, JSON.stringify(data));
    }
    return data;
}

function saveMaterialData(data) {
    localStorage.setItem(MATERIAL_DATA_KEY, JSON.stringify(data));
}

function parseMaterialExcelRows(rows) {
    const startTime = Date.now();
    return rows.map((row, index) => {
        const cleanRow = {};
        Object.keys(row).forEach(key => {
            const cleanKey = key.toString().trim().toLowerCase().replace(/[.\s_/]/g, '');
            cleanRow[cleanKey] = row[key];
        });

        return {
            id: startTime + index,
            kode: String(cleanRow['kodematerial'] || cleanRow['kode'] || cleanRow['material'] || cleanRow['materialno'] || cleanRow['nomaterial'] || '').trim(),
            shortText: String(cleanRow['shorttext'] || cleanRow['description'] || cleanRow['materialdescription'] || cleanRow['deskripsimaterial'] || cleanRow['deskripsi'] || cleanRow['namamaterial'] || '').trim(),
            uom: String(cleanRow['uom'] || cleanRow['unit'] || cleanRow['satuan'] || cleanRow['baseunit'] || '').trim(),
            materialGroup: String(cleanRow['materialgroup'] || cleanRow['group'] || cleanRow['kelompok'] || '').trim(),
            materialType: String(cleanRow['materialtype'] || cleanRow['type'] || cleanRow['jenis'] || '').trim(),
            valuationClass: String(cleanRow['valuationclass'] || cleanRow['class'] || cleanRow['valuation'] || '').trim()
        };
    }).filter(material => material.kode && material.kode !== 'undefined');
}

async function syncMaterialDataFromExcel() {
    if (typeof XLSX === 'undefined') return getMaterialData();

    try {
        const response = await fetch('data/material%20list.xlsx?t=' + Date.now());
        if (!response.ok) throw new Error('File data/material list.xlsx tidak ditemukan.');

        const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const syncedData = parseMaterialExcelRows(XLSX.utils.sheet_to_json(worksheet));
        if (syncedData.length > 0) {
            saveMaterialData(syncedData);
            window.dispatchEvent(new CustomEvent('material-data-synced', { detail: syncedData }));
            return syncedData;
        }
    } catch (error) {
        console.warn('Gagal sinkronisasi otomatis material:', error.message);
    }

    return getMaterialData();
}