-- =============================================================
-- Inventario Animales LP&ET — Carga de datos sample
-- =============================================================
-- Ejecutar DESPUÉS de 01_schema.sql
-- Fecha: 2026-04-07
-- =============================================================

-- ── ANIMALES ──
INSERT INTO animales (id, nombre, tipo, raza, sexo, fecha_nacimiento, peso, color_marcas, estado, ubicacion, procedencia, fecha_ingreso, costo_adquisicion, madre_id, padre_id, foto, observaciones) VALUES
  ('ANI-001', 'Luna', 'Bovino', 'Holstein', 'Hembra', '2023-06-15', 450, 'Blanca/Negra', 'Activo', 'Potrero Norte', 'Compra', '2023-06-20', 3500000, NULL, NULL, NULL, 'Ternera productora'),
  ('ANI-002', 'Torito', 'Bovino', 'Brahman', 'Macho', '2024-02-10', 280, 'Gris claro', 'Activo', 'Potrero Norte', 'Nacimiento', '2024-02-10', 0, 'ANI-001', NULL, NULL, 'Cría de Luna'),
  ('ANI-003', 'Pinta', 'Equino', 'Criollo', 'Hembra', '2020-03-20', 380, 'Pinta marrón/blanca', 'Activo', 'Establo', 'Compra', '2022-05-15', 5000000, NULL, NULL, NULL, 'Yegua de trabajo'),
  ('ANI-004', 'Coco', 'Ave', 'Gallina ponedora', 'Hembra', '2025-01-01', 2, 'Roja', 'Activo', 'Gallinero', 'Compra', '2025-06-01', 500000, NULL, NULL, NULL, 'Lote de 20 gallinas ponedoras'),
  ('ANI-005', 'Rex', 'Canino', 'Pastor Alemán', 'Macho', '2022-08-10', 35, 'Negro/Café', 'Activo', 'Casa principal', 'Donación', '2022-10-01', 0, NULL, NULL, NULL, 'Perro guardián');

-- ── ORDENES ──
INSERT INTO ordenes (id, fecha, tipo, animal_id, nombre_animal, tipo_animal, cantidad, precio_unitario, total, comprador_vendedor, telefono, documento, metodo_pago, estado_orden, observaciones) VALUES
  ('ORD-001', '2023-06-20', 'Compra', 'ANI-001', 'Luna', 'Bovino', 1, 3500000, 3500000, 'Finca El Roble', '3101234567', 'CC 12345678', 'Transferencia', 'Completada', 'Ternera Holstein de 3 meses'),
  ('ORD-002', '2022-05-15', 'Compra', 'ANI-003', 'Pinta', 'Equino', 1, 5000000, 5000000, 'Hacienda La Estrella', '3209876543', 'CC 87654321', 'Efectivo', 'Completada', 'Yegua criolla de trabajo'),
  ('ORD-003', '2025-06-01', 'Compra', 'ANI-004', 'Coco', 'Ave', 20, 25000, 500000, 'Avícola El Pollo Feliz', '3185551234', 'NIT 900123456', 'Efectivo', 'Completada', 'Lote de 20 gallinas ponedoras');

