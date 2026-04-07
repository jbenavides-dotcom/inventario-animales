-- =============================================================
-- Inventario Animales LP&ET — Esquema Supabase
-- =============================================================
-- Migración desde Google Sheets / Apps Script → Supabase REST API
-- Ejecutar en: SQL Editor del proyecto pzkxbymwvimwnfmqoihj
-- Fecha: 2026-04-07
-- =============================================================

-- ── Limpieza (solo si se re-ejecuta) ─────────────────────────
DROP TABLE IF EXISTS huevos      CASCADE;
DROP TABLE IF EXISTS costos      CASCADE;
DROP TABLE IF EXISTS actividades CASCADE;
DROP TABLE IF EXISTS ordenes     CASCADE;
DROP TABLE IF EXISTS animales    CASCADE;

-- ── TABLA: animales ──────────────────────────────────────────
-- Inventario principal de animales de la finca
CREATE TABLE animales (
    id                 TEXT PRIMARY KEY,           -- ANI-001
    nombre             TEXT NOT NULL,
    tipo               TEXT NOT NULL,              -- Bovino, Equino, Ave, Canino, Porcino, etc.
    raza               TEXT,
    sexo               TEXT,                       -- Macho, Hembra
    fecha_nacimiento   DATE,
    peso               NUMERIC,                    -- kg
    color_marcas       TEXT,
    estado             TEXT DEFAULT 'Activo',      -- Activo, Vendido, Fallecido, Enfermo
    ubicacion          TEXT,
    procedencia        TEXT,                       -- Compra, Nacimiento, Donación
    fecha_ingreso      DATE,
    costo_adquisicion  NUMERIC DEFAULT 0,
    madre_id           TEXT REFERENCES animales(id) ON DELETE SET NULL,
    padre_id           TEXT REFERENCES animales(id) ON DELETE SET NULL,
    foto               TEXT,
    observaciones      TEXT,
    created_at         TIMESTAMPTZ DEFAULT now(),
    updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_animales_tipo     ON animales(tipo);
CREATE INDEX idx_animales_estado   ON animales(estado);
CREATE INDEX idx_animales_ubicacion ON animales(ubicacion);

-- ── TABLA: ordenes ───────────────────────────────────────────
-- Compras y ventas de animales
CREATE TABLE ordenes (
    id                   TEXT PRIMARY KEY,         -- ORD-001
    fecha                DATE NOT NULL,
    tipo                 TEXT NOT NULL,            -- Compra, Venta
    animal_id            TEXT,                     -- Referencia libre (puede no existir)
    nombre_animal        TEXT,
    tipo_animal          TEXT,
    cantidad             INTEGER DEFAULT 1,
    precio_unitario      NUMERIC DEFAULT 0,
    total                NUMERIC DEFAULT 0,
    comprador_vendedor   TEXT,
    telefono             TEXT,
    documento            TEXT,
    metodo_pago          TEXT,
    estado_orden         TEXT DEFAULT 'Pendiente', -- Pendiente, Completada, Cancelada
    observaciones        TEXT,
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ordenes_fecha       ON ordenes(fecha DESC);
CREATE INDEX idx_ordenes_tipo        ON ordenes(tipo);
CREATE INDEX idx_ordenes_animal_id   ON ordenes(animal_id);

-- ── TABLA: actividades ───────────────────────────────────────
-- Registro sanitario: vacunas, desparasitación, herraje, etc.
CREATE TABLE actividades (
    id               TEXT PRIMARY KEY,             -- ACT-001
    fecha            DATE NOT NULL,
    animal_id        TEXT,
    nombre_animal    TEXT,
    tipo_actividad   TEXT NOT NULL,                -- Vacunación, Desparasitación, Herraje, etc.
    descripcion      TEXT,
    producto         TEXT,
    dosis            TEXT,
    veterinario      TEXT,
    costo            NUMERIC DEFAULT 0,
    proxima_fecha    DATE,
    estado           TEXT DEFAULT 'Completada',    -- Pendiente, Completada
    observaciones    TEXT,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_actividades_fecha         ON actividades(fecha DESC);
CREATE INDEX idx_actividades_animal_id     ON actividades(animal_id);
CREATE INDEX idx_actividades_proxima_fecha ON actividades(proxima_fecha) WHERE proxima_fecha IS NOT NULL;

-- ── TABLA: costos ────────────────────────────────────────────
-- Gastos operativos: alimentación, medicamentos, servicios
CREATE TABLE costos (
    id              TEXT PRIMARY KEY,              -- COS-001
    fecha           DATE NOT NULL,
    categoria       TEXT NOT NULL,                 -- Alimentación, Veterinario, Medicamento, Herraje, etc.
    descripcion     TEXT,
    animales        TEXT,                          -- A qué tipo/grupo aplica (Bovinos, Aves, Todos, etc.)
    proveedor       TEXT,
    cantidad        NUMERIC DEFAULT 1,
    unidad          TEXT,
    valor_unitario  NUMERIC DEFAULT 0,
    total           NUMERIC DEFAULT 0,
    metodo_pago     TEXT,
    factura         TEXT,
    observaciones   TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_costos_fecha     ON costos(fecha DESC);
CREATE INDEX idx_costos_categoria ON costos(categoria);

-- ── TABLA: huevos ────────────────────────────────────────────
-- Producción diaria de huevos
CREATE TABLE huevos (
    id            TEXT PRIMARY KEY,                -- HUE-001
    fecha         DATE NOT NULL,
    cantidad      INTEGER DEFAULT 0,
    rotos         INTEGER DEFAULT 0,
    ubicacion     TEXT,
    observaciones TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_huevos_fecha ON huevos(fecha DESC);

-- ── Triggers: auto-actualizar updated_at ─────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_animales_updated    BEFORE UPDATE ON animales    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ordenes_updated     BEFORE UPDATE ON ordenes     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_actividades_updated BEFORE UPDATE ON actividades FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_costos_updated      BEFORE UPDATE ON costos      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_huevos_updated      BEFORE UPDATE ON huevos      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security: permitir todo con anon key ───────────
-- IMPORTANTE: esto permite lectura/escritura pública a través de la anon key.
-- Si necesitás restringir, reemplazá estas políticas por unas más estrictas.

ALTER TABLE animales    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE huevos      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_animales"    ON animales    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ordenes"     ON ordenes     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_actividades" ON actividades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_costos"      ON costos      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_huevos"      ON huevos      FOR ALL USING (true) WITH CHECK (true);

-- ── Permisos al rol anon ─────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON animales    TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ordenes     TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON actividades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON costos      TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON huevos      TO anon;

-- ── Verificación ─────────────────────────────────────────────
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('animales', 'ordenes', 'actividades', 'costos', 'huevos')
ORDER BY tablename;
