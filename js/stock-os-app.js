const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

createApp({
    setup() {
        const stockOSList = ref([]);
        const isLoading = ref(false);
        const modalVisible = ref(false);
        const currentEditId = ref(null);
        const formData = ref({
            id: null,
            namaMaterial: '',
            gudang: '',
            stockKg: 0,
            sisaPOKg: 0,
            safetyStockKg: 0,
            catatan: '',
            lastUpdate: ''
        });

        const usageModalVisible = ref(false);
        const usageFixed = ref(false);
        const formDataUsage = ref({
            materialId: '',
            qty: 0,
            tanggal: new Date().toISOString().split('T')[0],
            keterangan: ''
        });

        const receiptModalVisible = ref(false);
        const formDataReceipt = ref({
            materialId: '',
            qty: 0,
            suplierName: '',
            tanggal: new Date().toISOString().split('T')[0],
            keterangan: ''
        });

        const historyModalVisible = ref(false);
        const selectedMaterialHistory = ref([]);
        const selectedMaterialName = ref('');

        const filters = ref({
            search: '',
            gudang: '',
            criticalOnly: false
        });

        const sortBy = ref('namaMaterial');
        const currentPage = ref(1);
        const itemsPerPage = 10;

        const gudangList = computed(() => {
            // Mengambil semua nilai gudang unik dari data stockOSList secara otomatis
            const unique = [...new Set(stockOSList.value.map(item => item.gudang))];
            return unique.filter(g => g && g.trim() !== '').sort();
        });

        const filteredAndSortedData = computed(() => {
            // Gunakan spread operator agar tidak memodifikasi array asli saat sorting
            let data = [...stockOSList.value];

            if (filters.value.search) {
                const searchTerm = filters.value.search.toLowerCase();
                data = data.filter(item =>
                    item.namaMaterial.toLowerCase().includes(searchTerm) ||
                    item.gudang.toLowerCase().includes(searchTerm) ||
                    item.catatan.toLowerCase().includes(searchTerm)
                );
            }

            if (filters.value.gudang) {
                data = data.filter(item => item.gudang === filters.value.gudang);
            }

            if (filters.value.criticalOnly) {
                data = data.filter(item => item.stockKg <= item.safetyStockKg);
            }

            data.sort((a, b) => {
                if (sortBy.value === 'namaMaterial') {
                    return a.namaMaterial.localeCompare(b.namaMaterial);
                } else if (sortBy.value === 'stockKg') {
                    return a.stockKg - b.stockKg;
                } else if (sortBy.value === 'sisaPOKg') {
                    return b.sisaPOKg - a.sisaPOKg;
                }
                return 0;
            });

            return data;
        });

        // Reset ke halaman 1 setiap kali filter berubah
        // Ini mencegah tabel terlihat kosong jika user berada di page tinggi
        watch(filters, () => {
            currentPage.value = 1;
        }, { deep: true });

        const totalPages = computed(() => {
            return Math.ceil(filteredAndSortedData.value.length / itemsPerPage);
        });

        const paginatedData = computed(() => {
            const start = (currentPage.value - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            return filteredAndSortedData.value.slice(start, end);
        });

        function loadStockOSData() {
            stockOSList.value = getStockOSData();
        }

        // Fungsi pembantu untuk memproses JSON dari Excel
        function processExcelJson(jsonData) {
            const startTime = Date.now();
            return jsonData.map((row, index) => {
                const cleanRow = {};
                Object.keys(row).forEach(key => {
                    cleanRow[key.toString().trim().toLowerCase()] = row[key];
                });

                // Log the cleaned row for debugging
                if (index < 5) console.log(`[Stock OS - Row ${index + 1}] Cleaned Data:`, cleanRow);

                return {
                    id: startTime + index,
                    namaMaterial: String(cleanRow['nama material'] || cleanRow['material'] || cleanRow['deskripsi'] || '').trim(),
                    gudang: String(cleanRow['gudang'] || cleanRow['lokasi'] || 'Gudang Utama').trim(),
                    stockKg: parseFloat(cleanRow['stock'] || cleanRow['stok'] || cleanRow['qty'] || 0),
                    sisaPOKg: parseFloat(cleanRow['sisa po'] || cleanRow['outstanding'] || 0),
                    safetyStockKg: parseFloat(cleanRow['safety stock'] || cleanRow['min stock'] || 0),
                    catatan: String(cleanRow['catatan'] || cleanRow['keterangan'] || '').trim(),
                    lastUpdate: new Date().toISOString().slice(0, 10)
                };
            }).filter(m => m.namaMaterial);
        }

        // Fungsi sinkronisasi dengan Excel
        async function autoLoadFromExcel() {
            if (stockOSList.value.length === 0) isLoading.value = true;
            try {
                const filePath = 'data/stock%20os.xlsx';
                console.log(`[Stock OS] Mencoba mengambil file dari: ${filePath}`);
                const response = await fetch(filePath + '?t=' + new Date().getTime());
                if (!response.ok) throw new Error(`File "${filePath}" tidak ditemukan.`);

                const arrayBuffer = await response.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length > 0) {
                    console.log("[Stock OS] Raw Headers found:", Object.keys(jsonData[0]));
                    console.log("[Stock OS] Headers found:", Object.keys(jsonData[0]));
                    console.log("[Stock OS] Baris pertama Excel:", jsonData[0]);
                    const syncedData = processExcelJson(jsonData);
                    stockOSList.value = syncedData;
                    saveStockOSData(syncedData);
                    console.log(`Auto-sync Stock OS Berhasil: ${syncedData.length} data dimuat.`);
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
            } catch (error) {
                console.error("Gagal Sinkronisasi Otomatis Stock OS:", error.message);
                if (window.location.protocol === 'file:') {
                    console.warn("Peringatan: Gunakan Live Server untuk sinkronisasi file Excel.");
                }
            } finally {
                isLoading.value = false;
            }
        }

        function openModalTambah() {
            currentEditId.value = null;
            formData.value = {
                id: Date.now(),
                namaMaterial: '',
                gudang: '',
                stockKg: 0,
                sisaPOKg: 0,
                safetyStockKg: 0,
                catatan: '',
                lastUpdate: new Date().toISOString().slice(0, 10)
            };
            modalVisible.value = true;
        }

        function openModalEdit(item) {
            currentEditId.value = item.id;
            formData.value = { ...item };
            modalVisible.value = true;
        }

        function simpanData() {
            const index = stockOSList.value.findIndex(item => item.id === currentEditId.value);
            if (index !== -1) {
                stockOSList.value[index] = { ...formData.value, lastUpdate: new Date().toISOString().slice(0, 10) };
            } else {
                stockOSList.value.push({ ...formData.value, lastUpdate: new Date().toISOString().slice(0, 10) });
            }
            saveStockOSData(stockOSList.value);
            modalVisible.value = false;
            alert('Data berhasil disimpan!');
            loadStockOSData();
        }

        function hapusData(item) {
            if (confirm(`Apakah Anda yakin ingin menghapus data ${item.namaMaterial}?`)) {
                stockOSList.value = stockOSList.value.filter(data => data.id !== item.id);
                saveStockOSData(stockOSList.value);
                alert('Data berhasil dihapus!');
                loadStockOSData();
            }
        }

        function showHistory(item) {
            selectedMaterialName.value = item.namaMaterial;
            
            const usageHistory = getUsageHistory().filter(log => log.materialId === item.id).map(log => ({...log, type: 'OUT', transactionType: 'Pemakaian'}));
            const incomingHistory = getReceiptHistory().filter(log => log.materialId === item.id).map(log => ({...log, type: 'IN', transactionType: 'Penerimaan'}));
            
            // Gabungkan riwayat Masuk dan Keluar (Kartu Stok)
            selectedMaterialHistory.value = [...usageHistory, ...incomingHistory]
                .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
                
            historyModalVisible.value = true;
        }

        function openModalPemakaian(item = null) {
            usageModalVisible.value = true;
            if (item) {
                formDataUsage.value.materialId = item.id;
                usageFixed.value = true;
            } else {
                formDataUsage.value.materialId = '';
                usageFixed.value = false;
            }
            formDataUsage.value.qty = 0;
            formDataUsage.value.keterangan = '';
            formDataUsage.value.tanggal = new Date().toISOString().split('T')[0];
        }

        function simpanPemakaian() {
            const material = stockOSList.value.find(m => m.id === formDataUsage.value.materialId);
            if (material) {
                if (material.stockKg < formDataUsage.value.qty) {
                    alert("Gagal! Jumlah pemakaian melebihi stok yang ada.");
                    return;
                }
                
                // 1. Proses pengurangan stok otomatis
                material.stockKg -= parseFloat(formDataUsage.value.qty);
                material.lastUpdate = new Date().toISOString().slice(0, 10);
                
                // 2. Simpan perubahan stok
                saveStockOSData(stockOSList.value);
                
                // 3. Catat ke Histori Pemakaian
                const usageLog = {
                    id: Date.now(),
                    materialId: material.id,
                    namaMaterial: material.namaMaterial,
                    qty: parseFloat(formDataUsage.value.qty),
                    tanggal: formDataUsage.value.tanggal,
                    keterangan: formDataUsage.value.keterangan,
                    timestamp: new Date().toLocaleString('id-ID')
                };
                
                const history = getUsageHistory();
                history.push(usageLog);
                saveUsageHistory(history);
                
                alert(`Berhasil mencatat pemakaian ${formDataUsage.value.qty} Kg untuk ${material.namaMaterial}`);
                usageModalVisible.value = false;
                loadStockOSData(); // Refresh tampilan
            } else {
                alert("Silakan pilih material terlebih dahulu.");
            }
        }

        function openModalPenerimaan(item = null) {
            receiptModalVisible.value = true;
            formDataReceipt.value.materialId = item ? item.id : '';
            formDataReceipt.value.qty = 0;
            formDataReceipt.value.suplierName = '';
            formDataReceipt.value.keterangan = '';
            formDataReceipt.value.tanggal = new Date().toISOString().split('T')[0];
        }

        function simpanPenerimaan() {
            const material = stockOSList.value.find(m => m.id === formDataReceipt.value.materialId);
            if (material) {
                const qty = parseFloat(formDataReceipt.value.qty);
                
                // 1. Update Stok dan Sisa PO
                material.stockKg += qty;
                material.sisaPOKg = Math.max(0, material.sisaPOKg - qty);
                material.lastUpdate = new Date().toISOString().slice(0, 10);
                
                saveStockOSData(stockOSList.value);
                
                // 2. Catat ke Histori Penerimaan
                const receiptLog = {
                    id: Date.now(),
                    materialId: material.id,
                    namaMaterial: material.namaMaterial,
                    qty: qty,
                    suplierName: formDataReceipt.value.suplierName,
                    tanggal: formDataReceipt.value.tanggal,
                    keterangan: formDataReceipt.value.keterangan,
                    timestamp: new Date().toLocaleString('id-ID')
                };
                
                const history = getReceiptHistory();
                history.push(receiptLog);
                saveReceiptHistory(history);
                
                alert(`Berhasil menerima ${qty} Kg untuk ${material.namaMaterial}. Sisa PO telah berkurang.`);
                receiptModalVisible.value = false;
                loadStockOSData();
            }
        }

        function getStatusClass(item) {
            if (item.stockKg <= 0) return 'badge-danger';
            if (item.stockKg <= item.safetyStockKg) return 'badge-warning';
            return 'badge-success';
        }

        function getStatusText(item) {
            if (item.stockKg <= 0) return 'Stok Habis';
            if (item.stockKg <= item.safetyStockKg) return 'Stok Kritis';
            return 'Aman';
        }

        function getStatusIcon(item) {
            if (item.stockKg <= 0) return 'fa-solid fa-circle-xmark';
            if (item.stockKg <= item.safetyStockKg) return 'fa-solid fa-triangle-exclamation';
            return 'fa-solid fa-circle-check';
        }

        function formatNumber(value) {
            return new Intl.NumberFormat('id-ID').format(value);
        }

        function resetFilters() {
            filters.value = {
                search: '',
                gudang: '',
                criticalOnly: false
            };
            sortBy.value = 'namaMaterial';
            currentPage.value = 1;
        }

        onMounted(() => {
            loadStockOSData();
            autoLoadFromExcel();
            setInterval(autoLoadFromExcel, 60000); // Sinkronisasi tiap 60 detik
            if (typeof initGlobalUI === 'function') initGlobalUI();
        });

        return {
            stockOSList,
            allMaterials: stockOSList, // Alias agar sesuai dengan v-for di HTML
            modalVisible,
            currentEditId,
            formData,
            filters,
            sortBy,
            currentPage,
            itemsPerPage,
            gudangList,
            filteredAndSortedData,
            totalPages,
            paginatedData,
            openModalTambah,
            openModalEdit,
            simpanData,
            hapusData,
            getStatusClass,
            getStatusText,
            getStatusIcon,
            formatNumber,
            resetFilters,
            usageModalVisible,
            usageFixed,
            formDataUsage,
            openModalPemakaian,
            simpanPemakaian,
            historyModalVisible,
            selectedMaterialHistory,
            selectedMaterialName,
            showHistory,
            receiptModalVisible,
            formDataReceipt,
            openModalPenerimaan,
            simpanPenerimaan
        };
    }
}).mount('#app');