// =============================================
// Google Apps Script — Inventario Animal LP&ET
// =============================================
// INSTRUCCIONES:
// 1. Abrir Google Sheet
// 2. Extensiones → Apps Script
// 3. Borrar todo el código existente
// 4. Pegar este archivo completo
// 5. Ejecutar setupDatabase() para crear las hojas
// 6. Ejecutar loadSampleData() para cargar datos de ejemplo
// 7. Implementar → Implementar como aplicación web
//    - Ejecutar como: Yo
//    - Acceso: Cualquier persona
// 8. Copiar la URL de la aplicación web
// 9. Pegar la URL en el dashboard (db.js)
// =============================================

// =============================================
// CONFIGURACIÓN DE HOJAS
// =============================================

var SHEET_CONFIG = {
  Animales: [
    'ID', 'Nombre', 'Tipo', 'Raza', 'Sexo', 'FechaNacimiento', 'Peso',
    'ColorMarcas', 'Estado', 'Ubicacion', 'Procedencia', 'FechaIngreso',
    'CostoAdquisicion', 'MadreId', 'PadreId', 'Foto', 'Observaciones'
  ],
  Ordenes: [
    'ID', 'Fecha', 'Tipo', 'AnimalId', 'NombreAnimal', 'TipoAnimal',
    'Cantidad', 'PrecioUnitario', 'Total', 'CompradorVendedor', 'Telefono',
    'Documento', 'MetodoPago', 'EstadoOrden', 'Observaciones'
  ],
  Actividades: [
    'ID', 'Fecha', 'AnimalId', 'NombreAnimal', 'TipoActividad', 'Descripcion',
    'Producto', 'Dosis', 'Veterinario', 'Costo', 'ProximaFecha', 'Estado',
    'Observaciones'
  ],
  Costos: [
    'ID', 'Fecha', 'Categoria', 'Descripcion', 'Animales', 'Proveedor',
    'Cantidad', 'Unidad', 'ValorUnitario', 'Total', 'MetodoPago', 'Factura',
    'Observaciones'
  ],
  Huevos: [
    'ID', 'Fecha', 'Cantidad', 'Rotos', 'Ubicacion', 'Observaciones'
  ]
};

var ID_PREFIXES = {
  Animales: 'ANI',
  Ordenes: 'ORD',
  Actividades: 'ACT',
  Costos: 'COS',
  Huevos: 'HUE'
};

// =============================================
// 1. setupDatabase() — Crear estructura de hojas
// =============================================

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = Object.keys(SHEET_CONFIG);

  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var headers = SHEET_CONFIG[name];
    var sheet = ss.getSheetByName(name);

    if (sheet) {
      Logger.log('Hoja "' + name + '" ya existe. Se omite.');
      continue;
    }

    sheet = ss.insertSheet(name);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);

    // Formato de headers
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#5C3D2E');
    headerRange.setFontColor('#FFFFFF');

    // Congelar primera fila
    sheet.setFrozenRows(1);

    // Auto-resize columnas
    for (var c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }

    Logger.log('Hoja "' + name + '" creada con ' + headers.length + ' columnas.');
  }

  // Eliminar "Hoja 1" si existe y está vacía
  var hoja1 = ss.getSheetByName('Hoja 1');
  if (hoja1 && hoja1.getLastRow() <= 1 && hoja1.getLastColumn() <= 1) {
    var cellValue = hoja1.getRange(1, 1).getValue();
    if (cellValue === '' || cellValue === null) {
      ss.deleteSheet(hoja1);
      Logger.log('Hoja "Hoja 1" eliminada.');
    }
  }

  SpreadsheetApp.flush();
  Logger.log('setupDatabase() completado.');
}

// =============================================
// 2. loadSampleData() — Cargar datos de ejemplo
// =============================================

