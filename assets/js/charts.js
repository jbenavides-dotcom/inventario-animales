/**
 * Charts.js — Gráficos Chart.js para el dashboard de inventario de animales
 * Requiere: Chart.js (CDN), window.DB, window.Utils
 */
(function () {
  'use strict';

  const PALETTE = [
    '#5C3D2E', '#8B6914', '#2D5A3D', '#D4A574', '#A0522D',
    '#6B8E23', '#CD853F', '#8FBC8F', '#DEB887'
  ];

  const MONTH_COLORS = ['#5C3D2E', '#2D5A3D', '#8B6914'];

  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  function formatCOP(value) {
    if (window.Utils && window.Utils.formatCOP) {
      return window.Utils.formatCOP(value);
    }
    return '$' + Number(value).toLocaleString('es-CO');
  }

  function getMonthKey(date) {
    const d = new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function getMonthLabel(key) {
    const [year, month] = key.split('-');
    return MONTH_NAMES[parseInt(month, 10) - 1] + ' ' + year;
  }

  function getLastNMonthKeys(n) {
    const keys = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(getMonthKey(d));
    }
    return keys;
  }

  function showEmptyMessage(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.fillText(message || 'Sin datos disponibles', canvas.width / 2, canvas.height / 2);
  }

  // ─── Charts Object ───────────────────────────────────────────────

  const Charts = {
    instances: {},

    destroyAll: function () {
      Object.keys(Charts.instances).forEach(function (id) {
        Charts.destroyChart(id);
      });
    },

    destroyChart: function (id) {
      if (Charts.instances[id]) {
        Charts.instances[id].destroy();
        delete Charts.instances[id];
      }
    },

    // ── 1. Dona: distribución de animales activos por tipo ──────
    animalsByType: function (canvasId) {
      Charts.destroyChart(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const animales = (window.DB && window.DB.getData('animales')) || [];
      const activos = animales.filter(function (a) {
        return a.estado === 'Activo';
      });

      if (activos.length === 0) {
        showEmptyMessage(canvasId, 'No hay animales activos');
        return;
      }

      const grupos = {};
      activos.forEach(function (a) {
        var tipo = a.tipo || 'Sin tipo';
        grupos[tipo] = (grupos[tipo] || 0) + 1;
      });

      const labels = Object.keys(grupos);
      const data = labels.map(function (l) { return grupos[l]; });

      Charts.instances[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: PALETTE.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          cutout: '60%',
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    },

    // ── 2. Barras verticales: costos por categoría últimos 3 meses ──
    monthlyCosts: function (canvasId) {
      Charts.destroyChart(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const costos = (window.DB && window.DB.getData('costos')) || [];

      if (costos.length === 0) {
        showEmptyMessage(canvasId, 'No hay costos registrados');
        return;
      }

      const last3 = getLastNMonthKeys(3);

      // Agrupar por mes y categoría
      const categorias = new Set();
      const porMesCategoria = {};

      costos.forEach(function (c) {
        var mk = getMonthKey(c.fecha);
        if (last3.indexOf(mk) === -1) return;
        var cat = c.categoria || 'Sin categoría';
        categorias.add(cat);
        if (!porMesCategoria[mk]) porMesCategoria[mk] = {};
        porMesCategoria[mk][cat] = (porMesCategoria[mk][cat] || 0) + Number(c.monto || c.valor || 0);
      });

      const catLabels = Array.from(categorias);

      if (catLabels.length === 0) {
        showEmptyMessage(canvasId, 'Sin costos en los últimos 3 meses');
        return;
      }

      const datasets = last3.map(function (mk, i) {
        return {
          label: getMonthLabel(mk),
          data: catLabels.map(function (cat) {
            return (porMesCategoria[mk] && porMesCategoria[mk][cat]) || 0;
          }),
          backgroundColor: MONTH_COLORS[i] || PALETTE[i],
          borderRadius: 4
        };
      });

      Charts.instances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: catLabels,
          datasets: datasets
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return formatCOP(value);
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ctx.dataset.label + ': ' + formatCOP(ctx.parsed.y);
                }
              }
            }
          }
        }
      });
    },

    // ── 3. Línea: evolución total animales activos últimos 6 meses ──
    inventoryEvolution: function (canvasId) {
      Charts.destroyChart(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const animales = (window.DB && window.DB.getData('animales')) || [];

      if (animales.length === 0) {
        showEmptyMessage(canvasId, 'No hay animales registrados');
        return;
      }

      const last6 = getLastNMonthKeys(6);

      // Para cada mes, contar cuántos animales estaban activos
      // (fechaIngreso <= fin de mes Y estado Activo o sin fechaSalida antes de ese mes)
      const counts = last6.map(function (mk) {
        var parts = mk.split('-');
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        var endOfMonth = new Date(year, month, 0, 23, 59, 59);

        return animales.filter(function (a) {
          if (!a.fechaIngreso) return false;
          var ingreso = new Date(a.fechaIngreso);
          if (ingreso > endOfMonth) return false;
          // Si tiene fecha de salida y es antes del fin del mes, no contar
          if (a.fechaSalida) {
            var salida = new Date(a.fechaSalida);
            if (salida < new Date(year, month - 1, 1)) return false;
          }
          return true;
        }).length;
      });

      Charts.instances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
          labels: last6.map(getMonthLabel),
          datasets: [{
            label: 'Animales activos',
            data: counts,
            borderColor: '#2D5A3D',
            backgroundColor: 'rgba(45, 90, 61, 0.15)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#2D5A3D',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    },

    // ── 4. Barras horizontales: top 5 animales por costo total ──
    topAnimalsByCost: function (canvasId) {
      Charts.destroyChart(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const animales = (window.DB && window.DB.getData('animales')) || [];
      const costos = (window.DB && window.DB.getData('costos')) || [];

      if (animales.length === 0) {
        showEmptyMessage(canvasId, 'No hay animales registrados');
        return;
      }

      // Mapear costos por animalId
      const costosPorAnimal = {};
      costos.forEach(function (c) {
        var id = c.animalId;
        if (!id) return;
        costosPorAnimal[id] = (costosPorAnimal[id] || 0) + Number(c.monto || c.valor || 0);
      });

      // Calcular costo total por animal
      var ranked = animales.map(function (a) {
        var costoAdq = Number(a.costoAdquisicion || 0);

        // Sumar costos de actividades internas
        var costoActividades = 0;
        if (a.actividades && Array.isArray(a.actividades)) {
          a.actividades.forEach(function (act) {
            costoActividades += Number(act.costo || 0);
          });
        }

        // Sumar costos relacionados de la tabla costos
        var costosRelacionados = costosPorAnimal[a.id] || 0;

        return {
          nombre: a.nombre || a.identificacion || ('Animal #' + a.id),
          total: costoAdq + costoActividades + costosRelacionados
        };
      });

      // Ordenar de mayor a menor y tomar top 5
      ranked.sort(function (a, b) { return b.total - a.total; });
      ranked = ranked.slice(0, 5);

      if (ranked.length === 0 || ranked[0].total === 0) {
        showEmptyMessage(canvasId, 'Sin datos de costos por animal');
        return;
      }

      Charts.instances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ranked.map(function (r) { return r.nombre; }),
          datasets: [{
            label: 'Costo total',
            data: ranked.map(function (r) { return r.total; }),
            backgroundColor: PALETTE.slice(0, ranked.length),
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return formatCOP(value);
                }
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return formatCOP(ctx.parsed.x);
                }
              }
            }
          }
        }
      });
    },

    // ── 5. Dona: distribución total de costos por categoría ──
    costsByCategory: function (canvasId) {
      Charts.destroyChart(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const costos = (window.DB && window.DB.getData('costos')) || [];

      if (costos.length === 0) {
        showEmptyMessage(canvasId, 'No hay costos registrados');
        return;
      }

      const grupos = {};
      costos.forEach(function (c) {
        var cat = c.categoria || 'Sin categoría';
        grupos[cat] = (grupos[cat] || 0) + Number(c.monto || c.valor || 0);
      });

      const labels = Object.keys(grupos);
      const data = labels.map(function (l) { return grupos[l]; });

      if (labels.length === 0) {
        showEmptyMessage(canvasId, 'Sin datos de costos');
        return;
      }

      Charts.instances[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: PALETTE.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          cutout: '60%',
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                  var pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                  return ctx.label + ': ' + formatCOP(ctx.parsed) + ' (' + pct + '%)';
                }
              }
            }
          }
        }
      });
    },

    // ── Dashboard init ──────────────────────────────────────────
    initDashboard: function () {
      Charts.destroyAll();
      Charts.animalsByType('chart-animals-type');
      Charts.monthlyCosts('chart-monthly-costs');
      Charts.inventoryEvolution('chart-inventory-evolution');
      Charts.topAnimalsByCost('chart-top-costs');
    }
  };

  window.Charts = Charts;
})();
