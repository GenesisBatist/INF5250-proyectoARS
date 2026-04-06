(function () {
  const PAGE_DEFAULT = 5;
  let paginaHistorialPago = 1;

  const money = (value) => `RD$ ${Number(value || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

  function cargarHeaderUsuario() {
    try {
      const user = window.ARSAuth?.getCurrentUser?.();
      if (user) {
        setText('userName', user.nombre || user.username || 'Agente');
        setText('userFullName', user.nombre || user.username || 'Agente ARS');
      }
      document.getElementById('btnLogout')?.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.ARSAuth?.logout) window.ARSAuth.logout();
      });
    } catch (e) {}
  }

  function obtenerDatos() {
    const reportesClinica = window.ARSFinanzasSync?.getReportes?.() || [];
    const facturas = window.ARSFinanzasSync?.getFacturasView?.() || [];
    const clinicas = (() => { try { return JSON.parse(localStorage.getItem('ars_clinicas') || '[]'); } catch { return []; } })();
    const afiliados = (() => { try { return JSON.parse(localStorage.getItem('ars_afiliados') || '[]'); } catch { return []; } })();
    const autorizaciones = (() => { try { return JSON.parse(localStorage.getItem('ars_autorizaciones') || '[]'); } catch { return []; } })();
    return { afiliados, autorizaciones, facturas, clinicas, reportesClinica };
  }

  function cargarResumenes() {
    const { afiliados, autorizaciones, facturas, clinicas, reportesClinica } = obtenerDatos();
    setText('totalAfiliados', afiliados.length);
    setText('totalAutorizaciones', autorizaciones.length);
    setText('totalFacturas', facturas.length);
    setText('totalClinicas', clinicas.length);

    const pendientes = autorizaciones.filter(a => !!a.autoGenerada && String(a.estado || '').toLowerCase() === 'pendiente').length;
    const aprobadas = autorizaciones.filter(a => !!a.autoGenerada && ['aprobada','validada','comprobada'].includes(String(a.estado || '').toLowerCase())).length;
    const rechazadas = autorizaciones.filter(a => !!a.autoGenerada && String(a.estado || '').toLowerCase() === 'rechazada').length;
    setText('autPendientes', pendientes);
    setText('autAprobadas', aprobadas);
    setText('autRechazadas', rechazadas);

    const totalFacturado = reportesClinica.reduce((s, r) => s + Number(r.totalSeguro || 0) + Number(r.totalPaciente || 0), 0);
    const totalSeguro = reportesClinica.reduce((s, r) => s + Number(r.totalSeguro || 0), 0);
    const totalPaciente = reportesClinica.reduce((s, r) => s + Number(r.totalPaciente || 0), 0);
    setText('montoFacturado', money(totalFacturado));
    setText('montoSeguro', money(totalSeguro));
    setText('montoPaciente', money(totalPaciente));
  }

  function construirHistorialPago() {
    const { reportesClinica } = obtenerDatos();
    return reportesClinica.map(r => ({
      clinica: r.clinicaNombre || 'Clínica sin nombre',
      servicios: Number(r.totalProcesosClinicos || 0),
      facturas: Number(r.totalFacturasAutorizadas || 0),
      totalARS: Number(r.totalSeguro || 0),
      totalPaciente: Number(r.totalPaciente || 0),
      pendienteARS: String(r.estadoPago || '').toLowerCase() === 'aceptado_clinica' ? 0 : Number(r.totalSeguro || 0)
    })).sort((a, b) => a.clinica.localeCompare(b.clinica, 'es'));
  }

  function getHistorialFiltrado() {
    const term = (document.getElementById('buscarHistorialPago')?.value || '').toLowerCase().trim();
    let rows = construirHistorialPago();
    if (term) rows = rows.filter(r => r.clinica.toLowerCase().includes(term));
    return rows;
  }

  const getPageSize = () => Number(document.getElementById('limiteHistorialPago')?.value || PAGE_DEFAULT);

  function renderHistorialPago() {
    const tbody = document.getElementById('tablaClinicasResumen');
    const info = document.getElementById('infoHistorialPago');
    const btnPrev = document.getElementById('btnPrevHistorialPago');
    const btnNext = document.getElementById('btnNextHistorialPago');
    if (!tbody) return;
    const rows = getHistorialFiltrado();
    const pageSize = getPageSize();
    const total = rows.length;
    const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
    if (paginaHistorialPago > totalPaginas) paginaHistorialPago = totalPaginas;
    const inicio = (paginaHistorialPago - 1) * pageSize;
    const fin = inicio + pageSize;
    const visibles = rows.slice(inicio, fin);

    tbody.innerHTML = visibles.length ? visibles.map(r => `
      <tr>
        <td>${escapeHtml(r.clinica)}</td>
        <td>${r.servicios}</td>
        <td>${r.facturas}</td>
        <td>${money(r.totalARS)}</td>
        <td>${money(r.totalPaciente)}</td>
        <td>${money(r.pendienteARS)}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4 text-muted">No hay datos para mostrar.</td></tr>';

    if (info) info.textContent = `Mostrando ${total ? inicio + 1 : 0}-${total ? Math.min(fin, total) : 0} de ${total} clínicas`;
    if (btnPrev) btnPrev.disabled = paginaHistorialPago <= 1;
    if (btnNext) btnNext.disabled = paginaHistorialPago >= totalPaginas;
  }

  function bindHistorialPago() {
    document.getElementById('buscarHistorialPago')?.addEventListener('input', function () { paginaHistorialPago = 1; renderHistorialPago(); });
    document.getElementById('limiteHistorialPago')?.addEventListener('change', function () { paginaHistorialPago = 1; renderHistorialPago(); });
    document.getElementById('btnPrevHistorialPago')?.addEventListener('click', function () { if (paginaHistorialPago > 1) { paginaHistorialPago--; renderHistorialPago(); } });
    document.getElementById('btnNextHistorialPago')?.addEventListener('click', function () { const totalPaginas = Math.max(1, Math.ceil(getHistorialFiltrado().length / getPageSize())); if (paginaHistorialPago < totalPaginas) { paginaHistorialPago++; renderHistorialPago(); } });
  }

  function refresh() {
    window.ARSFinanzasSync?.syncAll?.();
    cargarResumenes();
    renderHistorialPago();
  }

  document.addEventListener('DOMContentLoaded', function () {
    cargarHeaderUsuario();
    bindHistorialPago();
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
  });

  window.cargarReportes = refresh;
})();
