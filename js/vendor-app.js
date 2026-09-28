const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        const materials = ref([]);
        const poHistory = ref([]);
        const searchQuery = ref('');
        const selectedMaterial = ref(null);
        const showSuggestions = ref(false); // Untuk mengontrol tampilan saran material

        function createVendorQuote() {
            return { id: Date.now() + Math.random(), vendor: '', qty: 0, harga: 0 };
        }

        function createOfferForm(spesifikasiMaterial = '') {
            return {
                namaPengadaan: '',
                nomorPR: '',
                spesifikasiMaterial,
                vendorOffers: [createVendorQuote()]
            };
        }

        const newOfferForm = ref(createOfferForm());
        const manualOffers = ref([]); // Untuk menyimpan penawaran manual

        // Mencari material untuk dipilih
        const materialSuggestions = computed(() => {
            const q = searchQuery.value.toLowerCase();
            return materials.value.filter(m => 
                m.kode.toLowerCase().includes(q) || 
                m.shortText.toLowerCase().includes(q)
            ).slice(0, 10); // Batasi 10 hasil
        });

        // Mengambil semua riwayat harga untuk material yang dipilih
        const comparisonResults = computed(() => {
            if (!selectedMaterial.value) return [];
            
            const materialCode = selectedMaterial.value.kode;

            // Filter historical POs for the selected material
            const historicalData = poHistory.value
                .filter(po => po.kodeMaterial === materialCode)
                .map(po => ({
                    ...po,
                    type: 'historical_po' // Tambahkan tipe untuk pembeda
                }));

            // Filter manual offers for the selected material
            const manualData = manualOffers.value
                .filter(offer => offer.kodeMaterial === materialCode)
                .map(offer => ({
                    // Petakan field penawaran manual agar kompatibel dengan struktur PO untuk tampilan
                    id: offer.id,
                    type: 'manual_offer',
                    nomorPO: offer.nomorPR, // Gunakan nomor PR sebagai nomor PO untuk tampilan
                    tanggal: offer.tanggalInput,
                    kodeMaterial: offer.kodeMaterial,
                    shortText: offer.spesifikasiMaterial, // Gunakan spesifikasiMaterial sebagai shortText
                    materialGroup: selectedMaterial.value.materialGroup, // Warisi dari material terpilih
                    vendor: offer.vendor,
                    qty: offer.qty,
                    uom: selectedMaterial.value.uom, // Warisi dari material terpilih
                    currency: 'IDR', // Mata uang default untuk input manual
                    harga: offer.harga,
                    total: offer.qty * offer.harga,
                    namaPengadaan: offer.namaPengadaan, // Pertahankan field asli untuk tampilan
                    nomorPR: offer.nomorPR,
                    spesifikasiMaterial: offer.spesifikasiMaterial
                }));

            // Gabungkan dan urutkan semua data berdasarkan harga (termurah pertama)
            const combinedData = [...historicalData, ...manualData];
            return combinedData.sort((a, b) => a.harga - b.harga);
        });

        const bestPrice = computed(() => {
            if (comparisonResults.value.length === 0) return null;
            return comparisonResults.value[0]; // Karena sudah di-sort asc
        });

        // Fungsi untuk menyembunyikan saran setelah klik atau blur
        function hideSuggestions() {
            setTimeout(() => { showSuggestions.value = false; }, 150);
        }

        function loadData() {
            // Mengambil data dari master material dan riwayat PO
            materials.value = typeof getMaterialData === 'function' ? getMaterialData() : [];
            poHistory.value = typeof getPOData === 'function' ? getPOData() : [];
            loadManualOffers(); // Muat penawaran manual
        }

        function selectMaterial(item) {
            selectedMaterial.value = item;
            searchQuery.value = item.shortText;
            newOfferForm.value = createOfferForm(item.shortText);
            showSuggestions.value = false; // Sembunyikan saran setelah memilih
        }

        // Fungsi untuk memuat penawaran manual dari localStorage
        function loadManualOffers() {
            const storedOffers = localStorage.getItem('manualOffers');
            if (storedOffers) {
                manualOffers.value = JSON.parse(storedOffers);
            }
        }

        // Fungsi untuk menyimpan penawaran manual ke localStorage
        function saveManualOffers() {
            localStorage.setItem('manualOffers', JSON.stringify(manualOffers.value));
        }

        function addVendorRow() {
            newOfferForm.value.vendorOffers.push(createVendorQuote());
        }

        function removeVendorRow(index) {
            if (newOfferForm.value.vendorOffers.length > 1) {
                newOfferForm.value.vendorOffers.splice(index, 1);
            }
        }

        function addManualOffer() {
            if (!selectedMaterial.value) {
                alert('Pilih material terlebih dahulu untuk menambahkan penawaran.');
                return;
            }
            const vendorOffers = newOfferForm.value.vendorOffers;
            if (!newOfferForm.value.namaPengadaan || !newOfferForm.value.nomorPR || !newOfferForm.value.spesifikasiMaterial || vendorOffers.some(offer => !offer.vendor.trim() || Number(offer.qty) <= 0 || Number(offer.harga) <= 0)) {
                alert('Lengkapi data pengadaan dan vendor. Setiap vendor harus memiliki quantity dan harga lebih dari nol.');
                return;
            }

            const commonOffer = {
                type: 'manual_offer',
                kodeMaterial: selectedMaterial.value.kode,
                tanggalInput: new Date().toISOString().split('T')[0],
                namaPengadaan: newOfferForm.value.namaPengadaan.trim(),
                nomorPR: newOfferForm.value.nomorPR.trim(),
                spesifikasiMaterial: newOfferForm.value.spesifikasiMaterial.trim()
            };
            const newOffers = vendorOffers.map(offer => ({
                ...commonOffer,
                id: Date.now() + Math.random(),
                vendor: offer.vendor.trim(),
                qty: Number(offer.qty),
                harga: Number(offer.harga)
            }));

            manualOffers.value.push(...newOffers);
            saveManualOffers();
            alert(`${newOffers.length} penawaran vendor berhasil ditambahkan!`);
            newOfferForm.value = createOfferForm(selectedMaterial.value.shortText);
        }

        function clearManualOffers() {
            if (confirm('Apakah Anda yakin ingin menghapus semua penawaran manual untuk material ini?')) {
                // Filter out offers for the currently selected material
                manualOffers.value = manualOffers.value.filter(offer => 
                    offer.kodeMaterial !== selectedMaterial.value.kode
                );
                saveManualOffers();
                alert('Semua penawaran manual untuk material ini telah dihapus.');
            }
        }

        function clearSelection() {
            selectedMaterial.value = null;
            searchQuery.value = '';
            newOfferForm.value = createOfferForm();
        }

        function formatCurrency(val) {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(val);
        }

        function calculateSavings(price) {
            if (!bestPrice.value || price <= 0) return 0;
            return ((price - bestPrice.value.harga) / price * 100).toFixed(1);
        }

        onMounted(() => {
            loadData();
            if (typeof syncMaterialDataFromExcel === 'function') {
                syncMaterialDataFromExcel().then(data => { materials.value = data; });
            }
            if (typeof initGlobalUI === 'function') initGlobalUI();
        });

        return {
            searchQuery,
            materialSuggestions,
            selectedMaterial,
            showSuggestions,
            newOfferForm,
            comparisonResults,
            bestPrice,
            hideSuggestions,
            selectMaterial,
            clearSelection,
            addManualOffer,
            addVendorRow,
            removeVendorRow,
            clearManualOffers,
            formatCurrency,
            calculateSavings
        };
    }
}).mount('#app');