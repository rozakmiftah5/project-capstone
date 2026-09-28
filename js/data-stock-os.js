const STOCK_OS_KEY = 'MM_STOCK_OS_DATA';
const STOCK_USAGE_KEY = 'MM_STOCK_USAGE_HISTORY';
const STOCK_RECEIPT_HISTORY_KEY = 'MM_STOCK_RECEIPT_HISTORY';

const defaultStockOS = [
    {
        id: 1,
        namaMaterial: "Pipa Baja Seamless DN100",
        gudang: "Krenceng",
        stockKg: 1500,
        sisaPOKg: 500,
        safetyStockKg: 200,
        catatan: "Untuk proyek konstruksi A",
        lastUpdate: "2024-05-25"
    },
    {
        id: 2,
        namaMaterial: "Valve Gate DN50 PN16",
        gudang: "Cidanau",
        stockKg: 300,
        sisaPOKg: 0,
        safetyStockKg: 50,
        catatan: "Stok untuk maintenance rutin",
        lastUpdate: "2024-05-24"
    },
    {
        id: 3,
        namaMaterial: "Flange PN16 DN100",
        gudang: "Krenceng",
        stockKg: 800,
        sisaPOKg: 200,
        safetyStockKg: 100,
        catatan: "Menunggu pengiriman PO-2024-005",
        lastUpdate: "2024-05-26"
    }
];

let stockOSData = JSON.parse(localStorage.getItem(STOCK_OS_KEY));
if (!stockOSData || stockOSData.length === 0) {
    stockOSData = defaultStockOS;
    localStorage.setItem(STOCK_OS_KEY, JSON.stringify(stockOSData));
}

function getStockOSData() {
    return JSON.parse(localStorage.getItem(STOCK_OS_KEY));
}

function saveStockOSData(data) {
    localStorage.setItem(STOCK_OS_KEY, JSON.stringify(data));
}

function getUsageHistory() {
    return JSON.parse(localStorage.getItem(STOCK_USAGE_KEY)) || [];
}

function saveUsageHistory(data) {
    localStorage.setItem(STOCK_USAGE_KEY, JSON.stringify(data));
}

function getReceiptHistory() {
    return JSON.parse(localStorage.getItem(STOCK_RECEIPT_HISTORY_KEY)) || [];
}

function saveReceiptHistory(data) {
    localStorage.setItem(STOCK_RECEIPT_HISTORY_KEY, JSON.stringify(data));
}