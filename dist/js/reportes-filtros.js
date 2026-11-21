// Filtros y totales de los reportes financieros del agente (RF-09).
// No dependen del navegador, así que se pueden probar con pruebas unitarias.
// En el navegador queda como window.ARSReportesFiltros; en Node se importa con require().
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ARSReportesFiltros = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const txt = (valor) => String(valor ?? '').trim();
  const norm = (valor) => txt(valor).toLowerCase();
  const num = (valor) => Number(valor) || 0;

  const ETIQUETAS_ESTADO = {
    pendiente_revision: 'Pendiente de revisión',
    enviado_clinica: 'Enviado a la clínica',
    aceptado_clinica: 'Aceptado por la clínica',
    pendiente: 'Pendiente',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada'
  };

  // Convierte una fecha (AAAA-MM-DD, ISO o cualquier texto válido para Date) a AAAA-MM-DD.
  // Devuelve '' si no hay fecha válida (por ejemplo '-' o vacío).
  function normalizarFecha(valor) {
    const t = txt(valor);
    if (!t) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return '';
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  function etiquetaEstado(estado) {
    const clave = norm(estado);
    return ETIQUETAS_ESTADO[clave] || (txt(estado) || 'Sin estado');
  }

  // filtros: { clinicaId, estado, desde, hasta }. Un filtro vacío no se aplica.
  // Si hay fechas y la factura no tiene fecha válida, no entra en el resultado.
  function filtrarFacturas(facturas, filtros) {
    const lista = Array.isArray(facturas) ? facturas : [];
    const f = filtros || {};
    const clinicaId = txt(f.clinicaId);
    const estado = norm(f.estado);
    const desde = normalizarFecha(f.desde);
    const hasta = normalizarFecha(f.hasta);
    return lista.filter((fac) => {
      if (!fac) return false;
      if (clinicaId && txt(fac.clinicaId) !== clinicaId) return false;
      if (estado && norm(fac.estado) !== estado) return false;
      if (desde || hasta) {
        const fecha = normalizarFecha(fac.fecha);
        if (!fecha) return false;
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
      }
      return true;
    });
  }

  // El monto pendiente de la ARS es el que cubre el seguro mientras la clínica no haya aceptado el pago.
  const pendienteARS = (fac) => (norm(fac.estado) === 'aceptado_clinica' ? 0 : num(fac.seguro));

  function totales(facturas) {
    const lista = Array.isArray(facturas) ? facturas : [];
    const seguro = lista.reduce((s, fac) => s + num(fac && fac.seguro), 0);
    const paciente = lista.reduce((s, fac) => s + num(fac && fac.paciente), 0);
    return { cantidad: lista.length, seguro, paciente, facturado: seguro + paciente };
  }

  function resumenPorClinica(facturas) {
    const lista = Array.isArray(facturas) ? facturas : [];
    const mapa = new Map();
    lista.forEach((fac) => {
      if (!fac) return;
      const clave = txt(fac.clinicaId) || txt(fac.clinica);
      if (!mapa.has(clave)) {
        mapa.set(clave, { clinicaId: txt(fac.clinicaId), clinica: txt(fac.clinica) || 'Clínica sin nombre', facturas: 0, totalARS: 0, totalPaciente: 0, pendienteARS: 0 });
      }
      const fila = mapa.get(clave);
      fila.facturas += 1;
      fila.totalARS += num(fac.seguro);
      fila.totalPaciente += num(fac.paciente);
      fila.pendienteARS += pendienteARS(fac);
    });
    return Array.from(mapa.values()).sort((a, b) => a.clinica.localeCompare(b.clinica, 'es'));
  }

  // Estados que existen en los datos, sin repetir, para llenar la lista de filtro.
  function estadosDisponibles(facturas) {
    const lista = Array.isArray(facturas) ? facturas : [];
    const vistos = new Map();
    lista.forEach((fac) => {
      const clave = norm(fac && fac.estado);
      if (clave && !vistos.has(clave)) vistos.set(clave, { valor: clave, etiqueta: etiquetaEstado(clave) });
    });
    return Array.from(vistos.values()).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
  }

  return { normalizarFecha, etiquetaEstado, filtrarFacturas, totales, resumenPorClinica, estadosDisponibles };
});
