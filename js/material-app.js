const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        const materials = ref([]);
        const searchQuery = ref('');
        const isLoading = ref(false);

        const filteredData = computed(() => {
            const data = materials.value || [];
            if (!searchQuery.value) return data;
            const q = searchQuery.value.toLowerCase();
            return data.filter(m => 
                m.kode.toLowerCase().includes(q) || 
                m.shortText.toLowerCase().includes(q) || 
                (m.materialGroup && m.materialGroup.toLowerCase().includes(q)) ||
                (m.materialType && m.materialType.toLowerCase().includes(q)) ||
                m.valuationClass.toLowerCase().includes(q)
            );
        });

        function loadData() {
            const storedData = typeof getMaterialData === 'function' ? getMaterialData() : [];
            materials.value = Array.isArray(storedData) ? storedData : [];
        }

        // Fungsi untuk mengambil file Excel secara otomatis dari folder data
        async function autoLoadFromExcel() {
            const currentData = materials.value || [];
            if (currentData.length === 0) isLoading.value = true;
            try {
                materials.value = await syncMaterialDataFromExcel();
            } catch (error) {
                console.error("Gagal Sinkronisasi Otomatis:", error.message);
                if (window.location.protocol === 'file:') {
                    console.warn("Peringatan: Browser memblokir pengambilan file otomatis jika Anda membuka HTML secara langsung. Gunakan Live Server.");
                }
            } finally {
                isLoading.value = false;
            }
        }

        // Fitur Sinkronisasi Manual dengan memilih file Excel langsung
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
                            const syncedData = parseMaterialExcelRows(jsonData);
                            materials.value = syncedData;
                            saveMaterialData(syncedData);
                            alert(`Sinkronisasi Berhasil! ${syncedData.length} data material telah diperbarui.`);
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

        // Fungsi untuk menyalin teks ke clipboard
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert(`Kode Material "${text}" berhasil disalin!`);
            }).catch(err => {
                console.error('Gagal menyalin teks: ', err);
                alert('Gagal menyalin kode material. Silakan coba lagi.');
            });
        }

        onMounted(() => {
            loadData(); // Ambil dari local storage dulu
            autoLoadFromExcel(); // Jalankan sinkronisasi otomatis
            // Sinkronisasi ulang setiap 60 detik
            setInterval(autoLoadFromExcel, 60000);
            if (typeof initGlobalUI === 'function') initGlobalUI();
        });

        return {
            materials,
            searchQuery,
            filteredData,
            isLoading,
            manualSync,
            autoLoadFromExcel,
            copyToClipboard // Tambahkan fungsi copy ke return
        };
    }
}).mount('#app');