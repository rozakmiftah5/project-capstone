(function () {
    const DRAFT_KEY = 'MM_MATERIAL_REQUEST_DRAFT';
    const REQUESTS_KEY = 'MM_MATERIAL_REQUESTS';
    const form = document.getElementById('material-request-form');
    const itemsContainer = document.getElementById('material-request-items');
    const lineTemplate = document.getElementById('material-line-template');
    const status = document.getElementById('request-status');
    const submitButton = document.getElementById('submit-material-request');
    const referenceOptions = { mtart: [], meins: [], purchasingGroup: [], matkl: [], bklas: [] };
    let requestSubmitted = false;

    function parseReferenceOption(value, group = '') {
        if (value === '' || value === null || value === undefined) return null;
        const label = String(value).trim();
        const match = label.match(/^([^\s]+)/);
        if (!match) return null;
        return {
            value: match[1],
            label: group ? `${label} - ${group}` : label
        };
    }

    async function loadReferenceOptions() {
        const response = await fetch('assets/Form%20LPPM.xlsx');
        if (!response.ok) throw new Error('Template referensi Form LPPM tidak dapat dibuka.');
        const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
        const referenceSheet = workbook.Sheets.REFERENCE;
        if (!referenceSheet) throw new Error('Sheet REFERENCE tidak ditemukan pada template.');

        const rows = XLSX.utils.sheet_to_json(referenceSheet, { header: 1, defval: '', blankrows: false }).slice(2);
        const optionsByField = { mtart: new Map(), meins: new Map(), purchasingGroup: new Map(), matkl: new Map(), bklas: new Map() };
        rows.forEach(row => {
            const materialType = parseReferenceOption(row[1]);
            const unit = parseReferenceOption(row[4]);
            const purchasingGroup = parseReferenceOption(row[7]);
            const materialGroup = parseReferenceOption(row[10]);
            const valuationClass = parseReferenceOption(row[14], row[13]);
            [
                ['mtart', materialType],
                ['meins', unit],
                ['purchasingGroup', purchasingGroup],
                ['matkl', materialGroup],
                ['bklas', valuationClass]
            ].forEach(([field, option]) => {
                if (option && !optionsByField[field].has(option.value)) {
                    optionsByField[field].set(option.value, option);
                }
            });
        });

        Object.entries(optionsByField).forEach(([field, options]) => {
            referenceOptions[field] = [...options.values()];
        });

        return Object.values(optionsByField).reduce((sum, options) => sum + options.size, 0);
    }

    function createMaterialLine(values = {}) {
        const fragment = lineTemplate.content.cloneNode(true);
        const line = fragment.querySelector('.request-item');
        line.querySelectorAll('[data-field]').forEach(input => {
            const field = input.dataset.field;
            if (input.tagName === 'SELECT') {
                referenceOptions[field].forEach(option => input.add(new Option(option.label, option.value)));
            }
            if (Object.prototype.hasOwnProperty.call(values, field)) {
                if (input.tagName === 'SELECT' && values[field] && ![...input.options].some(option => option.value === String(values[field]))) {
                    input.add(new Option(`${values[field]} (draf lama)`, values[field]));
                }
                input.value = values[field];
            }
        });
        line.querySelector('[data-remove-item]').addEventListener('click', () => {
            if (itemsContainer.children.length > 1) {
                line.remove();
                updateItemTitles();
                saveDraft(false);
            }
        });
        itemsContainer.appendChild(fragment);
        updateItemTitles();
    }

    function updateItemTitles() {
        itemsContainer.querySelectorAll('.request-item').forEach((item, index) => {
            item.querySelector('[data-item-title]').textContent = `Material ${index + 1}`;
            item.querySelector('[data-remove-item]').disabled = itemsContainer.children.length === 1;
        });
    }

    function collectFormData() {
        const metadata = Object.fromEntries(new FormData(form).entries());
        const materials = [...itemsContainer.querySelectorAll('.request-item')].map(item => {
            const values = {};
            item.querySelectorAll('[data-field]').forEach(input => { values[input.dataset.field] = input.value.trim(); });
            return values;
        });
        return { metadata, materials };
    }

    function saveDraft(showStatus = true) {
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(collectFormData()));
            if (showStatus) status.textContent = 'Draf tersimpan di browser ini.';
        } catch (error) {
            status.textContent = 'Draf tidak dapat disimpan di browser ini.';
        }
    }

    function submitMaterialRequest() {
        if (!form.reportValidity()) return;

        const { metadata, materials } = collectFormData();
        if (!materials.length) {
            status.textContent = 'Tambahkan minimal satu material sebelum mengirim.';
            return;
        }

        let activeUser = null;
        try {
            activeUser = JSON.parse(localStorage.getItem('activeUser') || 'null');
        } catch (error) {
            activeUser = null;
        }

        try {
            const requests = JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]');
            const request = {
                id: `LPPM-${Date.now()}`,
                submittedAt: new Date().toISOString(),
                requester: activeUser?.nama || activeUser?.email || 'Pengguna',
                status: 'new',
                read: false,
                metadata,
                materials
            };
            const storedRequests = Array.isArray(requests) ? requests : [];
            storedRequests.unshift(request);
            localStorage.setItem(REQUESTS_KEY, JSON.stringify(storedRequests));
            window.dispatchEvent(new CustomEvent('material-request-submitted', { detail: request }));
            localStorage.removeItem(DRAFT_KEY);
            requestSubmitted = true;
            submitButton.disabled = true;
            status.textContent = 'Pengajuan terkirim. Notifikasi tersedia di dashboard admin pada browser ini.';
        } catch (error) {
            status.textContent = 'Pengajuan gagal disimpan. Periksa penyimpanan browser lalu coba lagi.';
        }
    }

    function restoreDraft() {
        try {
            const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
            if (!draft) return false;

            Object.entries(draft.metadata || {}).forEach(([name, value]) => {
                const input = form.elements.namedItem(name);
                if (input) input.value = value;
            });
            itemsContainer.replaceChildren();
            (draft.materials || []).forEach(material => createMaterialLine(material));
            return itemsContainer.children.length > 0;
        } catch (error) {
            return false;
        }
    }

    function setCell(sheet, address, value, numeric = false) {
        if (value === '' || value === null || value === undefined) {
            delete sheet[address];
            return;
        }
        const cell = sheet[address] || {};
        cell.v = numeric ? Number(value) : String(value);
        cell.t = numeric ? 'n' : 's';
        sheet[address] = cell;
    }

    function setDateCell(sheet, address, dateValue) {
        if (!dateValue) {
            delete sheet[address];
            return;
        }
        const date = new Date(`${dateValue}T00:00:00`);
        const cell = sheet[address] || {};
        cell.v = Math.floor(date.getTime() / 86400000) + 25569;
        cell.t = 'n';
        cell.z = 'dd/mm/yyyy';
        sheet[address] = cell;
    }

    function clearCellValue(sheet, address) {
        const cell = sheet[address];
        if (!cell) return;
        Object.keys(cell).forEach(key => {
            if (key !== 's') delete cell[key];
        });
        cell.t = 'z';
    }

    async function downloadFilledWorkbook() {
        if (!form.reportValidity()) return;

        const { metadata, materials } = collectFormData();
        if (materials.length === 0) {
            status.textContent = 'Tambahkan minimal satu material.';
            return;
        }

        const button = document.getElementById('download-request');
        button.disabled = true;
        status.textContent = 'Menyiapkan Form LPPM...';

        try {
            const response = await fetch('assets/Form%20LPPM.xlsx');
            if (!response.ok) throw new Error('Template Form LPPM tidak dapat dibuka.');
            const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array', cellStyles: true });
            const sheet = workbook.Sheets.FORM;
            if (!sheet) throw new Error('Sheet FORM tidak ditemukan pada template.');

            setCell(sheet, 'C3', metadata.nomorSurat);
            setCell(sheet, 'C4', metadata.divisiPeminta);
            setCell(sheet, 'C5', metadata.dinasPeminta);
            setDateCell(sheet, 'C6', metadata.tanggal);

            for (let row = 12; row <= 21; row += 1) {
                for (let column = 0; column < 18; column += 1) {
                    clearCellValue(sheet, XLSX.utils.encode_cell({ r: row - 1, c: column }));
                }
            }

            const columnFields = [
                'mtart', 'werks', 'lgort', 'maktx', 'meins', 'purchasingGroup', 'matkl', 'dismm',
                'mtvfp', 'sernp', 'prctr', 'bklas', 'vprsv', 'peinh', 'verpr', 'bwtty', 'longText', null
            ];
            materials.forEach((material, index) => {
                const row = 12 + index;
                columnFields.forEach((field, column) => {
                    if (!field) return;
                    const value = material[field];
                    const address = XLSX.utils.encode_cell({ r: row - 1, c: column });
                    setCell(sheet, address, value, field === 'peinh' || field === 'verpr');
                });
            });

            const noteRow = Math.max(20, 12 + materials.length + 1);
            setCell(sheet, `A${noteRow}`, 'Keterangan:');
            setCell(sheet, `A${noteRow + 1}`, '*) Mandatory / Wajib Diisi');
            const range = XLSX.utils.decode_range(sheet['!ref']);
            range.e.r = Math.max(range.e.r, noteRow);
            sheet['!ref'] = XLSX.utils.encode_range(range);

            const safeNumber = (metadata.nomorSurat || 'Pengajuan').replace(/[^a-zA-Z0-9_-]/g, '_');
            XLSX.writeFile(workbook, `Form_LPPM_${safeNumber}.xlsx`);
            saveDraft(false);
            status.textContent = 'Form Excel berhasil diunduh. File ini belum dikirim ke SAP.';
        } catch (error) {
            status.textContent = `${error.message} Buka aplikasi melalui server lokal untuk mengisi template.`;
        } finally {
            button.disabled = false;
        }
    }

    document.getElementById('add-material-row').addEventListener('click', () => {
        createMaterialLine();
        requestSubmitted = false;
        submitButton.disabled = false;
        saveDraft(false);
    });
    document.getElementById('save-request-draft').addEventListener('click', () => saveDraft());
    submitButton.addEventListener('click', submitMaterialRequest);
    document.getElementById('download-request').addEventListener('click', downloadFilledWorkbook);
    form.addEventListener('input', () => {
        if (requestSubmitted) {
            requestSubmitted = false;
            submitButton.disabled = false;
        }
        saveDraft(false);
    });

    async function initializeForm() {
        try {
            const optionCount = await loadReferenceOptions();
            if (!restoreDraft()) createMaterialLine();
            status.textContent = `${optionCount} pilihan referensi dimuat dari Form LPPM.`;
        } catch (error) {
            if (!restoreDraft()) createMaterialLine();
            status.textContent = `${error.message} Periksa akses ke assets/Form LPPM.xlsx.`;
        }
    }

    initializeForm();
})();