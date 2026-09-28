const VENDOR_DATA_KEY = 'MM_VENDOR_DATA';

const defaultVendors = [
    {
        id: 1,
        namaVendor: "PT. Baja Perkasa",
        komoditi: "Pipa, Plat Baja",
        kontak: "sales@bajaperkasa.com / 021-1234567"
    },
    {
        id: 2,
        namaVendor: "CV. Valve Indonesia",
        komoditi: "Valve, Fitting",
        kontak: "info@valveindo.co.id / 021-9876543"
    },
    {
        id: 3,
        namaVendor: "PT. Kimia Jaya",
        komoditi: "Chemical Industri",
        kontak: "marketing@kimiajaya.com / 021-1122334"
    },
    {
        id: 4,
        namaVendor: "UD. Mekanik Mandiri",
        komoditi: "Jasa Fabrikasi, Spare Part Mesin",
        kontak: "mekanik.mandiri@gmail.com / 0812-3456-7890"
    }
];

function getVendorData() {
    let data = JSON.parse(localStorage.getItem(VENDOR_DATA_KEY));
    if (!data || data.length === 0) {
        data = defaultVendors;
        localStorage.setItem(VENDOR_DATA_KEY, JSON.stringify(data));
    }
    return data;
}

function saveVendorData(data) {
    localStorage.setItem(VENDOR_DATA_KEY, JSON.stringify(data));
}