function loadSampleData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Animales ---
  var animalesData = [
    ['ANI-001', 'Luna', 'Bovino', 'Holstein', 'Hembra', '2023-06-15', 450, 'Blanca/Negra', 'Activo', 'Potrero Norte', 'Compra', '2023-06-20', 3500000, '', '', '', 'Ternera productora'],
    ['ANI-002', 'Torito', 'Bovino', 'Brahman', 'Macho', '2024-02-10', 280, 'Gris claro', 'Activo', 'Potrero Norte', 'Nacimiento', '2024-02-10', 0, 'ANI-001', '', '', 'Cría de Luna'],
    ['ANI-003', 'Pinta', 'Equino', 'Criollo', 'Hembra', '2020-03-20', 380, 'Pinta marrón/blanca', 'Activo', 'Establo', 'Compra', '2022-05-15', 5000000, '', '', '', 'Yegua de trabajo'],
    ['ANI-004', 'Coco', 'Ave', 'Gallina ponedora', 'Hembra', '2025-01-01', 2, 'Roja', 'Activo', 'Gallinero', 'Compra', '2025-06-01', 500000, '', '', '', 'Lote de 20 gallinas ponedoras'],
    ['ANI-005', 'Rex', 'Canino', 'Pastor Alemán', 'Macho', '2022-08-10', 35, 'Negro/Café', 'Activo', 'Casa principal', 'Donación', '2022-10-01', 0, '', '', '', 'Perro guardián']
  ];
  appendData(ss, 'Animales', animalesData);

  // --- Ordenes ---
  var ordenesData = [
    ['ORD-001', '2023-06-20', 'Compra', 'ANI-001', 'Luna', 'Bovino', 1, 3500000, 3500000, 'Finca El Roble', '3101234567', 'CC 12345678', 'Transferencia', 'Completada', 'Ternera Holstein de 3 meses'],
    ['ORD-002', '2022-05-15', 'Compra', 'ANI-003', 'Pinta', 'Equino', 1, 5000000, 5000000, 'Hacienda La Estrella', '3209876543', 'CC 87654321', 'Efectivo', 'Completada', 'Yegua criolla de trabajo'],
    ['ORD-003', '2025-06-01', 'Compra', 'ANI-004', 'Coco', 'Ave', 20, 25000, 500000, 'Avícola El Pollo Feliz', '3185551234', 'NIT 900123456', 'Efectivo', 'Completada', 'Lote de 20 gallinas ponedoras']
  ];
  appendData(ss, 'Ordenes', ordenesData);

  // --- Actividades ---
  var actividadesData = [
    ['ACT-001', '2026-01-15', 'ANI-001', 'Luna', 'Vacunación', 'Fiebre aftosa', 'Aftogan', '5ml', 'Dr. Ramírez', 45000, '2026-07-15', 'Completada', 'Refuerzo semestral'],
    ['ACT-002', '2026-01-20', 'ANI-002', 'Torito', 'Vacunación', 'Fiebre aftosa', 'Aftogan', '3ml', 'Dr. Ramírez', 45000, '2026-07-20', 'Completada', 'Primera dosis'],
    ['ACT-003', '2026-02-01', 'ANI-001', 'Luna', 'Desparasitación', 'Desparasitación interna', 'Ivermectina', '10ml', 'Dr. Ramírez', 35000, '2026-05-01', 'Completada', 'Trimestral'],
    ['ACT-004', '2026-03-01', 'ANI-003', 'Pinta', 'Herraje', 'Cambio de herraduras', 'Herraduras #2', '4 unidades', 'Herrero Juan', 120000, '2026-05-01', 'Completada', 'Herraje completo 4 cascos'],
    ['ACT-005', '2026-03-10', 'ANI-005', 'Rex', 'Vacunación', 'Rabia', 'Nobivac Rabies', '1ml', 'Dra. López', 55000, '2027-03-10', 'Completada', 'Refuerzo anual']
  ];
  appendData(ss, 'Actividades', actividadesData);

  // --- Costos ---
  var costosData = [
    ['COS-001', '2026-01-05', 'Alimentación', 'Concentrado bovino x 40kg', 'Bovinos', 'Agro El Campo', 2, 'Bulto', 95000, 190000, 'Efectivo', 'F-2301', 'Para el mes de enero'],
    ['COS-002', '2026-01-10', 'Alimentación', 'Sal mineralizada x 25kg', 'Bovinos', 'Agro El Campo', 1, 'Bulto', 45000, 45000, 'Efectivo', 'F-2305', ''],
    ['COS-003', '2026-02-01', 'Veterinario', 'Consulta general bovinos', 'Bovinos', 'Dr. Ramírez', 1, 'Visita', 150000, 150000, 'Transferencia', '', 'Revisión trimestral'],
    ['COS-004', '2026-02-15', 'Medicamento', 'Ivermectina x 500ml', 'Todos', 'Veterinaria La Salud', 1, 'Frasco', 85000, 85000, 'Efectivo', 'V-1122', 'Para desparasitación'],
    ['COS-005', '2026-03-01', 'Herraje', 'Herraduras + clavos', 'Equinos', 'Ferretería Rural', 4, 'Juego', 30000, 120000, 'Efectivo', '', 'Para Pinta'],
    ['COS-006', '2026-03-05', 'Alimentación', 'Maíz para gallinas x 50kg', 'Aves', 'Granero Don Pedro', 1, 'Bulto', 75000, 75000, 'Efectivo', 'G-450', '']
  ];
  appendData(ss, 'Costos', costosData);

  // --- Huevos ---
  var huevosData = [
    ['HUE-001', '2026-03-10', 12, 1, 'Gallinero', 'Buen día de producción'],
    ['HUE-002', '2026-03-11', 15, 0, 'Gallinero', ''],
    ['HUE-003', '2026-03-12', 10, 2, 'Gallinero', 'Gallina enferma, producción baja'],
    ['HUE-004', '2026-03-13', 14, 0, 'Gallinero', ''],
    ['HUE-005', '2026-03-14', 16, 1, 'Gallinero', 'Récord del mes'],
    ['HUE-006', '2026-03-15', 13, 0, 'Gallinero', ''],
    ['HUE-007', '2026-03-16', 11, 1, 'Gallinero', ''],
    ['HUE-008', '2026-03-17', 14, 0, 'Gallinero', 'Día nublado']
  ];
  appendData(ss, 'Huevos', huevosData);

  Logger.log('loadSampleData() completado. Datos de ejemplo cargados.');
}

