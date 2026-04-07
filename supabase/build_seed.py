"""Generate 02_seed_sample_data.sql from data/sample-data.json."""
import json
import sys
import io
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(BASE, 'data', 'sample-data.json'), 'r', encoding='utf-8') as f:
    d = json.load(f)

FIELD_MAPS = {
    'animales': {
        'id': 'id', 'nombre': 'nombre', 'tipo': 'tipo', 'raza': 'raza', 'sexo': 'sexo',
        'fechaNacimiento': 'fecha_nacimiento', 'peso': 'peso', 'colorMarcas': 'color_marcas',
        'estado': 'estado', 'ubicacion': 'ubicacion', 'procedencia': 'procedencia',
        'fechaIngreso': 'fecha_ingreso', 'costoAdquisicion': 'costo_adquisicion',
        'madreId': 'madre_id', 'padreId': 'padre_id', 'foto': 'foto', 'observaciones': 'observaciones'
    },
    'ordenes': {
        'id': 'id', 'fecha': 'fecha', 'tipo': 'tipo', 'animalId': 'animal_id', 'nombreAnimal': 'nombre_animal',
        'tipoAnimal': 'tipo_animal', 'cantidad': 'cantidad', 'precioUnitario': 'precio_unitario',
        'total': 'total', 'compradorVendedor': 'comprador_vendedor', 'telefono': 'telefono',
        'documento': 'documento', 'metodoPago': 'metodo_pago', 'estadoOrden': 'estado_orden',
        'observaciones': 'observaciones'
    },
    'actividades': {
        'id': 'id', 'fecha': 'fecha', 'animalId': 'animal_id', 'nombreAnimal': 'nombre_animal',
        'tipoActividad': 'tipo_actividad', 'descripcion': 'descripcion', 'producto': 'producto',
        'dosis': 'dosis', 'veterinario': 'veterinario', 'costo': 'costo',
        'proximaFecha': 'proxima_fecha', 'estado': 'estado', 'observaciones': 'observaciones'
    },
    'costos': {
        'id': 'id', 'fecha': 'fecha', 'categoria': 'categoria', 'descripcion': 'descripcion',
        'animales': 'animales', 'proveedor': 'proveedor', 'cantidad': 'cantidad', 'unidad': 'unidad',
        'valorUnitario': 'valor_unitario', 'total': 'total', 'metodoPago': 'metodo_pago',
        'factura': 'factura', 'observaciones': 'observaciones'
    },
    'huevos': {
        'id': 'id', 'fecha': 'fecha', 'cantidad': 'cantidad', 'rotos': 'rotos',
        'ubicacion': 'ubicacion', 'observaciones': 'observaciones'
    }
}


def sql_val(v):
    if v is None or v == '':
        return 'NULL'
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v).replace("'", "''")
    return "'" + s + "'"


def build_insert(table, rows, field_map):
    if not rows:
        return ''
    cols = list(field_map.values())
    lines = ['INSERT INTO ' + table + ' (' + ', '.join(cols) + ') VALUES']
    vals_list = []
    for row in rows:
        vals = [sql_val(row.get(camel)) for camel in field_map.keys()]
        vals_list.append('  (' + ', '.join(vals) + ')')
    lines.append(',\n'.join(vals_list) + ';')
    return '\n'.join(lines) + '\n'


# Huevos sample data (no venían en sample-data.json)
HUEVOS_SAMPLE = [
    {'id': 'HUE-001', 'fecha': '2026-03-10', 'cantidad': 12, 'rotos': 1, 'ubicacion': 'Gallinero', 'observaciones': 'Buen día de producción'},
    {'id': 'HUE-002', 'fecha': '2026-03-11', 'cantidad': 15, 'rotos': 0, 'ubicacion': 'Gallinero', 'observaciones': ''},
    {'id': 'HUE-003', 'fecha': '2026-03-12', 'cantidad': 10, 'rotos': 2, 'ubicacion': 'Gallinero', 'observaciones': 'Gallina enferma, producción baja'},
    {'id': 'HUE-004', 'fecha': '2026-03-13', 'cantidad': 14, 'rotos': 0, 'ubicacion': 'Gallinero', 'observaciones': ''},
    {'id': 'HUE-005', 'fecha': '2026-03-14', 'cantidad': 16, 'rotos': 1, 'ubicacion': 'Gallinero', 'observaciones': 'Récord del mes'},
    {'id': 'HUE-006', 'fecha': '2026-03-15', 'cantidad': 13, 'rotos': 0, 'ubicacion': 'Gallinero', 'observaciones': ''},
    {'id': 'HUE-007', 'fecha': '2026-03-16', 'cantidad': 11, 'rotos': 1, 'ubicacion': 'Gallinero', 'observaciones': ''},
    {'id': 'HUE-008', 'fecha': '2026-03-17', 'cantidad': 14, 'rotos': 0, 'ubicacion': 'Gallinero', 'observaciones': 'Día nublado'},
]


out = []
out.append('-- =============================================================')
out.append('-- Inventario Animales LP&ET — Carga de datos sample')
out.append('-- =============================================================')
out.append('-- Ejecutar DESPUÉS de 01_schema.sql')
out.append('-- Fecha: 2026-04-07')
out.append('-- =============================================================\n')

tables = ['animales', 'ordenes', 'actividades', 'costos']
for t in tables:
    out.append('-- ── ' + t.upper() + ' ──')
    out.append(build_insert(t, d.get(t, []), FIELD_MAPS[t]))

out.append('-- ── HUEVOS ──')
out.append(build_insert('huevos', HUEVOS_SAMPLE, FIELD_MAPS['huevos']))

out.append('-- ── Verificación de conteos ──')
out.append("SELECT 'animales'    AS tabla, COUNT(*) AS total FROM animales")
out.append("UNION ALL SELECT 'ordenes',     COUNT(*) FROM ordenes")
out.append("UNION ALL SELECT 'actividades', COUNT(*) FROM actividades")
out.append("UNION ALL SELECT 'costos',      COUNT(*) FROM costos")
out.append("UNION ALL SELECT 'huevos',      COUNT(*) FROM huevos")
out.append('ORDER BY tabla;')

sql = '\n'.join(out)

out_path = os.path.join(BASE, 'supabase', '02_seed_sample_data.sql')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(sql)

print('Generado: ' + out_path)
print('Líneas: ' + str(len(sql.split('\n'))))
print('Tamaño: ' + str(len(sql)) + ' bytes')
