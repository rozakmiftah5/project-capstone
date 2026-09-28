const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        const poList = ref([]);
        const isLoading = ref(false);
        
        // State untuk berbagai macam filter
        const filters = ref({
            search: '',
            startDate: '',
            endDate: '',
            materialGroup: '',
            sortBy: 'latest' // Default: terbaru
        });

        // Mengambil daftar Material Group unik untuk dropdown di UI
        const materialGroupList = computed(() => {
            const groups = poList.value
                .map(item => item.materialGroup)
                .filter(g => g && g.trim() !== '');
            return [...new Set(groups)].sort();
        });

        const filteredData = computed(() => {
            let data = poList.value ? [...poList.value] : [];
            
            // 1. Filter Pencarian Teks
            if (filters.value.search) {
                const q = filters.value.search.toLowerCase();
                data = data.filter(item => 
                    item.nomorPO.toLowerCase().includes(q) || 
                    item.kodeMaterial.toLowerCase().includes(q) || 
                    (item.shortText && item.shortText.toLowerCase().includes(q)) ||
                    item.vendor.toLowerCase().includes(q) ||
                    (item.materialGroup && item.materialGroup.toLowerCase().includes(q)) ||
                    item.uom.toLowerCase().includes(q)
                );
            }

            // 2. Filter Berdasarkan Material Group
            if (filters.value.materialGroup) {
                data = data.filter(item => item.materialGroup === filters.value.materialGroup);
            }

            // 3. Filter Rentang Tanggal
            if (filters.value.startDate) {
                data = data.filter(item => item.tanggal >= filters.value.startDate);
            }
            if (filters.value.endDate) {
                data = data.filter(item => item.tanggal <= filters.value.endDate);
            }

            // 4. Logika Pengurutan (Sorting)
            return data.sort((a, b) => {
                const dateA = new Date(a.tanggal);
                const dateB = new Date(b.tanggal);
                
                if (filters.value.sortBy === 'latest') return dateB - dateA;
                if (filters.value.sortBy === 'oldest') return dateA - dateB;
                if (filters.value.sortBy === 'price_high') return b.harga - a.harga;
                if (filters.value.sortBy === 'price_low') return a.harga - b.harga;
                return 0;
            });
        });

        function loadData() {
            const storedData = typeof getPOData === 'function' ? getPOData() : [];
            poList.value = Array.isArray(storedData) ? storedData : [];
        }

        // Fungsi pembantu untuk memproses JSON dari Excel
        function processExcelJson(jsonData) {
            const startTime = Date.now();
            console.log("[PO - Excel Data] Total rows from Excel:", jsonData.length);
            if (jsonData.length > 0) {
                console.log("[PO - Excel Data] Raw Headers:", Object.keys(jsonData[0]));
            }
            return jsonData.map((row, index) => {
                // Normalisasi header: Menghapus spasi di awal/akhir dan mengubah ke huruf kecil
                const cleanRow = {};
                Object.keys(row).forEach(key => { // Iterasi melalui setiap kunci (header) di baris Excel
                    // Menghapus titik dan spasi untuk pencocokan yang lebih fleksibel (misal "No. PO" jadi "nopo")
                    const cleanKey = key.toString().trim().toLowerCase().replace(/[.\s_/]/g, '');
                    cleanRow[cleanKey] = row[key];
                });

                // Fungsi pembantu untuk konversi tanggal Excel (angka serial) ke format YYYY-MM-DD
                const formatExcelDate = (val) => {
                    if (!val) return '';
                    if (typeof val === 'number') {
                        // Excel date origin is 1899-12-30
                        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                        return date.toISOString().split('T')[0];
                    }
                    return String(val).trim();
                };

                // Logging untuk setiap baris yang diproses
                console.groupCollapsed(`[PO - Processing Row ${index + 1}]`);
                console.log("Original Row:", row);
                console.log("Cleaned Row (normalized headers):", cleanRow);

                // Konversi angka secara aman (menangani string atau number dari Excel)
                const rawQty = cleanRow['orderquantity'] || cleanRow['qty'] || cleanRow['quantity'] || cleanRow['jumlah'] || cleanRow['kuantitas'] || cleanRow['jumlahpesan'] || 0;
                // Mengganti koma dengan titik untuk desimal, lalu menghapus semua titik ribuan
                const qty = parseFloat(String(rawQty).replace(/,/g, '.').replace(/(\d)\.(\d{3})/g, '$1$2')) || 0;
                console.log(`  - Qty: Raw='${rawQty}', Parsed=${qty}`);

                const rawHarga = cleanRow['netprice'] || cleanRow['harga'] || cleanRow['price'] || cleanRow['unitprice'] || cleanRow['hargasatuan'] || cleanRow['hargaperunit'] || 0;
                // Mengganti koma dengan titik untuk desimal, lalu menghapus semua titik ribuan
                const harga = parseFloat(String(rawHarga).replace(/,/g, '.').replace(/(\d)\.(\d{3})/g, '$1$2')) || 0;
                console.log(`  - Harga: Raw='${rawHarga}', Parsed=${harga}`);

                const processedItem = {
                    id: startTime + index,
                    nomorPO: String(
                        cleanRow['purchasingdocument'] || cleanRow['nomorpo'] || cleanRow['ponumber'] || cleanRow['pono'] || 
                        cleanRow['nopo'] || cleanRow['po'] || cleanRow['nomororder'] || ''
                    ).trim(),
                    tanggal: formatExcelDate(cleanRow['documentdate'] || cleanRow['tanggal'] || cleanRow['date'] || cleanRow['podate'] || cleanRow['tgl'] || cleanRow['tanggalpo'] || ''),
                    kodeMaterial: String(
                        cleanRow['kodematerial'] || cleanRow['materialcode'] || cleanRow['materialno'] || 
                        cleanRow['material'] || cleanRow['kode'] || cleanRow['nomormaterial'] || cleanRow['itemcode'] || ''
                    ).trim(),
                    shortText: String(
                        cleanRow['shorttext'] || cleanRow['description'] || cleanRow['deskripsimaterial'] || 
                        cleanRow['deskripsi'] || cleanRow['namamaterial'] || cleanRow['namabarang'] || cleanRow['materialname'] || ''
                    ).trim(),
                    materialGroup: String(cleanRow['materialgroup'] || '').trim(),
                    vendor: String(
                        cleanRow['suppliersupplyingplant'] || cleanRow['vendor'] || cleanRow['supplier'] || cleanRow['pemasok'] || 
                        cleanRow['namavendor'] || cleanRow['namasupplier'] || ''
                    ).trim(),
                    qty: qty,
                    uom: String(
                        cleanRow['orderunit'] || cleanRow['uom'] || cleanRow['unit'] || cleanRow['satuan'] || cleanRow['baseunit'] || 
                        cleanRow['unitofmeasure'] || ''
                    ).trim(),
                    currency: String(cleanRow['currency'] || 'IDR').trim(),
                    harga: harga,
                    total: parseFloat(String(cleanRow['netordervalue'] || 0).replace(/,/g, '.').replace(/(\d)\.(\d{3})/g, '$1$2')) || (qty * harga)
                };

                console.log("Processed Item:", processedItem);
                console.groupEnd();

                return processedItem;
            }).filter(p => {
                const isValid = p.nomorPO && p.nomorPO !== 'undefined' && p.nomorPO !== '' && p.kodeMaterial && p.kodeMaterial !== '';
                if (!isValid) {
                    console.warn(`[PO - Filtered Out Item] Invalid PO or Material Code for item:`, p);
                }
                return isValid;
            });
        }

                // Fungsi untuk mengambil file Excel secara otomatis dari folder data
        async function autoLoadFromExcel() {
            const currentData = poList.value || [];
            if (currentData.length === 0) isLoading.value = true;
            try {
                const syncedData = await syncPODataFromExcel();
                if (Array.isArray(syncedData)) poList.value = syncedData;
            } catch (error) {
                console.error("Gagal Sinkronisasi Otomatis PO:", error.message);
                if (window.location.protocol === 'file:') {
                    console.warn("Peringatan: Browser memblokir pengambilan file otomatis jika Anda membuka HTML secara langsung. Gunakan Live Server.");
                }
            } finally {
                isLoading.value = false;
            }
        }

        // Fitur Sinkronisasi Manual dengan memilih file Excel langsung dari komputer
        async function manualSync() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx, .xls';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                isLoading.value = true;
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const data = new Uint8Array(event.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);

                        if (jsonData.length > 0) {
                            const syncedData = processExcelJson(jsonData);
                            poList.value = syncedData;
                            savePOData(syncedData); // Simpan ke storage lokal
                            alert(`Sinkronisasi Berhasil! ${syncedData.length} data PO telah diperbarui dari file.`);
                        } else {
                            alert("Data tidak ditemukan dalam file Excel tersebut.");
                        }
                    } catch (err) {
                        console.error(err);
                        alert("Gagal membaca file Excel. Pastikan format file benar.");
                    } finally {
                        isLoading.value = false;
                    }
                };
                reader.readAsArrayBuffer(file);
            };
            
            input.click();
        }

        function resetFilters() {
            filters.value = {
                search: '',
                startDate: '',
                endDate: '',
                materialGroup: '',
                sortBy: 'latest'
            };
        }

        function formatCurrency(value) {
            return new Intl.NumberFormat('id-ID').format(value);
        }

        onMounted(() => {
            loadData(); // Ambil dari storage dulu
            autoLoadFromExcel(); // Coba update otomatis dari file di folder data
            // Sinkronisasi otomatis setiap 60 detik
            setInterval(autoLoadFromExcel, 60000);
            if (typeof initGlobalUI === 'function') initGlobalUI();
        });

        return {
            poList,
            filters,
            materialGroupList,
            filteredData,
            formatCurrency,
            isLoading,
            manualSync,
            resetFilters
        };
    }
}).mount('#app');