function appendData(ss, sheetName, data) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('ERROR: Hoja "' + sheetName + '" no existe. Ejecuta setupDatabase() primero.');
    return;
  }
  if (data.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);
    Logger.log(sheetName + ': ' + data.length + ' filas insertadas.');
  }
}

// =============================================
// 3. Web API — doGet(e) y doPost(e)
// =============================================

function doGet(e) {
  var params = e ? e.parameter : {};
  var action = params.action || 'getAll';
  var result;

  try {
    if (action === 'getAll') {
      result = {
        success: true,
        data: {
          animales: getSheetData('Animales'),
          ordenes: getSheetData('Ordenes'),
          actividades: getSheetData('Actividades'),
          costos: getSheetData('Costos'),
          huevos: getSheetData('Huevos')
        }
      };
    } else if (action === 'get') {
      var sheetName = params.sheet;
      if (!sheetName || !SHEET_CONFIG[sheetName]) {
        result = { success: false, error: 'Hoja no válida: ' + sheetName };
      } else if (params.id) {
        var allData = getSheetData(sheetName);
        var found = null;
        for (var i = 0; i < allData.length; i++) {
          if (allData[i].id === params.id) {
            found = allData[i];
            break;
          }
        }
        if (found) {
          result = { success: true, data: found };
        } else {
          result = { success: false, error: 'Registro no encontrado: ' + params.id };
        }
      } else {
        result = { success: true, data: getSheetData(sheetName) };
      }
    } else {
      result = { success: false, error: 'Acción no válida: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify(result));
  return output;
}

function doPost(e) {
  var result;

  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var sheetName = body.sheet;

    if (!sheetName || !SHEET_CONFIG[sheetName]) {
      result = { success: false, error: 'Hoja no válida: ' + sheetName };
    } else if (action === 'add') {
      result = addRow(sheetName, body.data || {});
    } else if (action === 'update') {
      result = updateRow(sheetName, body.id, body.data || {});
    } else if (action === 'delete') {
      result = deleteRow(sheetName, body.id);
    } else {
      result = { success: false, error: 'Acción no válida: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify(result));
  return output;
}

// =============================================
// OPERACIONES CRUD
// =============================================

function addRow(sheetName, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  var headers = SHEET_CONFIG[sheetName];

  // Generar ID si no viene
  var id = data.id || data.ID || getNextId(sheetName);

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    var camelKey = headerToCamelCase(header);
    if (header === 'ID') {
      row.push(id);
    } else if (data[camelKey] !== undefined) {
      row.push(data[camelKey]);
    } else if (data[header] !== undefined) {
      row.push(data[header]);
    } else {
      row.push('');
    }
  }

  sheet.appendRow(row);
  return { success: true, id: id, message: 'Registro agregado en ' + sheetName };
}

function updateRow(sheetName, id, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  var headers = SHEET_CONFIG[sheetName];

  if (!id) {
    return { success: false, error: 'ID requerido para actualizar' };
  }

  var rowIndex = findRowById(sheet, id);
  if (rowIndex === -1) {
    return { success: false, error: 'Registro no encontrado: ' + id };
  }

  var existingRow = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];

  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    var camelKey = headerToCamelCase(header);
    if (header === 'ID') continue; // No modificar ID
    if (data[camelKey] !== undefined) {
      existingRow[i] = data[camelKey];
    } else if (data[header] !== undefined) {
      existingRow[i] = data[header];
    }
  }

  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([existingRow]);
  return { success: true, id: id, message: 'Registro actualizado en ' + sheetName };
}

function deleteRow(sheetName, id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!id) {
    return { success: false, error: 'ID requerido para eliminar' };
  }

  var rowIndex = findRowById(sheet, id);
  if (rowIndex === -1) {
    return { success: false, error: 'Registro no encontrado: ' + id };
  }

  sheet.deleteRow(rowIndex);
  return { success: true, id: id, message: 'Registro eliminado de ' + sheetName };
}

// =============================================
// HELPERS
// =============================================

/**
 * Lee una hoja completa y retorna array de objetos con keys en camelCase
 */
function getSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  var headers = SHEET_CONFIG[sheetName];
  var camelHeaders = headersToCamelCase(headers);
  var dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length);
  var values = dataRange.getValues();
  var result = [];

  for (var r = 0; r < values.length; r++) {
    var obj = {};
    for (var c = 0; c < camelHeaders.length; c++) {
      obj[camelHeaders[c]] = values[r][c];
    }
    result.push(obj);
  }

  return result;
}

