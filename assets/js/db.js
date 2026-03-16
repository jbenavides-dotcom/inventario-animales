/**
 * db.js — Capa de datos localStorage
 * Inventario de Animales de Finca
 */

const DB = (function () {
  const PREFIXES = {
    animales: 'ANI',
    ordenes: 'ORD',
    actividades: 'ACT',
    costos: 'COS',
  };

  const COLLECTIONS = Object.keys(PREFIXES);

  // ── Helpers internos ──

  function _key(collection) {
    return 'inv_' + collection;
  }

  // ── CRUD ──

  function getData(collection) {
    try {
      const raw = localStorage.getItem(_key(collection));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error leyendo ' + collection, e);
      return [];
    }
  }

  function saveData(collection, data) {
    try {
      localStorage.setItem(_key(collection), JSON.stringify(data));
    } catch (e) {
      console.error('Error guardando ' + collection, e);
    }
  }

  function getNextId(collection) {
    const prefix = PREFIXES[collection];
    if (!prefix) return null;
    const items = getData(collection);
    let maxNum = 0;
    items.forEach(function (item) {
      const parts = item.id.split('-');
      const num = parseInt(parts[1], 10);
      if (num > maxNum) maxNum = num;
    });
    const next = maxNum + 1;
    return prefix + '-' + String(next).padStart(3, '0');
  }

  function addItem(collection, item) {
    const data = getData(collection);
    item.id = getNextId(collection);
    data.push(item);
    saveData(collection, data);
    return item;
  }

  function updateItem(collection, id, updates) {
    const data = getData(collection);
    const idx = data.findIndex(function (item) { return item.id === id; });
    if (idx === -1) return null;
    Object.assign(data[idx], updates);
    saveData(collection, data);
    return data[idx];
  }

  function deleteItem(collection, id) {
    const data = getData(collection);
    const filtered = data.filter(function (item) { return item.id !== id; });
    if (filtered.length === data.length) return false;
    saveData(collection, filtered);
    return true;
  }

  function getById(collection, id) {
    const data = getData(collection);
    return data.find(function (item) { return item.id === id; }) || null;
  }

  function filter(collection, filters) {
    var data = getData(collection);
    var keys = Object.keys(filters);
    return data.filter(function (item) {
      return keys.every(function (key) {
        var val = filters[key];
        if (val === '' || val === null || val === undefined) return true;
        var itemVal = String(item[key] || '').toLowerCase();
        return itemVal.indexOf(String(val).toLowerCase()) !== -1;
      });
    });
  }

  // ── Import / Export ──

  function exportJSON() {
    var db = {};
    COLLECTIONS.forEach(function (col) {
      db[col] = getData(col);
    });
    var blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'inventario-animales-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('No se proporcionó archivo'));
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = JSON.parse(e.target.result);
          // Validar estructura
          var valid = COLLECTIONS.every(function (col) {
            return Array.isArray(data[col]);
          });
          if (!valid) {
            return reject(new Error('Estructura inválida. El archivo debe contener: ' + COLLECTIONS.join(', ')));
          }
          COLLECTIONS.forEach(function (col) {
            saveData(col, data[col]);
          });
          resolve(data);
        } catch (err) {
          reject(new Error('Error parseando JSON: ' + err.message));
        }
      };
      reader.onerror = function () {
        reject(new Error('Error leyendo archivo'));
      };
      reader.readAsText(file);
    });
  }

  function clearAll() {
    COLLECTIONS.forEach(function (col) {
      localStorage.removeItem(_key(col));
    });
  }

  function loadSampleData() {
    // Solo cargar si localStorage está vacío
    var isEmpty = COLLECTIONS.every(function (col) {
      return getData(col).length === 0;
    });
    if (!isEmpty) return Promise.resolve(false);

    return fetch('data/sample-data.json')
      .then(function (res) {
        if (!res.ok) throw new Error('No se pudo cargar sample-data.json');
        return res.json();
      })
      .then(function (data) {
        COLLECTIONS.forEach(function (col) {
          if (Array.isArray(data[col])) {
            saveData(col, data[col]);
          }
        });
        return true;
      })
      .catch(function (err) {
        console.error('Error cargando datos de ejemplo:', err);
        return false;
      });
  }

  // ── API pública ──

  return {
    getData: getData,
    saveData: saveData,
    addItem: addItem,
    updateItem: updateItem,
    deleteItem: deleteItem,
    getById: getById,
    filter: filter,
    exportJSON: exportJSON,
    importJSON: importJSON,
    clearAll: clearAll,
    loadSampleData: loadSampleData,
    getNextId: getNextId,
  };
})();

window.DB = DB;
