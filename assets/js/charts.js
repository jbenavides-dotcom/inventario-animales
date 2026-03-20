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

    // ── 6. Barras: producción de huevos últimos 7 días ──────────
    huevosLast7Days: function (canvasId) {
      Charts.destroyChart(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const huevos = (window.DB && window.DB.getData('huevos')) || [];

      // Construir mapa de los últimos 7 días
      const dias = {};
      const hoy = new Date();
      const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const labels = [];
      const keys = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(hoy);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        keys.push(key);
        dias[key] = 0;
        const label = i === 0 ? 'Hoy' : DAY_NAMES[d.getDay()];
        labels.push(label);
      }

      huevos.forEach(function (h) {
        if (dias[h.fecha] !== undefined) {
          dias[h.fecha] += (parseInt(h.cantidad) || 0) - (parseInt(h.rotos) || 0);
        }
      });

      const values = keys.map(function (k) { return dias[k]; });
      const hasData = values.some(function (v) { return v > 0; });

      if (!hasData) {
        const parent = canvas.closest('.card');
        if (parent) {
          const existing = parent.querySelector('.chart-empty-msg');
          if (!existing) {
            const msg = document.createElement('div');
            msg.className = 'chart-empty-msg';
            msg.style.cssText = 'text-align:center;padding:2rem;color:#9ca3af;font-size:0.88rem;';
            msg.innerHTML = '<div style="font-size:2rem;margin-bottom:0.5rem">🥚</div>' +
              '<p>Aún no hay registros de huevos esta semana.</p>' +
              '<a href="huevos.html?action=addHuevo" style="display:inline-block;margin-top:0.75rem;padding:0.4rem 1rem;background:#5C3D2E;color:#fff;border-radius:6px;font-size:0.82rem;text-decoration:none;">+ Registrar hoy</a>';
            canvas.parentNode.insertBefore(msg, canvas);
            canvas.style.display = 'none';
          }
        }
        return;
      }

      Charts.instances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Huevos buenos',
            data: values,
            backgroundColor: keys.map(function (k, i) {
              return i === 6 ? 'rgba(45, 90, 61, 0.85)' : 'rgba(45, 90, 61, 0.45)';
            }),
            borderColor: '#2D5A3D',
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ctx.parsed.y + ' huevos';
                }
              }
            }
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    },

    // ── 7. Dona: animales por sexo (cuando solo hay 1 tipo) ─────
    animalsBySex: function (canvasId) {
      Charts.destroyChart(canvasId);
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const animales = (window.DB && window.DB.getData('animales')) || [];
      const activos = animales.filter(function (a) { return a.estado === 'Activo'; });

      const grupos = { 'Macho': 0, 'Hembra': 0, 'Indeterminado': 0 };
      activos.forEach(function (a) {
        var s = a.sexo || 'Indeterminado';
        if (grupos[s] !== undefined) {
          grupos[s]++;
        } else {
          grupos['Indeterminado']++;
        }
      });

      const labels = Object.keys(grupos).filter(function (k) { return grupos[k] > 0; });
      const data = labels.map(function (l) { return grupos[l]; });
      const colors = { 'Macho': '#5C3D2E', 'Hembra': '#C084FC', 'Indeterminado': '#94A3B8' };

      Charts.instances[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: labels.map(function (l) { return colors[l] || '#8B6914'; }),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          cutout: '60%',
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    },

    // ── Dashboard init ──────────────────────────────────────────
    initDashboard: function () {
      Charts.destroyAll();

      // Decidir si mostrar por tipo o por sexo
      const animales = (window.DB && window.DB.getData('animales')) || [];
      const activos = animales.filter(function (a) { return a.estado === 'Activo'; });
      const tipos = {};
      activos.forEach(function (a) {
        var t = a.tipo || 'Sin tipo';
        tipos[t] = (tipos[t] || 0) + 1;
      });

      if (Object.keys(tipos).length <= 1 && activos.length > 0) {
        // Solo 1 tipo → mostrar por sexo
        const cardTitle = document.querySelector('#chart-animals-type')
          ? document.querySelector('#chart-animals-type').closest('.card') : null;
        if (cardTitle) {
          const h3 = cardTitle.querySelector('h3');
          if (h3) h3.textContent = 'Animales por Sexo';
        }
        Charts.animalsBySex('chart-animals-type');
      } else {
        Charts.animalsByType('chart-animals-type');
      }

      Charts.monthlyCosts('chart-monthly-costs');
      Charts.inventoryEvolution('chart-inventory-evolution');
      Charts.topAnimalsByCost('chart-top-costs');
      Charts.huevosLast7Days('chart-huevos-7dias');
    }
  };

  window.Charts = Charts;
})();
