// ==UserScript==
// @name         Kolorowanie statusów
// @namespace    http://tampermonkey.net/
// @version      14.0-FINAL-DRAGGABLE
// @description  Klasyczny interfejs, natywne Ulubione oraz okno, które można przesuwać
// @author       Twój Nick
// @match        https://*.sellasist.pl/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    let config = GM_getValue('statusConfig', {});
    let editingStatus = null;

    // --- FUNKCJA POMOCNICZA ---
    function getColorsFor(statusName) {
        const data = config[statusName];
        if (!data) return { bg: '#ffeb3b', text: '#000000', fav: false };
        if (typeof data === 'string') return { bg: data, text: '#000000', fav: false };
        return {
            bg: data.bg || '#ffeb3b',
            text: data.text || '#000000',
            fav: !!data.fav
        };
    }

    // --- CSS ---
    GM_addStyle(`
        #custom-status-settings {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #ffffff; padding: 0; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.4);
            z-index: 999999; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            width: 650px; max-width: 95vw; color: #333; display: none; border: 1px solid #ddd;
        }

        /* Dodano cursor i user-select dla drag & drop */
        .css-header { background: #343a40; color: white; padding: 15px 20px; font-size: 18px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; cursor: grab; user-select: none; }
        .css-header:active { cursor: grabbing; }

        .css-body { padding: 20px; }
        .css-section-title { font-size: 13px; text-transform: uppercase; color: #6c757d; font-weight: 700; margin-bottom: 10px; letter-spacing: 0.5px; }

        #status-list { max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; padding: 5px; margin-bottom: 20px; background: #fafafa; }
        .status-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid #eee; transition: background 0.2s;}
        .status-row:last-child { border-bottom: none; }
        .status-row:hover { background: #f0f0f0; }
        .status-actions { display: flex; gap: 5px; align-items: center; }

        .css-form { background: #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #dee2e6; }
        .css-form-row { display: flex; gap: 10px; align-items: center; flex-wrap: nowrap; }
        .css-form select { border: 1px solid #ced4da; border-radius: 4px; padding: 6px; font-size: 14px; outline: none; }
        .css-form select:focus { border-color: #80bdff; box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25); }
        .css-form select.main-select { flex-grow: 1; min-width: 200px; }
        .css-form select.text-select { width: 140px; flex-shrink: 0; padding-right: 25px; cursor: pointer; }

        .fav-checkbox-label {
            display: flex; align-items: center; justify-content: center;
            width: 38px; height: 38px; border-radius: 4px; cursor: pointer;
            border: 1px solid #ced4da; background: #fff; transition: all 0.2s; flex-shrink: 0; box-sizing: border-box;
        }
        .fav-checkbox-label:hover { background: #f8f9fa; }
        .fav-checkbox-label input:checked + svg { fill: #ffc107; stroke: #ffc107; }
        .fav-checkbox-label svg { width: 20px; height: 20px; fill: none; stroke: #6c757d; stroke-width: 2; transition: all 0.2s; }

        .css-form input[type="color"] {
            width: 38px !important; min-width: 38px !important; height: 38px !important;
            padding: 0 !important; margin: 0 !important; cursor: pointer; flex-shrink: 0 !important;
            border: 1px solid #ced4da !important; border-radius: 4px !important; box-sizing: border-box !important;
        }

        .css-preview { margin-top: 15px; padding: 10px; border-radius: 4px; text-align: center; font-weight: bold; font-size: 14px; border: 1px dashed #adb5bd; }

        .btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; }
        .btn-primary { background: #0d6efd; color: white; }
        .btn-primary:hover { background: #0b5ed7; }
        .btn-success { background: #198754; color: white; padding: 8px 15px; }
        .btn-success:hover { background: #157347; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-danger:hover { background: #bb2d3b; }
        .btn-warning { background: #ffc107; color: black; }
        .btn-warning:hover { background: #ffca2c; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-secondary:hover { background: #5c636a; }
        .btn-close { background: transparent; color: white; font-size: 20px; border: none; cursor: pointer; line-height: 1; padding: 0; margin: 0; }
        .btn-close:hover { color: #ccc; }

        .fav-quick-btn { background: transparent; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; border-radius: 4px; transition: 0.2s;}
        .fav-quick-btn:hover { background: #e2e8f0; }

        .css-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 15px; margin-top: 10px; }
        .css-advanced { display: flex; gap: 8px; }

        .color-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 13px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

        /* MAGIA DLA SELECT2 */
        li.select2-results__option.custom-colored-status { background-color: var(--status-bg) !important; color: var(--status-text) !important; }
        li.select2-results__option.custom-colored-status span { color: var(--status-text) !important; }
        li.select2-results__option.custom-colored-status:hover { filter: brightness(0.85) !important; }
    `);

    // --- HTML ---
    const panel = document.createElement('div');
    panel.id = 'custom-status-settings';
    panel.innerHTML = `
        <div class="css-header" id="drag-header">
            <span>⚙️ Mapowanie Statusów</span>
            <button class="btn-close" id="close-x-btn">&times;</button>
        </div>
        <div class="css-body">

            <div class="css-section-title">Dodaj / Edytuj Status</div>
            <div class="css-form">
                <div class="css-form-row">
                    <select id="new-status-select" class="main-select">
                        <option value="" disabled selected>Wybierz z listy...</option>
                    </select>

                    <label class="fav-checkbox-label" title="Dodaj do Ulubionych">
                        <input type="checkbox" id="new-status-fav" style="display:none;">
                        <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    </label>

                    <input type="color" id="new-status-bg" value="#ffeb3b" title="Kolor tła">
                    <select id="new-status-text" class="text-select" title="Kolor tekstu">
                        <option value="#000000" selected>Czarny tekst</option>
                        <option value="#ffffff">Biały tekst</option>
                    </select>
                    <button id="add-status-btn" class="btn btn-success">Zapisz</button>
                    <button id="cancel-edit-btn" class="btn btn-secondary" style="display:none;">Anuluj</button>
                </div>
                <div id="live-preview" class="css-preview" style="background-color: #ffeb3b; color: #000000;">Podgląd na żywo</div>
            </div>

            <div class="css-section-title">Twoje Mapowania (<span id="count-badge">0</span>)</div>
            <div id="status-list"></div>

            <div class="css-footer">
                <div class="css-advanced">
                    <button id="export-btn" class="btn btn-secondary" title="Kopiuj ustawienia">Eksport</button>
                    <button id="import-btn" class="btn btn-secondary" title="Wklej ustawienia">Import</button>
                    <button id="clear-btn" class="btn btn-danger" title="Usuń wszystko">Wyczyść</button>
                </div>
                <button id="close-settings-btn" class="btn btn-primary">Gotowe</button>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // --- LOGIKA DRAG & DROP (PRZESUWANIE OKNA) ---
    const dragHeader = document.getElementById('drag-header');
    let isDragging = false;
    let offsetX, offsetY;

    dragHeader.addEventListener('mousedown', function(e) {
        // Ignoruj kliknięcie jeśli trafiono w przycisk zamknięcia
        if (e.target.closest('.btn-close')) return;

        isDragging = true;

        // Pobieramy aktualne wymiary i pozycję
        const rect = panel.getBoundingClientRect();

        // Wyłączamy transformację (-50%, -50%), zamieniając ją na stałe pozycje px
        if (panel.style.transform !== 'none') {
            panel.style.transform = 'none';
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
        }

        // Obliczamy różnicę między kursorem a krawędzią okna
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault(); // Blokuje zaznaczanie tekstu podczas przeciągania
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        panel.style.left = (e.clientX - offsetX) + 'px';
        panel.style.top = (e.clientY - offsetY) + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    // --- LOGIKA USTAWIEŃ ---
    const elSelect = document.getElementById('new-status-select');
    const elBg = document.getElementById('new-status-bg');
    const elText = document.getElementById('new-status-text');
    const elFav = document.getElementById('new-status-fav');
    const elPreview = document.getElementById('live-preview');
    const elSaveBtn = document.getElementById('add-status-btn');
    const elCancelBtn = document.getElementById('cancel-edit-btn');

    function updatePreview() {
        const text = elSelect.options[elSelect.selectedIndex]?.text || "Wybierz status...";
        const favIcon = elFav.checked ? "⭐ " : "";
        elPreview.textContent = text !== "Wybierz z listy..." ? (favIcon + text) : "Podgląd statusu";
        elPreview.style.backgroundColor = elBg.value;
        elPreview.style.color = elText.value;
    }

    elSelect.addEventListener('change', updatePreview);
    elBg.addEventListener('input', updatePreview);
    elText.addEventListener('change', updatePreview);
    elFav.addEventListener('change', updatePreview);

    function loadStatusesFromSelect() {
        const selectElement = document.querySelector('select.js-icon-list-button-select[data-element-id="Zmień status"]');
        if (!selectElement) return [];
        const options = selectElement.querySelectorAll('option');
        const statuses = [];
        options.forEach(opt => {
            const text = opt.textContent.trim();
            if (text && !statuses.includes(text)) statuses.push(text);
        });
        return statuses.sort();
    }

    function updateDropdown() {
        elSelect.innerHTML = '<option value="" disabled selected>Wybierz z listy...</option>';
        const availableStatuses = loadStatusesFromSelect();

        if (availableStatuses.length === 0) {
            elSelect.innerHTML = '<option value="" disabled selected>Brak statusów na stronie</option>';
            return;
        }

        availableStatuses.forEach(status => {
            const opt = document.createElement('option');
            opt.value = status;
            opt.textContent = status;
            elSelect.appendChild(opt);
        });
    }

    function renderConfiguredList() {
        const listContainer = document.getElementById('status-list');
        listContainer.innerHTML = '';

        const entries = Object.keys(config);
        document.getElementById('count-badge').textContent = entries.length;

        if (entries.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding: 15px; color:#999;">Brak dodanych statusów.</div>';
            return;
        }

        entries.forEach(statusName => {
            const colors = getColorsFor(statusName);
            const starColor = colors.fav ? '#ffc107' : 'none';
            const starStroke = colors.fav ? '#ffc107' : '#6c757d';

            const row = document.createElement('div');
            row.className = 'status-row';
            row.innerHTML = `
                <div><span class="color-badge" style="background-color: ${colors.bg}; color: ${colors.text};">${statusName}</span></div>
                <div class="status-actions">
                    <button class="fav-quick-btn" data-name="${statusName}" title="Przełącz ulubione">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="${starColor}" stroke="${starStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </button>
                    <button class="btn btn-warning edit-btn" data-name="${statusName}">Edytuj</button>
                    <button class="btn btn-danger del-btn" data-name="${statusName}">Usuń</button>
                </div>
            `;
            listContainer.appendChild(row);
        });

        listContainer.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                delete config[this.dataset.name];
                if(editingStatus === this.dataset.name) resetForm();
                saveData();
            });
        });

        listContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() { startEditing(this.dataset.name); });
        });

        listContainer.querySelectorAll('.fav-quick-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const name = this.dataset.name;
                config[name].fav = !config[name].fav;
                saveData();
            });
        });
    }

    function startEditing(statusName) {
        editingStatus = statusName;
        const colors = getColorsFor(statusName);

        if (!Array.from(elSelect.options).some(opt => opt.value === statusName)) {
            const opt = document.createElement('option');
            opt.value = statusName;
            opt.textContent = statusName;
            elSelect.appendChild(opt);
        }

        elSelect.value = statusName;
        elSelect.disabled = true;

        elBg.value = /^#[0-9A-Fa-f]{6}$/i.test(colors.bg) ? colors.bg : '#ffeb3b';
        elText.value = colors.text === '#ffffff' ? '#ffffff' : '#000000';
        elFav.checked = colors.fav;

        elSaveBtn.textContent = "Aktualizuj";
        elSaveBtn.classList.replace('btn-success', 'btn-primary');
        elCancelBtn.style.display = "inline-block";
        updatePreview();
    }

    function resetForm() {
        editingStatus = null;
        elSelect.disabled = false;
        elSelect.value = "";
        elBg.value = "#ffeb3b";
        elText.value = "#000000";
        elFav.checked = false;
        elSaveBtn.textContent = "Zapisz";
        elSaveBtn.classList.replace('btn-primary', 'btn-success');
        elCancelBtn.style.display = "none";
        updatePreview();
    }

    function saveData() {
        GM_setValue('statusConfig', config);
        renderConfiguredList();
        applyColorsToSelect2();
    }

    elSaveBtn.addEventListener('click', () => {
        const statusName = elSelect.value;
        if (!statusName) { alert("Wybierz status!"); return; }

        config[statusName] = {
            bg: elBg.value,
            text: elText.value,
            fav: elFav.checked
        };

        resetForm();
        saveData();
    });

    elCancelBtn.addEventListener('click', resetForm);

    document.getElementById('export-btn').addEventListener('click', () => {
        const json = JSON.stringify(config);
        prompt("Skopiuj poniższy kod, aby zapisać ustawienia:", json);
    });

    document.getElementById('import-btn').addEventListener('click', () => {
        const input = prompt("Wklej kod ustawień (uwaga: obecne ustawienia zostaną nadpisane):");
        if (input) {
            try {
                const parsed = JSON.parse(input);
                if(typeof parsed === 'object') {
                    config = parsed;
                    saveData();
                    alert("Import zakończony sukcesem!");
                }
            } catch (e) { alert("Błąd importu. Nieprawidłowy kod."); }
        }
    });

    document.getElementById('clear-btn').addEventListener('click', () => {
        if(confirm("Czy na pewno chcesz usunąć WSZYSTKIE mapowania kolorów?")) {
            config = {};
            resetForm();
            saveData();
        }
    });

    const closeUI = () => { panel.style.display = 'none'; resetForm(); };
    document.getElementById('close-settings-btn').addEventListener('click', closeUI);
    document.getElementById('close-x-btn').addEventListener('click', closeUI);

    GM_registerMenuCommand("⚙️ Mapowanie kolorów statusów", () => {
        updateDropdown();
        renderConfiguredList();
        updatePreview();

        // Zawsze pokazujemy panel
        panel.style.display = 'block';

        // Resetujemy pozycję na środek za każdym razem, gdy użytkownik wywołuje menu z Tampermonkey
        panel.style.transform = 'translate(-50%, -50%)';
        panel.style.left = '50%';
        panel.style.top = '50%';
    });

    // --- LOGIKA SELECT2 (KOLORY + ULUBIONE W 100% NATYWNYM STYLU) ---
    function applyColorsToSelect2() {
        const resultsContainer = document.querySelector('ul.select2-results__options[role="listbox"]');
        if (!resultsContainer) return;

        // 1. TWORZENIE GRUPY ULUBIONE
        if (!resultsContainer.querySelector('[data-custom-group="favorites"]')) {
            const allOptions = Array.from(resultsContainer.querySelectorAll('li.select2-results__option[role="option"]'));

            const favOptions = allOptions.filter(li => {
                const text = li.textContent.trim();
                const settings = config[text];
                return settings && settings.fav;
            });

            if (favOptions.length > 0) {
                const favGroup = document.createElement('li');
                favGroup.className = 'select2-results__option select2-results__option--group';
                favGroup.setAttribute('role', 'group');
                favGroup.setAttribute('aria-label', '⭐ Ulubione');
                favGroup.dataset.customGroup = 'favorites';

                favGroup.innerHTML = `
                    <strong class="select2-results__group"><span>⭐ Ulubione</span></strong>
                    <ul class="select2-results__options select2-results__options--nested" role="none"></ul>
                `;

                const nestedUl = favGroup.querySelector('ul');

                favOptions.forEach(opt => {
                    nestedUl.appendChild(opt);
                });

                resultsContainer.insertBefore(favGroup, resultsContainer.firstChild);

                // Ukrywanie pustych oryginalnych grup
                resultsContainer.querySelectorAll('li.select2-results__option--group:not([data-custom-group="favorites"])').forEach(group => {
                    const nested = group.querySelector('ul.select2-results__options--nested');
                    if (nested && nested.children.length === 0) {
                        group.style.display = 'none';
                    }
                });
            }
        }

        // 2. KOLOROWANIE ELEMENTÓW
        const renderedOptions = document.querySelectorAll('li.select2-results__option[role="option"]');
        renderedOptions.forEach(li => {
            const text = li.textContent.trim();
            const settings = config[text];

            if (settings) {
                li.classList.add('custom-colored-status');
                li.style.setProperty('--status-bg', settings.bg);
                li.style.setProperty('--status-text', settings.text);
            } else {
                li.classList.remove('custom-colored-status');
                li.style.removeProperty('--status-bg');
                li.style.removeProperty('--status-text');
            }
        });
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                applyColorsToSelect2();
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();