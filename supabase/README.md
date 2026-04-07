# Migración Supabase — Inventario Animales LP&ET

Migración desde Google Sheets + Apps Script → Supabase PostgreSQL.

## Estado actual

- ✅ **db.js** del dashboard ya está configurado con Supabase
- ✅ **URL y anon key** ya están hardcoded en `assets/js/db.js`
- ⚠️ **Tablas en Supabase:** NO existen todavía — hay que crearlas corriendo los SQL

## Proyecto Supabase

- **URL:** https://pzkxbymwvimwnfmqoihj.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/pzkxbymwvimwnfmqoihj
- **Anon key:** `sb_publishable_VzKz-KApgtUosdpch3mdVQ_Ojt4pEp0` (pública, para el cliente)
- **Proyecto compartido con:** huerta-lpet-dashboard (tablas `tareas`, `equipo`, etc.)

## Pasos para crear las tablas

### 1. Entrar al SQL Editor

1. Abre https://supabase.com/dashboard/project/pzkxbymwvimwnfmqoihj
2. En el menú izquierdo → **SQL Editor**
3. Clic en **"+ New query"**

### 2. Ejecutar el esquema (`01_schema.sql`)

1. Abre `supabase/01_schema.sql` en este repo
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Clic en **Run** (o Ctrl+Enter)
5. Deberías ver algo como:

```
Success. Rows returned: 5
```

Las 5 tablas quedan creadas: `animales`, `ordenes`, `actividades`, `costos`, `huevos`.

### 3. Cargar datos sample (`02_seed_sample_data.sql`)

1. Abre `supabase/02_seed_sample_data.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor (nueva query)
4. **Run**
5. Al final verás los conteos:

```
tabla         | total
--------------+-------
actividades   |     5
animales      |     5
costos        |     6
huevos        |     8
ordenes       |     3
```

### 4. Verificar desde el dashboard

1. Abre https://jbenavides-dotcom.github.io/inventario-animales/
2. El dashboard debería cargar los datos directamente desde Supabase
3. Probá agregar un animal nuevo → debe aparecer en la tabla de Supabase
4. Probá editar/eliminar → mismo CRUD directo

## Estructura de las tablas

### `animales`
Inventario principal de animales de la finca.
- **PK:** `id` (texto tipo `ANI-001`)
- **FK:** `madre_id`, `padre_id` → `animales(id)` (opcional)
- Campos clave: `nombre`, `tipo`, `raza`, `sexo`, `estado`, `ubicacion`

### `ordenes`
Compras y ventas.
- **PK:** `id` (`ORD-001`)
- Tipo: `Compra` / `Venta`
- Relaciona con `animal_id` (libre, sin FK estricta)

### `actividades`
Registro sanitario: vacunas, desparasitación, herraje, consultas.
- **PK:** `id` (`ACT-001`)
- Campo `proxima_fecha` indexado para alertas

### `costos`
Gastos operativos (alimentación, medicamentos, servicios).
- **PK:** `id` (`COS-001`)
- Agrupables por `categoria` y `animales`

### `huevos`
Producción diaria.
- **PK:** `id` (`HUE-001`)
- Campo `cantidad` (sanos) + `rotos`

## Seguridad (RLS)

**IMPORTANTE:** las políticas actuales permiten **lectura y escritura públicas** a través de la anon key. Esto significa que cualquiera con la URL del proyecto puede leer/modificar datos.

Si querés restringir (ej: solo lectura pública, escritura con auth), reemplazá las políticas en `01_schema.sql` por:

```sql
-- Lectura pública, escritura solo autenticado
DROP POLICY "allow_all_animales" ON animales;
CREATE POLICY "read_public" ON animales FOR SELECT USING (true);
CREATE POLICY "write_auth"  ON animales FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_auth" ON animales FOR UPDATE USING (auth.role() = 'authenticated');
-- ... repetir para las otras tablas
```

Para la Phase 2 (Telegram bot vía n8n) la anon key sigue funcionando porque n8n actúa como cliente.

## Próximos pasos

1. ✅ Crear tablas + cargar datos sample
2. ⏳ Probar dashboard cargando desde Supabase
3. ⏳ Workflow n8n: Bot Telegram → Claude Haiku → Supabase
4. ⏳ Desplegar bot `@InventarioAnimalesBot` o integrar en `@HuertaInteligentebot`
5. ⏳ Tightening RLS si se requiere

## Rollback

Si algo sale mal, para borrar todo y empezar de nuevo:

```sql
DROP TABLE IF EXISTS huevos      CASCADE;
DROP TABLE IF EXISTS costos      CASCADE;
DROP TABLE IF EXISTS actividades CASCADE;
DROP TABLE IF EXISTS ordenes     CASCADE;
DROP TABLE IF EXISTS animales    CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
```

Luego volvé a correr `01_schema.sql` y `02_seed_sample_data.sql`.