/**
 * Busca una fila por ID en columna A. Retorna el número de fila (1-based) o -1.
 */
function findRowById(sheet, id) {
  if (sheet.getLastRow() < 2) return -1;

  var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      return i + 2; // +2 porque empieza en fila 2 y es 1-based
    }
  }
  return -1;
}

/**
 * Genera el siguiente ID para una hoja (ANI-001, ORD-002, etc.)
 */
function getNextId(sheetName) {
  var prefix = ID_PREFIXES[sheetName];
  if (!prefix) return '';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() < 2) {
    return prefix + '-001';
  }

  var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  var maxNum = 0;

  for (var i = 0; i < ids.length; i++) {
    var val = String(ids[i][0]);
    if (val.indexOf(prefix + '-') === 0) {
      var num = parseInt(val.replace(prefix + '-', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  var nextNum = maxNum + 1;
  var padded = ('000' + nextNum).slice(-3);
  return prefix + '-' + padded;
}

/**
 * Convierte un array de headers a camelCase
 * Ej: ['ID', 'FechaNacimiento', 'ColorMarcas'] → ['id', 'fechaNacimiento', 'colorMarcas']
 */
function headersToCamelCase(headers) {
  var result = [];
  for (var i = 0; i < headers.length; i++) {
    result.push(headerToCamelCase(headers[i]));
  }
  return result;
}

/**
 * Convierte un header individual a camelCase
 */
function headerToCamelCase(header) {
  if (header === 'ID') return 'id';
  // Ya viene en PascalCase, solo hacer la primera letra minúscula
  return header.charAt(0).toLowerCase() + header.slice(1);
}

/**
 * Convierte camelCase a header original (PascalCase)
 */
function camelCaseToHeader(key) {
  if (key === 'id') return 'ID';
  return key.charAt(0).toUpperCase() + key.slice(1);
}
