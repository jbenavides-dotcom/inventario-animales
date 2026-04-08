/**
 * db.js — Capa de datos con Supabase backend
 * Inventario de Animales LP&ET
 *
 * Estrategia: Supabase REST API como fuente de verdad.
 * Cache local en localStorage para velocidad.
 * Mapeo camelCase (app.js) ↔ snake_case (Supabase).
 */

const DB = (function() {
    // ============================================
    // CONFIGURACIÓN SUPABASE
    // ============================================
    const SUPABASE_URL = 'https://pzkxbymwvimwnfmqoihj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_VzKz-KApgtUosdpch3mdVQ_Ojt4pEp0';

    const HEADERS = {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
    };

    const COLLECTIONS = ['animales', 'ordenes', 'actividades', 'costos', 'huevos'];

    const PREFIXES = {
        animales: 'ANI',
        ordenes: 'ORD',
        actividades: 'ACT',
        costos: 'COS',
        huevos: 'HUE'
    };

    // ── Mapeo de campos: camelCase (app.js) → snake_case (Supabase) ──

    const FIELD_MAPS = {
        animales: {
            id:'id', nombre:'nombre', tipo:'tipo', raza:'raza', sexo:'sexo',
            fechaNacimiento:'fecha_nacimiento', peso:'peso', colorMarcas:'color_marcas',
            estado:'estado', ubicacion:'ubicacion', procedencia:'procedencia',
            fechaIngreso:'fecha_ingreso', fechaSalida:'fecha_salida',
            costoAdquisicion:'costo_adquisicion',
            madreId:'madre_id', padreId:'padre_id', foto:'foto', observaciones:'observaciones'
        },
        ordenes: {
            id:'id', fecha:'fecha', tipo:'tipo', animalId:'animal_id', nombreAnimal:'nombre_animal',
            tipoAnimal:'tipo_animal', cantidad:'cantidad', precioUnitario:'precio_unitario',
            total:'total', compradorVendedor:'comprador_vendedor', telefono:'telefono',
            documento:'documento', metodoPago:'metodo_pago', estadoOrden:'estado_orden',
            observaciones:'observaciones'
        },
        actividades: {
            id:'id', fecha:'fecha', animalId:'animal_id', nombreAnimal:'nombre_animal',
            tipoActividad:'tipo_actividad', descripcion:'descripcion', producto:'producto',
            dosis:'dosis', veterinario:'veterinario', costo:'costo',
            proximaFecha:'proxima_fecha', estado:'estado', observaciones:'observaciones'
        },
        costos: {
            id:'id', fecha:'fecha', categoria:'categoria', descripcion:'descripcion',
            animales:'animales', proveedor:'proveedor', cantidad:'cantidad', unidad:'unidad',
            valorUnitario:'valor_unitario', total:'total', metodoPago:'metodo_pago',
            factura:'factura', observaciones:'observaciones'
        },
        huevos: {
            id:'id', fecha:'fecha', cantidad:'cantidad', rotos:'rotos',
            ubicacion:'ubicacion', observaciones:'observaciones'
        }
    };

    // Mapas inversos: snake_case → camelCase (generados automáticamente)
    const REVERSE_MAPS = {};
    Object.keys(FIELD_MAPS).forEach(col => {
        REVERSE_MAPS[col] = {};
        Object.keys(FIELD_MAPS[col]).forEach(camel => {
            REVERSE_MAPS[col][FIELD_MAPS[col][camel]] = camel;
        });
    });

    // ── Cache local ──

    let _cache = {
        animales: null,
        ordenes: null,
        actividades: null,
        costos: null,
        huevos: null
    };
    let _cacheTimestamp = 0;
    const CACHE_TTL = 30000; // 30 segundos

    // ── Helpers de mapeo ──

    function toCamel(collection, row) {
        const map = REVERSE_MAPS[collection];
        if (!map) return row;
        const out = {};
        Object.keys(row).forEach(snakeKey => {
            const camelKey = map[snakeKey] || snakeKey;
            out[camelKey] = row[snakeKey];
        });
        return out;
    }

    function toSnake(collection, obj) {
        const map = FIELD_MAPS[collection];
        if (!map) return obj;
        const out = {};
        Object.keys(obj).forEach(camelKey => {
            const snakeKey = map[camelKey] || camelKey;
            out[snakeKey] = obj[camelKey];
        });
        return out;
    }

    // ── Helpers de localStorage ──

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

    // ── Comunicación con Supabase REST API ──

    async function _supabaseGet(collection) {
        const url = SUPABASE_URL + '/rest/v1/' + collection + '?select=*&order=id';
        const response = await fetch(url, { headers: HEADERS });
        if (!response.ok) throw new Error('Supabase GET error: ' + response.status);
        const rows = await response.json();
        return rows.map(row => toCamel(collection, row));
    }

    async function _supabasePost(collection, item) {
        const url = SUPABASE_URL + '/rest/v1/' + collection;
        const response = await fetch(url, {
            method: 'POST',
            headers: { ...HEADERS, 'Prefer': 'return=representation' },
            body: JSON.stringify(toSnake(collection, item))
        });
        if (!response.ok) throw new Error('Supabase POST error: ' + response.status);
        const rows = await response.json();
        return rows.length > 0 ? toCamel(collection, rows[0]) : item;
    }

    async function _supabasePatch(collection, id, updates) {
        const url = SUPABASE_URL + '/rest/v1/' + collection + '?id=eq.' + encodeURIComponent(id);
        const response = await fetch(url, {
            method: 'PATCH',
            headers: { ...HEADERS, 'Prefer': 'return=representation' },
            body: JSON.stringify(toSnake(collection, updates))
        });
        if (!response.ok) throw new Error('Supabase PATCH error: ' + response.status);
        const rows = await response.json();
        return rows.length > 0 ? toCamel(collection, rows[0]) : null;
    }

    async function _supabaseDelete(collection, id) {
        const url = SUPABASE_URL + '/rest/v1/' + collection + '?id=eq.' + encodeURIComponent(id);
        const response = await fetch(url, {
            method: 'DELETE',
            headers: HEADERS
        });
        if (!response.ok) throw new Error('Supabase DELETE error: ' + response.status);
    }

    // ── Sync: descargar todo desde Supabase ──

    async function sync() {
        try {
            const promises = COLLECTIONS.map(col => _supabaseGet(col));
            const results = await Promise.all(promises);
            COLLECTIONS.forEach((col, i) => {
                _saveLocal(col, results[i]);
                _cache[col] = results[i];
            });
            _cacheTimestamp = Date.now();
            return true;
        } catch(err) {
            console.warn('Error sincronizando desde Supabase:', err);
            return false;
        }
    }

    // Alias para compatibilidad con app.js
    async function syncFromSheets() {
        return sync();
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

        // Sincronizar con Supabase
        try {
            const saved = await _supabasePost(collection, item);
            // Si Supabase devolvió un ID diferente, actualizar
            if (saved.id && saved.id !== item.id) {
                item.id = saved.id;
                saveData(collection, data);
            }
        } catch(err) {
            console.warn('Error enviando a Supabase (guardado local OK):', err);
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

        // Sincronizar con Supabase
        try {
            await _supabasePatch(collection, id, updates);
        } catch(err) {
            console.warn('Error actualizando en Supabase (guardado local OK):', err);
        }

        return data[idx];
    }

    async function deleteItem(collection, id) {
        // Eliminar localmente
        const data = getData(collection);
        const filtered = data.filter(item => item.id !== id);
        if (filtered.length === data.length) return false;
        saveData(collection, filtered);

        // Sincronizar con Supabase
        try {
            await _supabaseDelete(collection, id);
        } catch(err) {
            console.warn('Error eliminando en Supabase (guardado local OK):', err);
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
        // No necesaria — datos se cargan via SQL en Supabase
        return Promise.resolve(false);
    }

    // ── Configuración (compatibilidad) ──

    function setAppsScriptUrl() {
        // No-op — Supabase no necesita configuración dinámica de URL
    }

    function getAppsScriptUrl() {
        return SUPABASE_URL;
    }

    function isConnected() {
        return true;
    }

    // ── API pública ──

    return {
        getData,
        saveData,
        addItem,
        updateItem,
        deleteItem,
        getById,
        filter,
        exportJSON,
        importJSON,
        clearAll,
        loadSampleData,
        getNextId,
        sync,
        syncFromSheets,
        setAppsScriptUrl,
        getAppsScriptUrl,
        isConnected
    };
})();

window.DB = DB;
