/**
 * app.js — Logica principal de navegacion e inicializacion
 * Inventario de Animales de Finca — LP&ET
 */

var App = (function () {

  var currentPage = 'dashboard';
  var currentSort = { column: null, direction: 'asc' };

  // ── Constantes de formularios ──

  var TIPOS_ANIMAL = ['Bovino', 'Equino', 'Ave', 'Porcino', 'Canino', 'Felino', 'Caprino', 'Ovino', 'Otro'];
  var ESTADOS_ANIMAL = ['Activo', 'Vendido', 'Fallecido', 'En tratamiento', 'Cuarentena', 'Prestado'];
  var PROCEDENCIAS = ['Compra', 'Nacimiento', 'Donacion', 'Intercambio', 'Otro'];
  var SEXOS = ['Macho', 'Hembra'];
  var METODOS_PAGO = ['Efectivo', 'Transferencia', 'Cheque', 'Otro'];
  var ESTADOS_ORDEN = ['Pendiente', 'Completada', 'Cancelada'];
  var TIPOS_ORDEN = ['Compra', 'Venta'];
  var TIPOS_ACTIVIDAD = ['Vacunacion', 'Desparasitacion', 'Tratamiento', 'Herraje', 'Pesaje', 'Traslado', 'Inseminacion', 'Parto', 'Revision general', 'Cirugia', 'Otro'];
  var ESTADOS_ACTIVIDAD = ['Completada', 'Pendiente', 'En curso'];
  var CATEGORIAS_COSTO = ['Alimentacion', 'Veterinario', 'Medicamento', 'Herraje', 'Insumos', 'Transporte', 'Infraestructura', 'Otro'];

  // ══════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════

  function init() {
    // Detectar pagina actual
    var body = document.body;
    currentPage = body.getAttribute('data-page') || detectPageFromURL();

    initSidebar();
    initExportImport();
    initSheetsConnection();

    // Si hay conexion a Sheets, sincronizar primero
    // Asegurar que initPage se ejecute siempre, incluso si sync falla
    var pageInitialized = false;
    function safeInitPage() {
      if (pageInitialized) return;
      pageInitialized = true;
      initPage();
    }

    // Timeout de seguridad: si sync tarda más de 5s, inicializar igual
    setTimeout(safeInitPage, 5000);

    if (DB.isConnected()) {
      updateConnectionStatus(true);
      DB.syncFromSheets().then(function(synced) {
        if (synced) {
          Utils.showToast('Sincronizado con Supabase', 'success');
        }
        safeInitPage();
      }).catch(function(err) {
        console.error('Error sync:', err);
        safeInitPage();
      });
    } else {
      updateConnectionStatus(false);
      DB.loadSampleData().then(function (loaded) {
        if (loaded) {
          Utils.showToast('Datos de ejemplo cargados', 'info');
        }
        safeInitPage();
      }).catch(function(err) {
        console.error('Error loadSample:', err);
        safeInitPage();
      });
    }
  }

  function detectPageFromURL() {
    var path = window.location.pathname;
    if (path.indexOf('inventario') !== -1) return 'inventario';
    if (path.indexOf('ordenes') !== -1) return 'ordenes';
    if (path.indexOf('salud') !== -1) return 'salud';
    if (path.indexOf('costos') !== -1) return 'costos';
    if (path.indexOf('huevos') !== -1) return 'huevos';
    return 'dashboard';
  }

  function initPage() {
    switch (currentPage) {
      case 'dashboard':   initDashboard(); break;
      case 'inventario':  initInventario(); break;
      case 'ordenes':     initOrdenes(); break;
      case 'salud':       initSalud(); break;
      case 'costos':      initCostos(); break;
      case 'huevos':      initHuevos(); break;
    }
  }

  // ══════════════════════════════════════════
  //  SIDEBAR
  // ══════════════════════════════════════════

  function initSidebar() {
    // Toggle button
    var toggleBtn = document.getElementById('sidebar-toggle');
    var sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', toggleSidebar);
    }

    // Marcar nav item activo
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function (item) {
      var page = item.getAttribute('data-page');
      if (page === currentPage) {
        item.classList.add('active');
      }
    });

    // Bottom nav en mobile
    var bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(function (item) {
      var page = item.getAttribute('data-page');
      if (page === currentPage) {
        item.classList.add('active');
      }
    });

    // Cerrar sidebar al hacer click en overlay (mobile)
    var overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', function () {
        toggleSidebar();
      });
    }
  }

  function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
    if (overlay) {
      overlay.classList.toggle('visible');
    }
  }

  // ══════════════════════════════════════════
  //  EXPORT / IMPORT
  // ══════════════════════════════════════════

  function initExportImport() {
    var btnExport = document.getElementById('btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', function () {
        DB.exportJSON();
        Utils.showToast('Backup exportado correctamente', 'success');
      });
    }

    var btnImport = document.getElementById('btn-import');
    var fileInput = document.getElementById('file-import');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', function () {
        fileInput.click();
      });
      fileInput.addEventListener('change', handleImport);
    }

    var btnSample = document.getElementById('btn-sample-data');
    if (btnSample) {
      btnSample.addEventListener('click', function () {
        DB.clearAll();
        DB.loadSampleData().then(function (loaded) {
          if (loaded) {
            Utils.showToast('Datos de ejemplo cargados', 'success');
            location.reload();
          } else {
            Utils.showToast('Error cargando datos de ejemplo', 'error');
          }
        });
      });
    }
  }

  function handleImport(event) {
    var file = event.target.files[0];
    if (!file) return;

    Utils.confirmAction('Esto reemplazara todos los datos actuales. ¿Continuar?').then(function (ok) {
      if (!ok) {
        event.target.value = '';
        return;
      }
      DB.importJSON(file).then(function () {
        Utils.showToast('Datos importados correctamente', 'success');
        setTimeout(function () { location.reload(); }, 500);
      }).catch(function (err) {
        Utils.showToast(err.message, 'error');
      });
      event.target.value = '';
    });
  }

  // ══════════════════════════════════════════
  //  GOOGLE SHEETS CONNECTION
  // ══════════════════════════════════════════

  function initSheetsConnection() {
    var btnConnect = document.getElementById('btn-connect-sheets');
    var btnSync = document.getElementById('btn-sync-sheets');

    if (btnConnect) {
      btnConnect.addEventListener('click', showSheetsConfigModal);
    }
    if (btnSync) {
      btnSync.addEventListener('click', function() {
        if (!DB.isConnected()) {
          showSheetsConfigModal();
          return;
        }
        Utils.showToast('Sincronizando...', 'info');
        DB.syncFromSheets().then(function(ok) {
          if (ok) {
            Utils.showToast('Datos sincronizados desde Supabase', 'success');
            setTimeout(function() { location.reload(); }, 500);
          } else {
            Utils.showToast('Error al sincronizar', 'error');
          }
        });
      });
    }
  }

  function showSheetsConfigModal() {
    var currentUrl = DB.getAppsScriptUrl() || '';
    var html = '<div class="form-group">' +
      '<label class="form-label">URL del Apps Script (Web App)</label>' +
      '<input type="url" class="form-control" id="input-sheets-url" value="' + currentUrl + '" placeholder="https://script.google.com/macros/s/.../exec">' +
      '<small style="color:var(--color-muted);display:block;margin-top:0.5rem">Pega aqui la URL que obtienes al implementar el Apps Script como aplicacion web.</small>' +
      '</div>';

    if (currentUrl) {
      html += '<div style="margin-top:1rem">' +
        '<button class="btn btn-danger btn-sm" id="btn-disconnect-sheets">Desconectar Supabase</button>' +
        '</div>';
    }

    openModal('Conectar Supabase', html, function() {
      var url = document.getElementById('input-sheets-url').value.trim();
      if (!url) {
        Utils.showToast('Ingresa una URL valida', 'warning');
        return;
      }
      DB.setAppsScriptUrl(url);
      Utils.showToast('URL guardada. Sincronizando...', 'success');
      closeModal();
      DB.syncFromSheets().then(function(ok) {
        if (ok) {
          Utils.showToast('Conectado y sincronizado con Supabase', 'success');
          updateConnectionStatus(true);
          setTimeout(function() { location.reload(); }, 800);
        } else {
          Utils.showToast('URL guardada pero no se pudo sincronizar. Verifica la URL.', 'warning');
          updateConnectionStatus(true);
        }
      });
    });

    // Boton desconectar
    setTimeout(function() {
      var btnDisconnect = document.getElementById('btn-disconnect-sheets');
      if (btnDisconnect) {
        btnDisconnect.addEventListener('click', function() {
          DB.setAppsScriptUrl('');
          localStorage.removeItem('inv_apps_script_url');
          Utils.showToast('Desconectado de Supabase', 'info');
          updateConnectionStatus(false);
          closeModal();
        });
      }
    }, 100);
  }

  function updateConnectionStatus(connected) {
    var indicators = document.querySelectorAll('.connection-status');
    indicators.forEach(function(el) {
      if (connected) {
        el.innerHTML = '<span style="color:var(--color-success)">● Supabase</span>';
        el.title = 'Conectado a Supabase';
      } else {
        el.innerHTML = '<span style="color:var(--color-muted)">○ Solo local</span>';
        el.title = 'Datos solo en localStorage';
      }
    });
  }

  // ══════════════════════════════════════════
  //  DASHBOARD
  // ══════════════════════════════════════════

  function initDashboard() {
    var stats = getStats();

    // Stat cards
    renderStatCards(stats);

    // Alertas
    renderAlertas(stats);

    // Graficos (si Charts esta disponible)
    if (typeof Charts !== 'undefined' && Charts.initDashboard) {
      Charts.initDashboard(stats);
    }
  }

  function renderStatCards(stats) {
    var container = document.getElementById('stat-cards');
    if (!container) return;

    var cards = [
      { label: 'Animales Activos', value: stats.totalAnimales, icon: '🐄', color: '#059669' },
      { label: 'Inversion Total', value: Utils.formatCOP(stats.totalInversion), icon: '💰', color: '#2563eb' },
      { label: 'Ventas', value: Utils.formatCOP(stats.totalVentas), icon: '📈', color: '#7c3aed' },
      { label: 'Costos del Mes', value: Utils.formatCOP(stats.costosMesActual), icon: '📊', color: '#dc2626' },
      { label: 'Actividades Pendientes', value: stats.actividadesPendientes, icon: '⚕️', color: '#d97706' },
    ];

    var html = '';
    cards.forEach(function (card) {
      html += '<div class="stat-card">' +
        '<div class="stat-icon" style="color:' + card.color + ';">' + card.icon + '</div>' +
        '<div class="stat-info">' +
          '<span class="stat-label">' + card.label + '</span>' +
          '<span class="stat-value">' + card.value + '</span>' +
        '</div>' +
      '</div>';
    });
    container.innerHTML = html;
  }

  function renderAlertas(stats) {
    var container = document.getElementById('alertas');
    if (!container) return;

    var html = '';

    if (stats.alertasVacunas.length > 0) {
      html += '<div class="alerta alerta-warning">' +
        '<strong>Vacunas proximas (30 dias):</strong><ul>';
      stats.alertasVacunas.forEach(function (a) {
        html += '<li>' + a.nombre + ' — ' + a.tipoActividad + ' el ' + Utils.formatDate(a.proximaFecha) + '</li>';
      });
      html += '</ul></div>';
    }

    if (stats.alertasTratamiento.length > 0) {
      html += '<div class="alerta alerta-danger">' +
        '<strong>Animales en tratamiento:</strong><ul>';
      stats.alertasTratamiento.forEach(function (a) {
        html += '<li>' + a.nombre + ' — ' + a.estado + '</li>';
      });
      html += '</ul></div>';
    }

    if (stats.ordenesPendientes.length > 0) {
      html += '<div class="alerta alerta-info">' +
        '<strong>Ordenes pendientes:</strong><ul>';
      stats.ordenesPendientes.forEach(function (o) {
        html += '<li>' + o.tipo + ' — ' + (o.compradorVendedor || 'Sin nombre') +
          ' — ' + Utils.formatCOP(o.total) + '</li>';
      });
      html += '</ul></div>';
    }

    if (!html) {
      html = '<div class="alerta alerta-success"><strong>Sin alertas.</strong> Todo en orden.</div>';
    }

    container.innerHTML = html;
  }

  // ══════════════════════════════════════════
  //  INVENTARIO
  // ══════════════════════════════════════════

  function initInventario() {
    renderInventarioTable();
    initInventarioFilters();

    var btnAdd = document.getElementById('btn-add-animal');
    if (btnAdd) {
      btnAdd.addEventListener('click', function () {
        openModal('Agregar Animal', getAnimalForm(), function () {
          var formData = collectFormData('animal-form');
          saveAnimal(formData);
        });
      });
    }
  }

  function renderInventarioTable(data) {
    var animales = data || DB.getData('animales');
    var columns = [
      { key: 'id', label: 'ID' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'raza', label: 'Raza' },
      { key: 'sexo', label: 'Sexo' },
      { key: 'fechaNacimiento', label: 'Edad', render: function (val) { return Utils.calcAge(val).text; } },
      { key: 'peso', label: 'Peso (kg)' },
      { key: 'estado', label: 'Estado', render: function (val) { return Utils.getStatusBadge(val); } },
      { key: 'ubicacion', label: 'Ubicacion' },
    ];
    var actions = [
      { label: 'Ver', class: 'btn-sm btn-info', handler: 'showAnimalDetail' },
      { label: 'Editar', class: 'btn-sm btn-warning', handler: 'editAnimal' },
      { label: 'Eliminar', class: 'btn-sm btn-danger', handler: 'deleteAnimalRecord' },
    ];
    renderTable('inventario-table', animales, columns, actions);
  }

  function initInventarioFilters() {
    var filterTipo = document.getElementById('filter-tipo');
    var filterEstado = document.getElementById('filter-estado');
    var filterUbicacion = document.getElementById('filter-ubicacion');
    var filterSexo = document.getElementById('filter-sexo');
    var searchInput = document.getElementById('search-animal');

    // Poblar selects de filtro
    if (filterTipo) populateSelect(filterTipo, TIPOS_ANIMAL, 'Todos los tipos');
    if (filterEstado) populateSelect(filterEstado, ESTADOS_ANIMAL, 'Todos los estados');
    if (filterSexo) populateSelect(filterSexo, SEXOS, 'Ambos sexos');

    // Ubicaciones unicas
    if (filterUbicacion) {
      var animales = DB.getData('animales');
      var ubicaciones = [];
      animales.forEach(function (a) {
        if (a.ubicacion && ubicaciones.indexOf(a.ubicacion) === -1) {
          ubicaciones.push(a.ubicacion);
        }
      });
      populateSelect(filterUbicacion, ubicaciones, 'Todas las ubicaciones');
    }

    var applyFilters = function () {
      var filters = {};
      if (filterTipo && filterTipo.value) filters.tipo = filterTipo.value;
      if (filterEstado && filterEstado.value) filters.estado = filterEstado.value;
      if (filterUbicacion && filterUbicacion.value) filters.ubicacion = filterUbicacion.value;
      if (filterSexo && filterSexo.value) filters.sexo = filterSexo.value;

      var data = DB.filter('animales', filters);

      if (searchInput && searchInput.value) {
        data = Utils.filterBySearch(data, searchInput.value, ['nombre', 'raza', 'tipo', 'ubicacion', 'colorMarcas']);
      }

      renderInventarioTable(data);
    };

    [filterTipo, filterEstado, filterUbicacion, filterSexo].forEach(function (el) {
      if (el) el.addEventListener('change', applyFilters);
    });

    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(applyFilters, 300));
    }
  }

  // ══════════════════════════════════════════
  //  ORDENES
  // ══════════════════════════════════════════

  function initOrdenes() {
    renderOrdenesTable();
    initOrdenesFilters();

    var btnAdd = document.getElementById('btn-add-orden');
    if (btnAdd) {
      btnAdd.addEventListener('click', function () {
        openModal('Nueva Orden', getOrdenForm(), function () {
          var formData = collectFormData('orden-form');
          saveOrden(formData);
        });
      });
    }
  }

  function renderOrdenesTable(data) {
    var ordenes = data || DB.getData('ordenes');
    var columns = [
      { key: 'id', label: 'ID' },
      { key: 'fecha', label: 'Fecha', render: function (val) { return Utils.formatDate(val); } },
      { key: 'tipo', label: 'Tipo' },
      { key: 'animalId', label: 'Animal', render: function (val) {
        var animal = DB.getById('animales', val);
        return animal ? animal.nombre + ' (' + val + ')' : val || '—';
      }},
      { key: 'cantidad', label: 'Cant.' },
      { key: 'total', label: 'Total', render: function (val) { return Utils.formatCOP(val); } },
      { key: 'compradorVendedor', label: 'Comprador/Vendedor' },
      { key: 'estadoOrden', label: 'Estado', render: function (val) { return Utils.getStatusBadge(val || 'Pendiente'); } },
    ];
    var actions = [
      { label: 'Editar', class: 'btn-sm btn-warning', handler: 'editOrden' },
      { label: 'Eliminar', class: 'btn-sm btn-danger', handler: 'deleteOrdenRecord' },
    ];
    renderTable('ordenes-table', ordenes, columns, actions);
  }

  function initOrdenesFilters() {
    var filterTipo = document.getElementById('filter-tipo-orden');
    var filterEstado = document.getElementById('filter-estado-orden');

    if (filterTipo) populateSelect(filterTipo, TIPOS_ORDEN, 'Todos los tipos');
    if (filterEstado) populateSelect(filterEstado, ESTADOS_ORDEN, 'Todos los estados');

    var applyFilters = function () {
      var filters = {};
      if (filterTipo && filterTipo.value) filters.tipo = filterTipo.value;
      if (filterEstado && filterEstado.value) filters.estadoOrden = filterEstado.value;
      var data = DB.filter('ordenes', filters);
      renderOrdenesTable(data);
    };

    [filterTipo, filterEstado].forEach(function (el) {
      if (el) el.addEventListener('change', applyFilters);
    });
  }

  // ══════════════════════════════════════════
  //  SALUD / ACTIVIDADES
  // ══════════════════════════════════════════

  function initSalud() {
    renderSaludTable();
    initSaludFilters();

    var btnAdd = document.getElementById('btn-add-actividad');
    if (btnAdd) {
      btnAdd.addEventListener('click', function () {
        openModal('Nueva Actividad', getActividadForm(), function () {
          var formData = collectFormData('actividad-form');
          saveActividad(formData);
        });
      });
    }
  }

  function renderSaludTable(data) {
    var actividades = data || DB.getData('actividades');
    var hoy = new Date().toISOString().slice(0, 10);

    var columns = [
      { key: 'id', label: 'ID' },
      { key: 'fecha', label: 'Fecha', render: function (val) { return Utils.formatDate(val); } },
      { key: 'animalId', label: 'Animal', render: function (val) {
        var animal = DB.getById('animales', val);
        return animal ? animal.nombre : val || '—';
      }},
      { key: 'tipoActividad', label: 'Tipo' },
      { key: 'descripcion', label: 'Descripcion' },
      { key: 'costo', label: 'Costo', render: function (val) { return Utils.formatCOP(val); } },
      { key: 'proximaFecha', label: 'Proxima', render: function (val) {
        if (!val) return '—';
        var formatted = Utils.formatDate(val);
        if (val < hoy) return '<span style="color:#dc2626;font-weight:600;">' + formatted + ' (VENCIDA)</span>';
        return formatted;
      }},
      { key: 'estado', label: 'Estado', render: function (val) { return Utils.getStatusBadge(val || 'Pendiente'); } },
    ];
    var actions = [
      { label: 'Editar', class: 'btn-sm btn-warning', handler: 'editActividad' },
      { label: 'Eliminar', class: 'btn-sm btn-danger', handler: 'deleteActividadRecord' },
    ];
    renderTable('salud-table', actividades, columns, actions);
  }

  function initSaludFilters() {
    var filterTipo = document.getElementById('filter-tipo-actividad');
    var filterEstado = document.getElementById('filter-estado-actividad');
    var filterAnimal = document.getElementById('filter-animal-actividad');

    if (filterTipo) populateSelect(filterTipo, TIPOS_ACTIVIDAD, 'Todos los tipos');
    if (filterEstado) populateSelect(filterEstado, ESTADOS_ACTIVIDAD, 'Todos los estados');

    // Select de animales
    if (filterAnimal) {
      var animales = DB.getData('animales');
      var opciones = animales.map(function (a) { return { value: a.id, label: a.nombre + ' (' + a.id + ')' }; });
      populateSelectObjects(filterAnimal, opciones, 'Todos los animales');
    }

    var applyFilters = function () {
      var filters = {};
      if (filterTipo && filterTipo.value) filters.tipoActividad = filterTipo.value;
      if (filterEstado && filterEstado.value) filters.estado = filterEstado.value;
      if (filterAnimal && filterAnimal.value) filters.animalId = filterAnimal.value;
      var data = DB.filter('actividades', filters);
      renderSaludTable(data);
    };

    [filterTipo, filterEstado, filterAnimal].forEach(function (el) {
      if (el) el.addEventListener('change', applyFilters);
    });
  }

  // ══════════════════════════════════════════
  //  COSTOS
  // ══════════════════════════════════════════

  function initCostos() {
    renderCostosTable();
    initCostosFilters();
    renderCostosMesActual();

    var btnAdd = document.getElementById('btn-add-costo');
    if (btnAdd) {
      btnAdd.addEventListener('click', function () {
        openModal('Nuevo Costo', getCostoForm(), function () {
          var formData = collectFormData('costo-form');
          saveCosto(formData);
        });
      });
    }
  }

  function renderCostosTable(data) {
    var costos = data || DB.getData('costos');
    var columns = [
      { key: 'id', label: 'ID' },
      { key: 'fecha', label: 'Fecha', render: function (val) { return Utils.formatDate(val); } },
      { key: 'categoria', label: 'Categoria' },
      { key: 'descripcion', label: 'Descripcion' },
      { key: 'proveedor', label: 'Proveedor' },
      { key: 'cantidad', label: 'Cant.' },
      { key: 'valorUnitario', label: 'Valor Unit.', render: function (val) { return Utils.formatCOP(val); } },
      { key: 'total', label: 'Total', render: function (val) { return Utils.formatCOP(val); } },
    ];
    var actions = [
      { label: 'Editar', class: 'btn-sm btn-warning', handler: 'editCosto' },
      { label: 'Eliminar', class: 'btn-sm btn-danger', handler: 'deleteCostoRecord' },
    ];
    renderTable('costos-table', costos, columns, actions);
  }

  function renderCostosMesActual() {
    var el = document.getElementById('costos-mes-total');
    if (!el) return;
    var stats = getStats();
    el.textContent = Utils.formatCOP(stats.costosMesActual);
  }

  function initCostosFilters() {
    var filterCategoria = document.getElementById('filter-categoria-costo');
    var filterMes = document.getElementById('filter-mes-costo');

    if (filterCategoria) populateSelect(filterCategoria, CATEGORIAS_COSTO, 'Todas las categorias');

    var applyFilters = function () {
      var costos = DB.getData('costos');

      if (filterCategoria && filterCategoria.value) {
        costos = costos.filter(function (c) { return c.categoria === filterCategoria.value; });
      }

      if (filterMes && filterMes.value) {
        var mesVal = filterMes.value; // formato YYYY-MM
        costos = costos.filter(function (c) {
          return c.fecha && c.fecha.slice(0, 7) === mesVal;
        });
      }

      renderCostosTable(costos);
    };

    if (filterCategoria) filterCategoria.addEventListener('change', applyFilters);
    if (filterMes) filterMes.addEventListener('change', applyFilters);
  }

  // ══════════════════════════════════════════
  //  RENDER TABLE (generico)
  // ══════════════════════════════════════════

  function renderTable(containerId, data, columns, actions) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state">' +
        '<p style="font-size:2rem;margin-bottom:8px;">📋</p>' +
        '<p>No hay registros para mostrar.</p>' +
      '</div>';
      return;
    }

    var html = '<div class="table-responsive"><table class="data-table">';

    // Header
    html += '<thead><tr>';
    columns.forEach(function (col) {
      html += '<th data-column="' + col.key + '">' + col.label + '</th>';
    });
    if (actions && actions.length > 0) {
      html += '<th>Acciones</th>';
    }
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    data.forEach(function (row) {
      html += '<tr data-id="' + row.id + '">';
      columns.forEach(function (col) {
        var value = row[col.key];
        var display = col.render ? col.render(value, row) : (value !== null && value !== undefined ? value : '');
        html += '<td>' + display + '</td>';
      });
      if (actions && actions.length > 0) {
        html += '<td class="actions-cell">';
        actions.forEach(function (action) {
          html += '<button class="btn ' + action.class + '" data-action="' + action.handler + '" data-id="' + row.id + '">' +
            action.label + '</button> ';
        });
        html += '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    container.innerHTML = html;

    // Bind action buttons
    container.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var action = btn.getAttribute('data-action');
        var id = btn.getAttribute('data-id');
        if (typeof App[action] === 'function') {
          App[action](id);
        }
      });
    });
  }

  // ══════════════════════════════════════════
  //  MODALES
  // ══════════════════════════════════════════

  function openModal(title, content, onSave) {
    // Remover modal previo si existe
    closeModal();

    var overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto;';

    var modal = document.createElement('div');
    modal.id = 'modal-content';
    modal.style.cssText = 'background:#fff;border-radius:12px;width:100%;max-width:640px;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:modalIn 0.2s ease;';

    var headerHtml = '<div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">' +
      '<h2 style="margin:0;font-size:1.25rem;color:#1f2937;">' + title + '</h2>' +
      '<button id="modal-close-btn" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#6b7280;padding:0;line-height:1;">&times;</button>' +
    '</div>';

    var bodyHtml = '<div style="padding:24px;max-height:60vh;overflow-y:auto;">' + content + '</div>';

    var footerHtml = '<div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:12px;">' +
      '<button id="modal-cancel-btn" class="btn btn-secondary">Cancelar</button>' +
      '<button id="modal-save-btn" class="btn btn-primary">Guardar</button>' +
    '</div>';

    modal.innerHTML = headerHtml + bodyHtml + footerHtml;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Bind close
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    // ESC
    var escHandler = function (e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Save
    if (onSave) {
      document.getElementById('modal-save-btn').addEventListener('click', onSave);
    }

    // Inicializar auto-calculo de totales
    initAutoCalc();
  }

  function closeModal() {
    var overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.parentNode.removeChild(overlay);
  }

  function initAutoCalc() {
    // Auto-calculo total = cantidad x precio
    var cantidadInput = document.getElementById('field-cantidad');
    var precioInput = document.getElementById('field-precioUnitario') || document.getElementById('field-valorUnitario');
    var totalInput = document.getElementById('field-total');

    if (cantidadInput && precioInput && totalInput) {
      var calcTotal = function () {
        var cant = parseFloat(cantidadInput.value) || 0;
        var precio = parseFloat(precioInput.value) || 0;
        totalInput.value = cant * precio;
      };
      cantidadInput.addEventListener('input', calcTotal);
      precioInput.addEventListener('input', calcTotal);
    }
  }

  // ══════════════════════════════════════════
  //  FORMULARIOS
  // ══════════════════════════════════════════

  function buildField(type, name, label, options) {
    options = options || {};
    var value = options.value !== undefined && options.value !== null ? options.value : '';
    var required = options.required ? ' required' : '';
    var placeholder = options.placeholder || '';
    var readOnly = options.readOnly ? ' readonly style="background:#f3f4f6;"' : '';

    var html = '<div class="form-group" style="margin-bottom:16px;">' +
      '<label style="display:block;font-size:0.875rem;font-weight:600;color:#374151;margin-bottom:4px;" for="field-' + name + '">' + label + (options.required ? ' *' : '') + '</label>';

    if (type === 'select') {
      html += '<select id="field-' + name + '" name="' + name + '"' + required +
        ' style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem;">';
      html += '<option value="">— Seleccionar —</option>';
      if (Array.isArray(options.choices)) {
        options.choices.forEach(function (choice) {
          if (typeof choice === 'object') {
            var sel = choice.value === value ? ' selected' : '';
            html += '<option value="' + choice.value + '"' + sel + '>' + choice.label + '</option>';
          } else {
            var sel = choice === value ? ' selected' : '';
            html += '<option value="' + choice + '"' + sel + '>' + choice + '</option>';
          }
        });
      }
      html += '</select>';
    } else if (type === 'textarea') {
      html += '<textarea id="field-' + name + '" name="' + name + '" rows="3"' + required +
        ' placeholder="' + placeholder + '"' +
        ' style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem;resize:vertical;">' + value + '</textarea>';
    } else {
      html += '<input type="' + type + '" id="field-' + name + '" name="' + name + '" value="' + value + '"' +
        required + readOnly +
        ' placeholder="' + placeholder + '"' +
        ' style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem;" />';
    }

    html += '</div>';
    return html;
  }

  function getAnimalForm(animal) {
    var a = animal || {};
    var animales = DB.getData('animales');
    var opcionesAnimales = animales.map(function (x) { return { value: x.id, label: x.nombre + ' (' + x.id + ')' }; });

    var html = '<form id="animal-form"><div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">';
    html += buildField('text', 'nombre', 'Nombre', { value: a.nombre, required: true, placeholder: 'Ej: Luna' });
    html += buildField('select', 'tipo', 'Tipo', { value: a.tipo, required: true, choices: TIPOS_ANIMAL });
    html += buildField('text', 'raza', 'Raza', { value: a.raza, placeholder: 'Ej: Holstein' });
    html += buildField('select', 'sexo', 'Sexo', { value: a.sexo, required: true, choices: SEXOS });
    html += buildField('date', 'fechaNacimiento', 'Fecha de Nacimiento', { value: a.fechaNacimiento });
    html += buildField('number', 'peso', 'Peso (kg)', { value: a.peso, placeholder: '0' });
    html += buildField('text', 'colorMarcas', 'Color / Marcas', { value: a.colorMarcas, placeholder: 'Ej: Blanca/Negra' });
    html += buildField('select', 'estado', 'Estado', { value: a.estado || 'Activo', choices: ESTADOS_ANIMAL });
    html += buildField('text', 'ubicacion', 'Ubicacion', { value: a.ubicacion, placeholder: 'Ej: Potrero Norte' });
    html += buildField('select', 'procedencia', 'Procedencia', { value: a.procedencia, choices: PROCEDENCIAS });
    html += buildField('date', 'fechaIngreso', 'Fecha de Ingreso', { value: a.fechaIngreso });
    html += buildField('number', 'costoAdquisicion', 'Costo Adquisicion (COP)', { value: a.costoAdquisicion, placeholder: '0' });
    html += buildField('select', 'madreId', 'Madre', { value: a.madreId, choices: opcionesAnimales });
    html += buildField('select', 'padreId', 'Padre', { value: a.padreId, choices: opcionesAnimales });
    html += '</div>';
    html += buildField('textarea', 'observaciones', 'Observaciones', { value: a.observaciones, placeholder: 'Notas adicionales...' });
    html += '</form>';
    return html;
  }

  function getOrdenForm(orden) {
    var o = orden || {};
    var animales = DB.getData('animales');
    var opcionesAnimales = animales.map(function (x) { return { value: x.id, label: x.nombre + ' (' + x.id + ')' }; });

    var html = '<form id="orden-form"><div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">';
    html += buildField('date', 'fecha', 'Fecha', { value: o.fecha || new Date().toISOString().slice(0, 10), required: true });
    html += buildField('select', 'tipo', 'Tipo', { value: o.tipo, required: true, choices: TIPOS_ORDEN });
    html += buildField('select', 'animalId', 'Animal', { value: o.animalId, choices: opcionesAnimales });
    html += buildField('number', 'cantidad', 'Cantidad', { value: o.cantidad || 1, placeholder: '1' });
    html += buildField('number', 'precioUnitario', 'Precio Unitario (COP)', { value: o.precioUnitario, placeholder: '0' });
    html += buildField('number', 'total', 'Total (COP)', { value: o.total, placeholder: 'Auto-calculado', readOnly: true });
    html += buildField('text', 'compradorVendedor', 'Comprador / Vendedor', { value: o.compradorVendedor, placeholder: 'Nombre completo' });
    html += buildField('text', 'telefono', 'Telefono', { value: o.telefono, placeholder: '300 123 4567' });
    html += buildField('text', 'documento', 'Documento', { value: o.documento, placeholder: 'CC o NIT' });
    html += buildField('select', 'metodoPago', 'Metodo de Pago', { value: o.metodoPago, choices: METODOS_PAGO });
    html += buildField('select', 'estadoOrden', 'Estado', { value: o.estadoOrden || 'Pendiente', choices: ESTADOS_ORDEN });
    html += '</div>';
    html += buildField('textarea', 'observaciones', 'Observaciones', { value: o.observaciones });
    html += '</form>';
    return html;
  }

  function getActividadForm(actividad) {
    var a = actividad || {};
    var animales = DB.getData('animales');
    var opcionesAnimales = animales.map(function (x) { return { value: x.id, label: x.nombre + ' (' + x.id + ')' }; });

    var html = '<form id="actividad-form"><div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">';
    html += buildField('date', 'fecha', 'Fecha', { value: a.fecha || new Date().toISOString().slice(0, 10), required: true });
    html += buildField('select', 'animalId', 'Animal', { value: a.animalId, required: true, choices: opcionesAnimales });
    html += buildField('select', 'tipoActividad', 'Tipo de Actividad', { value: a.tipoActividad, required: true, choices: TIPOS_ACTIVIDAD });
    html += buildField('text', 'descripcion', 'Descripcion', { value: a.descripcion, placeholder: 'Detalle de la actividad' });
    html += buildField('text', 'producto', 'Producto / Medicamento', { value: a.producto, placeholder: 'Ej: Ivermectina' });
    html += buildField('text', 'dosis', 'Dosis', { value: a.dosis, placeholder: 'Ej: 5ml' });
    html += buildField('text', 'veterinario', 'Veterinario', { value: a.veterinario, placeholder: 'Nombre del veterinario' });
    html += buildField('number', 'costo', 'Costo (COP)', { value: a.costo, placeholder: '0' });
    html += buildField('date', 'proximaFecha', 'Proxima Fecha', { value: a.proximaFecha });
    html += buildField('select', 'estado', 'Estado', { value: a.estado || 'Pendiente', choices: ESTADOS_ACTIVIDAD });
    html += '</div>';
    html += buildField('textarea', 'observaciones', 'Observaciones', { value: a.observaciones });
    html += '</form>';
    return html;
  }

  function getCostoForm(costo) {
    var c = costo || {};
    var html = '<form id="costo-form"><div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">';
    html += buildField('date', 'fecha', 'Fecha', { value: c.fecha || new Date().toISOString().slice(0, 10), required: true });
    html += buildField('select', 'categoria', 'Categoria', { value: c.categoria, required: true, choices: CATEGORIAS_COSTO });
    html += buildField('text', 'descripcion', 'Descripcion', { value: c.descripcion, required: true, placeholder: 'Detalle del gasto' });
    html += buildField('text', 'animales', 'Animales relacionados', { value: c.animales, placeholder: 'IDs separados por coma' });
    html += buildField('text', 'proveedor', 'Proveedor', { value: c.proveedor, placeholder: 'Nombre del proveedor' });
    html += buildField('number', 'cantidad', 'Cantidad', { value: c.cantidad || 1, placeholder: '1' });
    html += buildField('text', 'unidad', 'Unidad', { value: c.unidad, placeholder: 'Ej: kg, litro, unidad' });
    html += buildField('number', 'valorUnitario', 'Valor Unitario (COP)', { value: c.valorUnitario, placeholder: '0' });
    html += buildField('number', 'total', 'Total (COP)', { value: c.total, placeholder: 'Auto-calculado', readOnly: true });
    html += buildField('select', 'metodoPago', 'Metodo de Pago', { value: c.metodoPago, choices: METODOS_PAGO });
    html += buildField('text', 'factura', 'No. Factura', { value: c.factura, placeholder: 'Opcional' });
    html += '</div>';
    html += buildField('textarea', 'observaciones', 'Observaciones', { value: c.observaciones });
    html += '</form>';
    return html;
  }

  // ══════════════════════════════════════════
  //  COLLECT FORM DATA
  // ══════════════════════════════════════════

  function collectFormData(formId) {
    var form = document.getElementById(formId);
    if (!form) return {};
    var data = {};
    var inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(function (el) {
      var name = el.name;
      if (!name) return;
      var value = el.value;
      // Convertir numeros
      if (el.type === 'number' && value !== '') {
        value = parseFloat(value);
      }
      data[name] = value;
    });
    return data;
  }

  // ══════════════════════════════════════════
  //  CRUD HANDLERS
  // ══════════════════════════════════════════

  function saveAnimal(formData, existingId) {
    // Validar campos requeridos
    if (!formData.nombre || !formData.nombre.trim()) {
      Utils.showToast('El nombre es obligatorio', 'error');
      return;
    }
    if (!formData.tipo) {
      Utils.showToast('El tipo de animal es obligatorio', 'error');
      return;
    }
    if (!formData.sexo) {
      Utils.showToast('El sexo es obligatorio', 'error');
      return;
    }

    if (existingId) {
      DB.updateItem('animales', existingId, formData);
      Utils.showToast('Animal actualizado correctamente', 'success');
    } else {
      DB.addItem('animales', formData);
      Utils.showToast('Animal registrado correctamente', 'success');
    }
    closeModal();
    renderInventarioTable();
  }

  function saveOrden(formData, existingId) {
    if (!formData.fecha) {
      Utils.showToast('La fecha es obligatoria', 'error');
      return;
    }
    if (!formData.tipo) {
      Utils.showToast('El tipo de orden es obligatorio', 'error');
      return;
    }

    // Calcular total si no lo tiene
    if (!formData.total || formData.total === 0) {
      formData.total = (parseFloat(formData.cantidad) || 1) * (parseFloat(formData.precioUnitario) || 0);
    }

    if (existingId) {
      DB.updateItem('ordenes', existingId, formData);
      Utils.showToast('Orden actualizada correctamente', 'success');
    } else {
      var savedOrden = DB.addItem('ordenes', formData);

      // Si es compra completada → crear animal automaticamente
      if (formData.tipo === 'Compra' && formData.estadoOrden === 'Completada') {
        var nuevoAnimal = {
          nombre: 'Animal de compra ' + savedOrden.id,
          tipo: 'Otro',
          raza: '',
          sexo: '',
          fechaNacimiento: '',
          peso: 0,
          colorMarcas: '',
          estado: 'Activo',
          ubicacion: '',
          procedencia: 'Compra',
          fechaIngreso: formData.fecha,
          costoAdquisicion: formData.total,
          madreId: '',
          padreId: '',
          observaciones: 'Creado automaticamente desde orden ' + savedOrden.id,
        };
        var animalCreado = DB.addItem('animales', nuevoAnimal);
        // Vincular animal a la orden
        DB.updateItem('ordenes', savedOrden.id, { animalId: animalCreado.id });
        Utils.showToast('Animal creado automaticamente: ' + animalCreado.id, 'info');
      }

      // Si es venta completada → marcar animal como vendido
      if (formData.tipo === 'Venta' && formData.estadoOrden === 'Completada' && formData.animalId) {
        DB.updateItem('animales', formData.animalId, { estado: 'Vendido' });
        Utils.showToast('Animal ' + formData.animalId + ' marcado como vendido', 'info');
      }

      Utils.showToast('Orden registrada correctamente', 'success');
    }

    closeModal();
    renderOrdenesTable();
  }

  function saveActividad(formData, existingId) {
    if (!formData.fecha) {
      Utils.showToast('La fecha es obligatoria', 'error');
      return;
    }
    if (!formData.animalId) {
      Utils.showToast('Debe seleccionar un animal', 'error');
      return;
    }
    if (!formData.tipoActividad) {
      Utils.showToast('El tipo de actividad es obligatorio', 'error');
      return;
    }

    if (existingId) {
      DB.updateItem('actividades', existingId, formData);
      Utils.showToast('Actividad actualizada correctamente', 'success');
    } else {
      DB.addItem('actividades', formData);
      Utils.showToast('Actividad registrada correctamente', 'success');
    }
    closeModal();
    renderSaludTable();
  }

  function saveCosto(formData, existingId) {
    if (!formData.fecha) {
      Utils.showToast('La fecha es obligatoria', 'error');
      return;
    }
    if (!formData.categoria) {
      Utils.showToast('La categoria es obligatoria', 'error');
      return;
    }
    if (!formData.descripcion || !formData.descripcion.trim()) {
      Utils.showToast('La descripcion es obligatoria', 'error');
      return;
    }

    // Calcular total
    if (!formData.total || formData.total === 0) {
      formData.total = (parseFloat(formData.cantidad) || 1) * (parseFloat(formData.valorUnitario) || 0);
    }

    if (existingId) {
      DB.updateItem('costos', existingId, formData);
      Utils.showToast('Costo actualizado correctamente', 'success');
    } else {
      DB.addItem('costos', formData);
      Utils.showToast('Costo registrado correctamente', 'success');
    }
    closeModal();
    renderCostosTable();
    renderCostosMesActual();
  }

  // ── Edit handlers (abren modal con datos pre-llenados) ──

  function editAnimal(id) {
    var animal = DB.getById('animales', id);
    if (!animal) return;
    openModal('Editar Animal — ' + animal.nombre, getAnimalForm(animal), function () {
      var formData = collectFormData('animal-form');
      saveAnimal(formData, id);
    });
  }

  function editOrden(id) {
    var orden = DB.getById('ordenes', id);
    if (!orden) return;
    openModal('Editar Orden — ' + id, getOrdenForm(orden), function () {
      var formData = collectFormData('orden-form');
      saveOrden(formData, id);
    });
  }

  function editActividad(id) {
    var actividad = DB.getById('actividades', id);
    if (!actividad) return;
    openModal('Editar Actividad — ' + id, getActividadForm(actividad), function () {
      var formData = collectFormData('actividad-form');
      saveActividad(formData, id);
    });
  }

  function editCosto(id) {
    var costo = DB.getById('costos', id);
    if (!costo) return;
    openModal('Editar Costo — ' + id, getCostoForm(costo), function () {
      var formData = collectFormData('costo-form');
      saveCosto(formData, id);
    });
  }

  // ── Delete handlers ──

  function deleteAnimalRecord(id) {
    Utils.confirmAction('¿Eliminar este animal? Esta accion no se puede deshacer.').then(function (ok) {
      if (!ok) return;
      DB.deleteItem('animales', id);
      Utils.showToast('Animal eliminado', 'success');
      renderInventarioTable();
    });
  }

  function deleteOrdenRecord(id) {
    Utils.confirmAction('¿Eliminar esta orden? Esta accion no se puede deshacer.').then(function (ok) {
      if (!ok) return;
      DB.deleteItem('ordenes', id);
      Utils.showToast('Orden eliminada', 'success');
      renderOrdenesTable();
    });
  }

  function deleteActividadRecord(id) {
    Utils.confirmAction('¿Eliminar esta actividad? Esta accion no se puede deshacer.').then(function (ok) {
      if (!ok) return;
      DB.deleteItem('actividades', id);
      Utils.showToast('Actividad eliminada', 'success');
      renderSaludTable();
    });
  }

  function deleteCostoRecord(id) {
    Utils.confirmAction('¿Eliminar este costo? Esta accion no se puede deshacer.').then(function (ok) {
      if (!ok) return;
      DB.deleteItem('costos', id);
      Utils.showToast('Costo eliminado', 'success');
      renderCostosTable();
      renderCostosMesActual();
    });
  }

  // ══════════════════════════════════════════
  //  FICHA DE ANIMAL (detalle completo)
  // ══════════════════════════════════════════

  function showAnimalDetail(animalId) {
    var animal = DB.getById('animales', animalId);
    if (!animal) {
      Utils.showToast('Animal no encontrado', 'error');
      return;
    }

    var edad = Utils.calcAge(animal.fechaNacimiento);

    // Historial de actividades
    var actividades = DB.getData('actividades').filter(function (a) { return a.animalId === animalId; });
    // Ordenes vinculadas
    var ordenes = DB.getData('ordenes').filter(function (o) { return o.animalId === animalId; });
    // Costos acumulados (buscar en campo animales separado por comas)
    var costos = DB.getData('costos').filter(function (c) {
      if (!c.animales) return false;
      return c.animales.indexOf(animalId) !== -1;
    });
    var totalCostos = costos.reduce(function (sum, c) { return sum + (parseFloat(c.total) || 0); }, 0);

    // Madre y padre
    var madre = animal.madreId ? DB.getById('animales', animal.madreId) : null;
    var padre = animal.padreId ? DB.getById('animales', animal.padreId) : null;

    var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:24px;">';
    html += fieldDisplay('ID', animal.id);
    html += fieldDisplay('Nombre', animal.nombre);
    html += fieldDisplay('Tipo', animal.tipo);
    html += fieldDisplay('Raza', animal.raza || '—');
    html += fieldDisplay('Sexo', animal.sexo);
    html += fieldDisplay('Edad', edad.text);
    html += fieldDisplay('Fecha Nacimiento', Utils.formatDate(animal.fechaNacimiento));
    html += fieldDisplay('Peso', animal.peso ? animal.peso + ' kg' : '—');
    html += fieldDisplay('Color / Marcas', animal.colorMarcas || '—');
    html += fieldDisplay('Estado', Utils.getStatusBadge(animal.estado));
    html += fieldDisplay('Ubicacion', animal.ubicacion || '—');
    html += fieldDisplay('Procedencia', animal.procedencia || '—');
    html += fieldDisplay('Fecha Ingreso', Utils.formatDate(animal.fechaIngreso));
    html += fieldDisplay('Costo Adquisicion', Utils.formatCOP(animal.costoAdquisicion));
    html += fieldDisplay('Madre', madre ? madre.nombre + ' (' + madre.id + ')' : '—');
    html += fieldDisplay('Padre', padre ? padre.nombre + ' (' + padre.id + ')' : '—');
    html += '</div>';

    if (animal.observaciones) {
      html += '<div style="margin-bottom:24px;padding:12px;background:#f9fafb;border-radius:8px;">' +
        '<strong>Observaciones:</strong> ' + animal.observaciones + '</div>';
    }

    // Historial de actividades
    html += '<h3 style="font-size:1rem;margin:0 0 8px 0;color:#374151;">Historial de Actividades (' + actividades.length + ')</h3>';
    if (actividades.length > 0) {
      html += '<table style="width:100%;font-size:0.8rem;border-collapse:collapse;margin-bottom:16px;">';
      html += '<tr style="background:#f3f4f6;"><th style="padding:6px 8px;text-align:left;">Fecha</th><th style="padding:6px 8px;text-align:left;">Tipo</th><th style="padding:6px 8px;text-align:left;">Descripcion</th><th style="padding:6px 8px;text-align:left;">Costo</th><th style="padding:6px 8px;text-align:left;">Estado</th></tr>';
      actividades.forEach(function (act) {
        html += '<tr style="border-bottom:1px solid #e5e7eb;">';
        html += '<td style="padding:6px 8px;">' + Utils.formatDate(act.fecha) + '</td>';
        html += '<td style="padding:6px 8px;">' + (act.tipoActividad || '') + '</td>';
        html += '<td style="padding:6px 8px;">' + (act.descripcion || '') + '</td>';
        html += '<td style="padding:6px 8px;">' + Utils.formatCOP(act.costo) + '</td>';
        html += '<td style="padding:6px 8px;">' + Utils.getStatusBadge(act.estado || 'Pendiente') + '</td>';
        html += '</tr>';
      });
      html += '</table>';
    } else {
      html += '<p style="color:#9ca3af;font-size:0.875rem;margin-bottom:16px;">Sin actividades registradas.</p>';
    }

    // Ordenes vinculadas
    html += '<h3 style="font-size:1rem;margin:0 0 8px 0;color:#374151;">Ordenes Vinculadas (' + ordenes.length + ')</h3>';
    if (ordenes.length > 0) {
      html += '<table style="width:100%;font-size:0.8rem;border-collapse:collapse;margin-bottom:16px;">';
      html += '<tr style="background:#f3f4f6;"><th style="padding:6px 8px;text-align:left;">Fecha</th><th style="padding:6px 8px;text-align:left;">Tipo</th><th style="padding:6px 8px;text-align:left;">Total</th><th style="padding:6px 8px;text-align:left;">Estado</th></tr>';
      ordenes.forEach(function (ord) {
        html += '<tr style="border-bottom:1px solid #e5e7eb;">';
        html += '<td style="padding:6px 8px;">' + Utils.formatDate(ord.fecha) + '</td>';
        html += '<td style="padding:6px 8px;">' + (ord.tipo || '') + '</td>';
        html += '<td style="padding:6px 8px;">' + Utils.formatCOP(ord.total) + '</td>';
        html += '<td style="padding:6px 8px;">' + Utils.getStatusBadge(ord.estadoOrden || 'Pendiente') + '</td>';
        html += '</tr>';
      });
      html += '</table>';
    } else {
      html += '<p style="color:#9ca3af;font-size:0.875rem;margin-bottom:16px;">Sin ordenes vinculadas.</p>';
    }

    // Resumen costos
    html += '<div style="padding:12px;background:#fef3c7;border-radius:8px;font-weight:600;color:#92400e;">' +
      'Costos acumulados: ' + Utils.formatCOP(totalCostos) +
      ' | Costo adquisicion: ' + Utils.formatCOP(animal.costoAdquisicion) +
      ' | Total invertido: ' + Utils.formatCOP(totalCostos + (parseFloat(animal.costoAdquisicion) || 0)) +
    '</div>';

    // Modal grande sin boton guardar
    closeModal();

    var overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto;';

    var modal = document.createElement('div');
    modal.id = 'modal-content';
    modal.style.cssText = 'background:#fff;border-radius:12px;width:100%;max-width:800px;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    var headerHtml = '<div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">' +
      '<h2 style="margin:0;font-size:1.25rem;color:#1f2937;">Ficha: ' + animal.nombre + ' (' + animal.id + ')</h2>' +
      '<button id="modal-close-btn" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#6b7280;padding:0;line-height:1;">&times;</button>' +
    '</div>';

    var bodyHtml = '<div style="padding:24px;max-height:70vh;overflow-y:auto;">' + html + '</div>';

    var footerHtml = '<div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:12px;">' +
      '<button id="modal-cancel-btn" class="btn btn-secondary">Cerrar</button>' +
      '<button id="modal-edit-btn" class="btn btn-primary">Editar Animal</button>' +
    '</div>';

    modal.innerHTML = headerHtml + bodyHtml + footerHtml;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.getElementById('modal-edit-btn').addEventListener('click', function () {
      closeModal();
      editAnimal(animalId);
    });

    var escHandler = function (e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  function fieldDisplay(label, value) {
    return '<div style="margin-bottom:8px;">' +
      '<span style="font-size:0.75rem;color:#6b7280;display:block;">' + label + '</span>' +
      '<span style="font-size:0.9rem;color:#1f2937;font-weight:500;">' + (value || '—') + '</span>' +
    '</div>';
  }

  // ══════════════════════════════════════════
  //  STATS
  // ══════════════════════════════════════════

  function getStats() {
    var animales = DB.getData('animales');
    var ordenes = DB.getData('ordenes');
    var actividades = DB.getData('actividades');
    var costos = DB.getData('costos');
    var hoy = new Date();
    var mesActual = hoy.toISOString().slice(0, 7); // YYYY-MM

    // Animales activos
    var animalesActivos = animales.filter(function (a) { return a.estado === 'Activo' || a.estado === 'En tratamiento' || a.estado === 'Cuarentena'; });

    // Animales por tipo
    var animalesPorTipo = {};
    animalesActivos.forEach(function (a) {
      animalesPorTipo[a.tipo] = (animalesPorTipo[a.tipo] || 0) + 1;
    });

    // Inversion total (costos de adquisicion)
    var totalInversion = animales.reduce(function (sum, a) {
      return sum + (parseFloat(a.costoAdquisicion) || 0);
    }, 0);

    // Total ventas (ordenes de venta completadas)
    var totalVentas = ordenes
      .filter(function (o) { return o.tipo === 'Venta' && o.estadoOrden === 'Completada'; })
      .reduce(function (sum, o) { return sum + (parseFloat(o.total) || 0); }, 0);

    // Costos del mes actual
    var costosMesActual = costos
      .filter(function (c) { return c.fecha && c.fecha.slice(0, 7) === mesActual; })
      .reduce(function (sum, c) { return sum + (parseFloat(c.total) || 0); }, 0);

    // Actividades pendientes
    var actPendientes = actividades.filter(function (a) { return a.estado === 'Pendiente' || a.estado === 'En curso'; });

    // Alertas vacunas (proximos 30 dias)
    var en30dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    var hoyStr = hoy.toISOString().slice(0, 10);
    var alertasVacunas = actividades.filter(function (a) {
      if (!a.proximaFecha) return false;
      if (a.estado === 'Completada') return false;
      return a.proximaFecha >= hoyStr && a.proximaFecha <= en30dias;
    }).map(function (a) {
      var animal = DB.getById('animales', a.animalId);
      return {
        nombre: animal ? animal.nombre : a.animalId,
        tipoActividad: a.tipoActividad,
        proximaFecha: a.proximaFecha,
      };
    });

    // Animales en tratamiento
    var alertasTratamiento = animales.filter(function (a) {
      return a.estado === 'En tratamiento' || a.estado === 'Cuarentena';
    });

    // Ordenes pendientes
    var ordenesPendientes = ordenes.filter(function (o) { return o.estadoOrden === 'Pendiente'; });

    return {
      totalAnimales: animalesActivos.length,
      animalesPorTipo: animalesPorTipo,
      totalInversion: totalInversion,
      totalVentas: totalVentas,
      costosMesActual: costosMesActual,
      actividadesPendientes: actPendientes.length,
      alertasVacunas: alertasVacunas,
      alertasTratamiento: alertasTratamiento,
      ordenesPendientes: ordenesPendientes,
    };
  }

  // ══════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════

  function populateSelect(selectEl, options, placeholder) {
    var html = '<option value="">' + (placeholder || '— Seleccionar —') + '</option>';
    options.forEach(function (opt) {
      html += '<option value="' + opt + '">' + opt + '</option>';
    });
    selectEl.innerHTML = html;
  }

  function populateSelectObjects(selectEl, options, placeholder) {
    var html = '<option value="">' + (placeholder || '— Seleccionar —') + '</option>';
    options.forEach(function (opt) {
      html += '<option value="' + opt.value + '">' + opt.label + '</option>';
    });
    selectEl.innerHTML = html;
  }

  // ══════════════════════════════════════════
  //  HUEVOS (Conteo diario)
  // ══════════════════════════════════════════

  function initHuevos() {
    renderHuevosStats();
    renderHuevosTable();

    var btnAdd = document.getElementById('btnAddHuevo');
    if (btnAdd) {
      btnAdd.addEventListener('click', function() {
        showHuevoModal();
      });
    }

    // Filtros
    var searchInput = document.getElementById('searchHuevos');
    if (searchInput) {
      searchInput.addEventListener('input', function() { renderHuevosTable(); });
    }
    var filterMes = document.getElementById('filterMesHuevos');
    if (filterMes) {
      filterMes.addEventListener('change', function() { renderHuevosTable(); });
    }
    var filterUbicacion = document.getElementById('filterUbicacionHuevos');
    if (filterUbicacion) {
      filterUbicacion.addEventListener('change', function() { renderHuevosTable(); });
    }

    // Grafico
    renderHuevosChart();
  }

  function getHuevosFiltered() {
    var data = DB.getData('huevos') || [];
    var search = (document.getElementById('searchHuevos') || {}).value || '';
    var filterMes = (document.getElementById('filterMesHuevos') || {}).value || '';
    var filterUbicacion = (document.getElementById('filterUbicacionHuevos') || {}).value || '';

    return data.filter(function(h) {
      var matchSearch = !search ||
        (h.observaciones || '').toLowerCase().indexOf(search.toLowerCase()) !== -1 ||
        (h.ubicacion || '').toLowerCase().indexOf(search.toLowerCase()) !== -1;
      var matchMes = !filterMes || (h.fecha || '').substring(0, 7) === filterMes;
      var matchUbicacion = !filterUbicacion || h.ubicacion === filterUbicacion;
      return matchSearch && matchMes && matchUbicacion;
    }).sort(function(a, b) {
      return (b.fecha || '').localeCompare(a.fecha || '');
    });
  }

  function renderHuevosStats() {
    var data = DB.getData('huevos') || [];
    var hoy = new Date().toISOString().slice(0, 10);
    var inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    var semanaStr = inicioSemana.toISOString().slice(0, 10);
    var mesStr = hoy.substring(0, 7);

    var huevosHoy = 0, huevosSemana = 0, huevosMes = 0, diasMes = 0;
    var diasUnicos = {};

    data.forEach(function(h) {
      var buenos = (parseInt(h.cantidad) || 0) - (parseInt(h.rotos) || 0);
      if (h.fecha === hoy) huevosHoy += buenos;
      if (h.fecha >= semanaStr) huevosSemana += buenos;
      if ((h.fecha || '').substring(0, 7) === mesStr) {
        huevosMes += buenos;
        diasUnicos[h.fecha] = true;
      }
    });

    diasMes = Object.keys(diasUnicos).length || 1;

    var elHoy = document.getElementById('statHuevosHoy');
    var elSemana = document.getElementById('statHuevosSemana');
    var elMes = document.getElementById('statHuevosMes');
    var elPromedio = document.getElementById('statPromedioDiario');

    if (elHoy) elHoy.textContent = huevosHoy;
    if (elSemana) elSemana.textContent = huevosSemana;
    if (elMes) elMes.textContent = huevosMes;
    if (elPromedio) elPromedio.textContent = Math.round(huevosMes / diasMes);
  }

  function renderHuevosTable() {
    var tbody = document.getElementById('tbodyHuevos');
    var emptyState = document.getElementById('emptyHuevos');
    if (!tbody) return;

    var data = getHuevosFiltered();

    if (data.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    var html = '';
    data.forEach(function(h) {
      var buenos = (parseInt(h.cantidad) || 0) - (parseInt(h.rotos) || 0);
      html += '<tr>' +
        '<td>' + Utils.formatDate(h.fecha) + '</td>' +
        '<td><strong>' + (h.cantidad || 0) + '</strong></td>' +
        '<td>' + (h.rotos || 0) + '</td>' +
        '<td class="text-success font-bold">' + buenos + '</td>' +
        '<td>' + (h.ubicacion || '-') + '</td>' +
        '<td>' + (h.observaciones || '-') + '</td>' +
        '<td class="actions-cell">' +
          '<button class="btn btn-sm btn-ghost" onclick="App.editHuevo(\'' + h.id + '\')" title="Editar">&#9999;&#65039;</button>' +
          '<button class="btn btn-sm btn-ghost text-danger" onclick="App.deleteHuevo(\'' + h.id + '\')" title="Eliminar">&#128465;&#65039;</button>' +
        '</td>' +
      '</tr>';
    });
    tbody.innerHTML = html;
  }

  function showHuevoModal(editId) {
    var item = editId ? DB.getById('huevos', editId) : null;
    var isEdit = !!item;
    var title = isEdit ? 'Editar Conteo' : 'Registrar Conteo de Huevos';

    var today = new Date().toISOString().slice(0, 10);

    var formHtml = '<form id="huevoForm">' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label class="form-label">Fecha *</label>' +
          '<input type="date" class="form-control" name="fecha" value="' + (item ? item.fecha : today) + '" required>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Cantidad Total *</label>' +
          '<input type="number" class="form-control" name="cantidad" min="0" value="' + (item ? item.cantidad : '') + '" placeholder="Ej: 15" required>' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label class="form-label">Huevos Rotos</label>' +
          '<input type="number" class="form-control" name="rotos" min="0" value="' + (item ? (item.rotos || 0) : '0') + '" placeholder="0">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Ubicacion</label>' +
          '<select class="form-select" name="ubicacion">' +
            '<option value="Gallinero"' + (item && item.ubicacion === 'Gallinero' ? ' selected' : '') + '>Gallinero</option>' +
            '<option value="Gallinero 2"' + (item && item.ubicacion === 'Gallinero 2' ? ' selected' : '') + '>Gallinero 2</option>' +
            '<option value="Libre pastoreo"' + (item && item.ubicacion === 'Libre pastoreo' ? ' selected' : '') + '>Libre pastoreo</option>' +
            '<option value="Otro"' + (item && item.ubicacion === 'Otro' ? ' selected' : '') + '>Otro</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Observaciones</label>' +
        '<textarea class="form-control" name="observaciones" rows="2" placeholder="Notas adicionales...">' + (item ? (item.observaciones || '') : '') + '</textarea>' +
      '</div>' +
    '</form>';

    var modalHtml = '<div class="modal-overlay" onclick="if(event.target===this)this.remove()">' +
      '<div class="modal-content">' +
        '<div class="modal-header">' +
          '<h3>' + title + '</h3>' +
          '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' + formHtml + '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancelar</button>' +
          '<button class="btn btn-primary" id="btnSaveHuevo">' + (isEdit ? 'Guardar' : 'Registrar') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';

    var container = document.getElementById('modalContainer');
    container.innerHTML = modalHtml;

    document.getElementById('btnSaveHuevo').addEventListener('click', function() {
      var form = document.getElementById('huevoForm');
      var formData = {
        fecha: form.fecha.value,
        cantidad: parseInt(form.cantidad.value) || 0,
        rotos: parseInt(form.rotos.value) || 0,
        ubicacion: form.ubicacion.value,
        observaciones: form.observaciones.value
      };

      if (!formData.fecha || !formData.cantidad) {
        Utils.showToast('Fecha y cantidad son obligatorios', 'error');
        return;
      }

      if (isEdit) {
        DB.updateItem('huevos', editId, formData).then(function() {
          Utils.showToast('Conteo actualizado', 'success');
          container.innerHTML = '';
          renderHuevosStats();
          renderHuevosTable();
          renderHuevosChart();
        });
      } else {
        DB.addItem('huevos', formData).then(function() {
          Utils.showToast('Conteo registrado', 'success');
          container.innerHTML = '';
          renderHuevosStats();
          renderHuevosTable();
          renderHuevosChart();
        });
      }
    });
  }

  function editHuevo(id) {
    showHuevoModal(id);
  }

  function deleteHuevo(id) {
    if (!confirm('¿Eliminar este registro de huevos?')) return;
    DB.deleteItem('huevos', id).then(function() {
      Utils.showToast('Registro eliminado', 'success');
      renderHuevosStats();
      renderHuevosTable();
      renderHuevosChart();
    });
  }

  function renderHuevosChart() {
    var canvas = document.getElementById('chart-huevos-diario');
    if (!canvas || typeof Chart === 'undefined') return;

    var data = DB.getData('huevos') || [];
    // Ultimos 30 dias
    var dias = {};
    var hoy = new Date();
    for (var i = 29; i >= 0; i--) {
      var d = new Date(hoy);
      d.setDate(d.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      dias[key] = 0;
    }

    data.forEach(function(h) {
      if (dias[h.fecha] !== undefined) {
        dias[h.fecha] += (parseInt(h.cantidad) || 0) - (parseInt(h.rotos) || 0);
      }
    });

    var labels = Object.keys(dias).map(function(d) { return d.slice(5); }); // MM-DD
    var values = Object.values(dias);

    // Destroy existing chart if any
    if (canvas._chartInstance) {
      canvas._chartInstance.destroy();
    }

    canvas._chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Huevos buenos',
          data: values,
          backgroundColor: 'rgba(45, 90, 61, 0.6)',
          borderColor: '#2D5A3D',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { ticks: { maxRotation: 45, font: { size: 10 } } }
        }
      }
    });
  }

  // ══════════════════════════════════════════
  //  API PUBLICA
  // ══════════════════════════════════════════

  return {
    currentPage: currentPage,
    init: init,
    initSidebar: initSidebar,
    toggleSidebar: toggleSidebar,
    initExportImport: initExportImport,
    handleImport: handleImport,
    exportData: function() { DB.exportJSON(); Utils.showToast('Backup exportado', 'success'); },
    initDashboard: initDashboard,
    initInventario: initInventario,
    initOrdenes: initOrdenes,
    initSalud: initSalud,
    initCostos: initCostos,
    renderTable: renderTable,
    openModal: openModal,
    closeModal: closeModal,
    getAnimalForm: getAnimalForm,
    getOrdenForm: getOrdenForm,
    getActividadForm: getActividadForm,
    getCostoForm: getCostoForm,
    saveAnimal: saveAnimal,
    saveOrden: saveOrden,
    saveActividad: saveActividad,
    saveCosto: saveCosto,
    showAnimalDetail: showAnimalDetail,
    editAnimal: editAnimal,
    editOrden: editOrden,
    editActividad: editActividad,
    editCosto: editCosto,
    deleteAnimalRecord: deleteAnimalRecord,
    deleteOrdenRecord: deleteOrdenRecord,
    deleteActividadRecord: deleteActividadRecord,
    deleteCostoRecord: deleteCostoRecord,
    editHuevo: editHuevo,
    deleteHuevo: deleteHuevo,
    getStats: getStats,
  };
})();

window.App = App;

document.addEventListener('DOMContentLoaded', function () {
  App.init();
});
