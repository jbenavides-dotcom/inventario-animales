/**
 * db.js — Capa de datos con Google Sheets backend
 * Inventario de Animales LP&ET
 *
 * Estrategia: Google Sheets (via Apps Script) como fuente de verdad.
 * Cache local en localStorage para velocidad.
 * Fallback a localStorage si no hay URL de Apps Script.
 */

const DB = (function() {
    // ============================================
    // CONFIGURACIÓN — Pegar aquí la URL del Apps Script
    // ============================================
    let APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxwKiUh0b3jQFyjSfvGTuGkXv7X3EQywgZYndPovAUl-lYlvmsjW42WJ89IgEt3ZuxR/exec';

    // Intentar leer URL guardada en localStorage
    const savedUrl = localStorage.getItem('inv_apps_script_url');
    if (savedUrl) APPS_SCRIPT_URL = savedUrl;

    const COLLECTIONS = ['animales', 'ordenes', 'actividades', 'costos', 'huevos'];

    const PREFIXES = {
        animales: 'ANI',
        ordenes: 'ORD',
        actividades: 'ACT',
        costos: 'COS',
        huevos: 'HUE'
    };

    // Cache local
    let _cache = {
        animales: null,
        ordenes: null,
        actividades: null,
        costos: null,
        huevos: null
    };
    let _cacheTimestamp = 0;
    const CACHE_TTL = 30000; // 30 segundos

    // ── Helpers ──

    function isOnline() {
        return APPS_SCRIPT_URL && APPS_SCRIPT_URL.length > 0;
    }

    function collectionToSheet(collection) {
        return collection.charAt(0).toUpperCase() + collection.slice(1);
    }

    function _localKey(collection) {
        return 'inv_' + collection;
    }

    function _getLocal(collection) {
        try {
            const raw = localStorage.getItem(_localKey(collection));
            return raw ? JSON.parse(raw) : [];
        } catch(e) {
            return [];
        }
    }

    function _saveLocal(collection, data) {
        try {
            localStorage.setItem(_localKey(collection), JSON.stringify(data));
        } catch(e) {
            console.error('Error guardando local:', e);
        }
    }

    // ── Comunicación con Apps Script ──

    async function _fetchGet(params) {
        const url = new URL(APPS_SCRIPT_URL);
        Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error('Error HTTP: ' + response.status);
        return await response.json();
    }

    async function _fetchPost(body) {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // text/plain para evitar CORS preflight
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('Error HTTP: ' + response.status);
        return await response.json();
    }

    // ── Sync: descargar todo desde Sheets ──

    async function syncFromSheets() {
        if (!isOnline()) return false;
        try {
            const result = await _fetchGet({ action: 'getAll' });
            if (result.success && result.data) {
                COLLECTIONS.forEach(col => {
                    if (Array.isArray(result.data[col])) {
                        _saveLocal(col, result.data[col]);
                        _cache[col] = result.data[col];
                    }
                });
                _cacheTimestamp = Date.now();
                return true;
            }
            return false;
        } catch(err) {
            console.warn('Error sincronizando desde Sheets:', err);
            return false;
        }
    }

    // ── CRUD ──

    function getData(collection) {
        // Primero intenta cache en memoria
        if (_cache[collection] && (Date.now() - _cacheTimestamp < CACHE_TTL)) {
            return _cache[collection];
        }
        // Si no hay cache válida, lee localStorage
        const data = _getLocal(collection);
        _cache[collection] = data;
        return data;
    }

    function saveData(collection, data) {
        _saveLocal(collection, data);
        _cache[collection] = data;
    }

    function getNextId(collection) {
        const prefix = PREFIXES[collection];
        if (!prefix) return null;
        const items = getData(collection);
        let maxNum = 0;
        items.forEach(item => {
            if (item.id) {
                const parts = item.id.split('-');
                const num = parseInt(parts[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        return prefix + '-' + String(maxNum + 1).padStart(3, '0');
    }

    async function addItem(collection, item) {
        // Generar ID local
        item.id = getNextId(collection);

        // Guardar localmente primero (optimistic)
        const data = getData(collection);
        data.push(item);
        saveData(collection, data);

        // Sincronizar con Sheets
        if (isOnline()) {
            try {
                const result = await _fetchPost({
                    action: 'add',
                    sheet: collectionToSheet(collection),
                    data: item
                });
                if (result.success && result.id) {
                    // Si el server asignó otro ID, actualizar
                    if (result.id !== item.id) {
                        item.id = result.id;
                        saveData(collection, data);
                    }
                }
            } catch(err) {
                console.warn('Error enviando a Sheets (guardado local OK):', err);
            }
        }

        return item;
    }

    async function updateItem(collection, id, updates) {
        // Actualizar localmente primero
        const data = getData(collection);
        const idx = data.findIndex(item => item.id === id);
        if (idx === -1) return null;
        Object.assign(data[idx], updates);
        saveData(collection, data);

        // Sincronizar con Sheets
        if (isOnline()) {
            try {
                await _fetchPost({
                    action: 'update',
                    sheet: collectionToSheet(collection),
                    id: id,
                    data: updates
                });
            } catch(err) {
                console.warn('Error actualizando en Sheets (guardado local OK):', err);
            }
        }

        return data[idx];
    }

    async function deleteItem(collection, id) {
        // Eliminar localmente
        const data = getData(collection);
        const filtered = data.filter(item => item.id !== id);
        if (filtered.length === data.length) return false;
        saveData(collection, filtered);

        // Sincronizar con Sheets
        if (isOnline()) {
            try {
                await _fetchPost({
                    action: 'delete',
                    sheet: collectionToSheet(collection),
                    id: id
                });
            } catch(err) {
                console.warn('Error eliminando en Sheets (guardado local OK):', err);
            }
        }

        return true;
    }

    function getById(collection, id) {
        const data = getData(collection);
        return data.find(item => item.id === id) || null;
    }

    function filter(collection, filters) {
        const data = getData(collection);
        const keys = Object.keys(filters);
        return data.filter(item => {
            return keys.every(key => {
                const val = filters[key];
                if (val === '' || val === null || val === undefined) return true;
                const itemVal = String(item[key] || '').toLowerCase();
                return itemVal.indexOf(String(val).toLowerCase()) !== -1;
            });
        });
    }

    // ── Import / Export ──

    function exportJSON() {
        const db = {};
        COLLECTIONS.forEach(col => {
            db[col] = getData(col);
        });
        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventario-animales-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importJSON(file) {
        return new Promise((resolve, reject) => {
            if (!file) return reject(new Error('No se proporcionó archivo'));
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    const valid = COLLECTIONS.every(col => Array.isArray(data[col]));
                    if (!valid) {
                        return reject(new Error('Estructura inválida. Debe contener: ' + COLLECTIONS.join(', ')));
                    }
                    // Guardar localmente
                    COLLECTIONS.forEach(col => saveData(col, data[col]));

                    // Si está online, sincronizar cada registro
                    // (No sincronizamos masivamente por ahora, solo local)
                    // Se puede hacer sync manual después

                    resolve(data);
                } catch(err) {
                    reject(new Error('Error parseando JSON: ' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('Error leyendo archivo'));
            reader.readAsText(file);
        });
    }

    function clearAll() {
        COLLECTIONS.forEach(col => {
            localStorage.removeItem(_localKey(col));
            _cache[col] = null;
        });
    }

    async function loadSampleData() {
        const isEmpty = COLLECTIONS.every(col => getData(col).length === 0);
        if (!isEmpty) return false;

        try {
            const res = await fetch('data/sample-data.json');
            if (!res.ok) throw new Error('No se pudo cargar sample-data.json');
            const data = await res.json();
            COLLECTIONS.forEach(col => {
                if (Array.isArray(data[col])) {
                    saveData(col, data[col]);
                }
            });
            return true;
        } catch(err) {
            console.error('Error cargando datos de ejemplo:', err);
            return false;
        }
    }

    // ── Configuración de URL ──

    function setAppsScriptUrl(url) {
        APPS_SCRIPT_URL = url;
        localStorage.setItem('inv_apps_script_url', url);
    }

    function getAppsScriptUrl() {
        return APPS_SCRIPT_URL;
    }

    function isConnected() {
        return isOnline();
    }

    // ── API pública ──

    return {
        getData,
        saveData,
        addItem,         // ahora async
        updateItem,      // ahora async
        deleteItem,      // ahora async
        getById,
        filter,
        exportJSON,
        importJSON,
        clearAll,
        loadSampleData,  // async
        getNextId,
        syncFromSheets,  // async — descarga todo desde Google Sheets
        setAppsScriptUrl,
        getAppsScriptUrl,
        isConnected
    };
})();

window.DB = DB;