-- ── ACTIVIDADES ──
INSERT INTO actividades (id, fecha, animal_id, nombre_animal, tipo_actividad, descripcion, producto, dosis, veterinario, costo, proxima_fecha, estado, observaciones) VALUES
  ('ACT-001', '2026-01-15', 'ANI-001', 'Luna', 'Vacunación', 'Fiebre aftosa', 'Aftogan', '5ml', 'Dr. Ramírez', 45000, '2026-07-15', 'Completada', 'Refuerzo semestral'),
  ('ACT-002', '2026-01-20', 'ANI-002', 'Torito', 'Vacunación', 'Fiebre aftosa', 'Aftogan', '3ml', 'Dr. Ramírez', 45000, '2026-07-20', 'Completada', 'Primera dosis'),
  ('ACT-003', '2026-02-01', 'ANI-001', 'Luna', 'Desparasitación', 'Desparasitación interna', 'Ivermectina', '10ml', 'Dr. Ramírez', 35000, '2026-05-01', 'Completada', 'Trimestral'),
  ('ACT-004', '2026-03-01', 'ANI-003', 'Pinta', 'Herraje', 'Cambio de herraduras', 'Herraduras #2', '4 unidades', 'Herrero Juan', 120000, '2026-05-01', 'Completada', 'Herraje completo 4 cascos'),
  ('ACT-005', '2026-03-10', 'ANI-005', 'Rex', 'Vacunación', 'Rabia', 'Nobivac Rabies', '1ml', 'Dra. López', 55000, '2027-03-10', 'Completada', 'Refuerzo anual');

-- ── COSTOS ──
INSERT INTO costos (id, fecha, categoria, descripcion, animales, proveedor, cantidad, unidad, valor_unitario, total, metodo_pago, factura, observaciones) VALUES
  ('COS-001', '2026-01-05', 'Alimentación', 'Concentrado bovino x 40kg', 'Bovinos', 'Agro El Campo', 2, 'Bulto', 95000, 190000, 'Efectivo', 'F-2301', 'Para el mes de enero'),
  ('COS-002', '2026-01-10', 'Alimentación', 'Sal mineralizada x 25kg', 'Bovinos', 'Agro El Campo', 1, 'Bulto', 45000, 45000, 'Efectivo', 'F-2305', NULL),
  ('COS-003', '2026-02-01', 'Veterinario', 'Consulta general bovinos', 'Bovinos', 'Dr. Ramírez', 1, 'Visita', 150000, 150000, 'Transferencia', NULL, 'Revisión trimestral'),
  ('COS-004', '2026-02-15', 'Medicamento', 'Ivermectina x 500ml', 'Todos', 'Veterinaria La Salud', 1, 'Frasco', 85000, 85000, 'Efectivo', 'V-1122', 'Para desparasitación'),
  ('COS-005', '2026-03-01', 'Herraje', 'Herraduras + clavos', 'Equinos', 'Ferretería Rural', 4, 'Juego', 30000, 120000, 'Efectivo', NULL, 'Para Pinta'),
  ('COS-006', '2026-03-05', 'Alimentación', 'Maíz para gallinas x 50kg', 'Aves', 'Granero Don Pedro', 1, 'Bulto', 75000, 75000, 'Efectivo', 'G-450', NULL);

-- ── HUEVOS ──
INSERT INTO huevos (id, fecha, cantidad, rotos, ubicacion, observaciones) VALUES
  ('HUE-001', '2026-03-10', 12, 1, 'Gallinero', 'Buen día de producción'),
  ('HUE-002', '2026-03-11', 15, 0, 'Gallinero', NULL),
  ('HUE-003', '2026-03-12', 10, 2, 'Gallinero', 'Gallina enferma, producción baja'),
  ('HUE-004', '2026-03-13', 14, 0, 'Gallinero', NULL),
  ('HUE-005', '2026-03-14', 16, 1, 'Gallinero', 'Récord del mes'),
  ('HUE-006', '2026-03-15', 13, 0, 'Gallinero', NULL),
  ('HUE-007', '2026-03-16', 11, 1, 'Gallinero', NULL),
  ('HUE-008', '2026-03-17', 14, 0, 'Gallinero', 'Día nublado');

-- ── Verificación de conteos ──
SELECT 'animales'    AS tabla, COUNT(*) AS total FROM animales
UNION ALL SELECT 'ordenes',     COUNT(*) FROM ordenes
UNION ALL SELECT 'actividades', COUNT(*) FROM actividades
UNION ALL SELECT 'costos',      COUNT(*) FROM costos
UNION ALL SELECT 'huevos',      COUNT(*) FROM huevos
ORDER BY tabla;