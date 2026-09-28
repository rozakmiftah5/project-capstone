const { createApp, ref, onMounted } = Vue;

createApp({
    setup() {
        const searchInput = ref('');
        const result = ref(null);
        const hasSearched = ref(false);

        function checkPrice() {
            if (!searchInput.value) return;
            
            const poData = typeof getPOData === 'function' ? getPOData() : [];
            const materialData = typeof getMaterialData === 'function' ? getMaterialData() : [];
            
            hasSearched.value = true;
            
            // 1. Cari info nama material
            const materialInfo = materialData.find(m => m.kode === searchInput.value);
            
            // 2. Cari riwayat PO untuk material tersebut
            const history = poData.filter(p => p.kodeMaterial === searchInput.value);
            
            if (history.length > 0) {
                // Urutkan berdasarkan tanggal terbaru
                history.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
                const latest = history[0];
                
                result.value = {
                    found: true,
                    kode: searchInput.value,
                    nama: materialInfo ? materialInfo.shortText : 'Nama Material Tidak Ditemukan',
                    materialGroup: materialInfo ? materialInfo.materialGroup : '-',
                    materialType: materialInfo ? materialInfo.materialType : '-',
                    harga: latest.harga,
                    tanggal: latest.tanggal,
                    vendor: latest.vendor
                };
            } else {
                result.value = { found: false };
            }
        }

        function formatCurrency(val) {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
        }

        onMounted(() => {
            if (typeof initGlobalUI === 'function') initGlobalUI();
            if (typeof syncPODataFromExcel === 'function') syncPODataFromExcel();
            if (typeof syncMaterialDataFromExcel === 'function') syncMaterialDataFromExcel();
        });

        return {
            searchInput,
            result,
            hasSearched,
            checkPrice,
            formatCurrency
        };
    }
}).mount('#app');