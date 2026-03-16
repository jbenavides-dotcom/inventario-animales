/**
 * utils.js — Helpers
 * Inventario de Animales de Finca
 */

const Utils = (function () {

  function formatCOP(number) {
    if (number === null || number === undefined || isNaN(number)) return '$0';
    return '$' + Number(number).toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function parseDate(displayDate) {
    if (!displayDate) return '';
    var parts = displayDate.split('/');
    if (parts.length !== 3) return displayDate;
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  }

  function calcAge(fechaNacimiento) {
    if (!fechaNacimiento) return { years: 0, months: 0, text: 'Desconocida' };
    var birth = new Date(fechaNacimiento + 'T00:00:00');
    var now = new Date();
    var years = now.getFullYear() - birth.getFullYear();
    var months = now.getMonth() - birth.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (now.getDate() < birth.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }
    var text = '';
    if (years > 0) text += years + (years === 1 ? ' año' : ' años');
    if (months > 0) {
      if (text) text += ', ';
      text += months + (months === 1 ? ' mes' : ' meses');
    }
    if (!text) text = 'Menos de 1 mes';
    return { years: years, months: months, text: text };
  }

  var STATUS_COLORS = {
    'Activo':          { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
    'Vendido':         { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
    'Fallecido':       { bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' },
    'En tratamiento':  { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
    'Cuarentena':      { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
    'Prestado':        { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
  };

  function getStatusBadge(estado) {
    var s = STATUS_COLORS[estado] || { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' };
    return '<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:0.75rem;font-weight:600;' +
      'background:' + s.bg + ';color:' + s.color + ';border:1px solid ' + s.border + ';">' +
      estado + '</span>';
  }

  function showToast(message, type) {
    type = type || 'info';
    var colors = {
      success: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
      error:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
      warning: { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
      info:    { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
    };
    var c = colors[type] || colors.info;

    // Contenedor de toasts
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.style.cssText = 'padding:12px 20px;border-radius:8px;font-size:0.875rem;font-weight:500;' +
      'box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s,transform 0.3s;opacity:0;transform:translateX(20px);' +
      'background:' + c.bg + ';color:' + c.color + ';border:1px solid ' + c.border + ';';
    toast.textContent = message;
    container.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });

    // Remover tras 3 segundos
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3000);
  }

  function confirmAction(message) {
    return new Promise(function (resolve) {
      resolve(window.confirm(message));
    });
  }

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  function sortTable(data, column, direction) {
    direction = direction || 'asc';
    var sorted = data.slice();
    sorted.sort(function (a, b) {
      var valA = a[column];
      var valB = b[column];
      // Intentar comparar como números
      var numA = parseFloat(valA);
      var numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }
      // Comparar como strings
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function filterBySearch(data, searchTerm, fields) {
    if (!searchTerm) return data;
    var term = searchTerm.toLowerCase();
    return data.filter(function (item) {
      return fields.some(function (field) {
        var val = String(item[field] || '').toLowerCase();
        return val.indexOf(term) !== -1;
      });
    });
  }

  // ── API pública ──

  return {
    formatCOP: formatCOP,
    formatDate: formatDate,
    parseDate: parseDate,
    calcAge: calcAge,
    getStatusBadge: getStatusBadge,
    showToast: showToast,
    confirmAction: confirmAction,
    debounce: debounce,
    sortTable: sortTable,
    filterBySearch: filterBySearch,
  };
})();

window.Utils = Utils;
