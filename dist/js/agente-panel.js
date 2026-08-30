document.addEventListener('DOMContentLoaded', async () => {
  const user = await ARSAuth.requireRoleOrRedirect('agente');
  if (!user) return;

  const PAGE_DEFAULT = 5;
  let paginaPagoClinicas = 1;
  let paginaFactAgente = 1;

  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  setText('userName', user?.nombre || 'Agente ARS');

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = (value) => `RD$ ${Number(value || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function badgeEstado(estado) {
    const key = String(estado || '').toLowerCase();
    const map = {
      pendiente: 'warning', pendiente_revision:'warning', aprobada: 'success', rechazada: 'danger',
      validada: 'primary', pagada: 'info', comprobada: 'success', enviado_clinica:'secondary', aceptado_clinica:'success'
    };
    const labelMap = { enviado_clinica:'Enviado a clínica', aceptado_clinica:'Aceptado por clínica', pendiente_revision:'Pendiente' };
    return `<span class="badge text-bg-${map[key] || 'secondary'} text-uppercase">${escapeHtml(labelMap[key] || key || '-')}</span>`;
  }

  function getClinicasResumen() {
    const reportes = window.ARSFinanzasSync?.getReportes?.() || [];
    return reportes.map(r => ({
      clinica: r.clinicaNombre || '-',
      servicios: Number(r.totalProcesosClinicos || 0),
      facturas: Number(r.totalFacturasAutorizadas || 0),
      totalSeguro: Number(r.totalSeguro || 0),
      totalPaciente: Number(r.totalPaciente || 0),
      pendienteARS: ['aceptado_clinica'].includes(String(r.estadoPago || '').toLowerCase()) ? 0 : Number(r.totalSeguro || 0)
    })).sort((a, b) => a.clinica.localeCompare(b.clinica, 'es'));
  }

  function getPagoClinicasFiltrado() {
    const term = (document.getElementById('buscarPagoClinicas')?.value || '').toLowerCase().trim();
    let rows = getClinicasResumen();
    if (term) rows = rows.filter(r => r.clinica.toLowerCase().includes(term));
    return rows;
  }

  function getFacturasFiltradas() {
    const term = (document.getElementById('buscarFactAgente')?.value || '').toLowerCase().trim();
    let rows = (window.ARSFinanzasSync?.getFacturasView?.() || []).map(f => ({
      id: f.id || '-', clinica: f.clinica || '-', afiliado: f.afiliado || '-', autorizacion: f.autorizacion || '-',
      seguro: Number(f.seguro || 0), estado: f.estado || 'pendiente', fecha: f.fecha || ''
    }));
    rows.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    if (term) rows = rows.filter(r => [r.id, r.clinica, r.afiliado, r.autorizacion, r.estado].join(' ').toLowerCase().includes(term));
    return rows;
  }

  const pageSizePagoClinicas = () => Number(document.getElementById('limitePagoClinicas')?.value || PAGE_DEFAULT);
  const pageSizeFactAgente = () => Number(document.getElementById('limiteFactAgente')?.value || PAGE_DEFAULT);

  function renderPagoClinicas() {
    const tbody = document.getElementById('tablaPagoClinicas');
    const info = document.getElementById('infoPagoClinicas');
    const btnPrev = document.getElementById('btnPrevPagoClinicas');
    const btnNext = document.getElementById('btnNextPagoClinicas');
    const rows = getPagoClinicasFiltrado();
    const size = pageSizePagoClinicas();
    const total = rows.length;
    const totalPaginas = Math.max(1, Math.ceil(total / size));
    if (paginaPagoClinicas > totalPaginas) paginaPagoClinicas = totalPaginas;
    const inicio = (paginaPagoClinicas - 1) * size;
    const fin = inicio + size;
    const visibles = rows.slice(inicio, fin);

    tbody.innerHTML = visibles.length ? visibles.map(r => `
      <tr>
        <td>${escapeHtml(r.clinica)}</td>
        <td>${r.servicios}</td>
        <td>${r.facturas}</td>
        <td>${money(r.totalSeguro)}</td>
        <td>${money(r.totalPaciente)}</td>
        <td>${money(r.pendienteARS)}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="text-center text-muted">No hay historial para mostrar.</td></tr>';

    if (info) info.textContent = `Mostrando ${total ? inicio + 1 : 0}-${total ? Math.min(fin, total) : 0} de ${total} clínicas`;
    if (btnPrev) btnPrev.disabled = paginaPagoClinicas <= 1;
    if (btnNext) btnNext.disabled = paginaPagoClinicas >= totalPaginas;
  }

  function renderFacturasAgente() {
    const tbody = document.getElementById('tablaFactAgente');
    const info = document.getElementById('infoFactAgente');
    const btnPrev = document.getElementById('btnPrevFactAgente');
    const btnNext = document.getElementById('btnNextFactAgente');
    const rows = getFacturasFiltradas();
    const size = pageSizeFactAgente();
    const total = rows.length;
    const totalPaginas = Math.max(1, Math.ceil(total / size));
    if (paginaFactAgente > totalPaginas) paginaFactAgente = totalPaginas;
    const inicio = (paginaFactAgente - 1) * size;
    const fin = inicio + size;
    const visibles = rows.slice(inicio, fin);

    tbody.innerHTML = visibles.length ? visibles.map(r => `
      <tr>
        <td>${escapeHtml(r.id)}</td>
        <td>${escapeHtml(r.clinica)}</td>
        <td>${escapeHtml(r.afiliado)}</td>
        <td>${escapeHtml(r.autorizacion)}</td>
        <td>${money(r.seguro)}</td>
        <td>${badgeEstado(r.estado)}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="text-center text-muted">No hay facturas para mostrar.</td></tr>';

    if (info) info.textContent = `Mostrando ${total ? inicio + 1 : 0}-${total ? Math.min(fin, total) : 0} de ${total} facturas`;
    if (btnPrev) btnPrev.disabled = paginaFactAgente <= 1;
    if (btnNext) btnNext.disabled = paginaFactAgente >= totalPaginas;
  }

  function renderKpis() {
    const reportes = window.ARSFinanzasSync?.getReportes?.() || [];
    const facturas = window.ARSFinanzasSync?.getFacturasView?.() || [];
    const clinicasActivas = reportes.filter(r => Number(r.totalProcesosClinicos || 0) > 0 || Number(r.totalPacientesAgendados || 0) > 0).length;
    const automaticas = reportes.reduce((acc, r) => acc + Number(r.totalAutorizacionesAprobadas || 0), 0);
    const monto = reportes.reduce((acc, r) => acc + (String(r.estadoPago || '').toLowerCase() === 'aceptado_clinica' ? 0 : Number(r.totalSeguro || 0)), 0);
    setText('agKpiPendientes', clinicasActivas);
    setText('agKpiAprobadas', automaticas);
    setText('agKpiFacturas', facturas.length);
    setText('agKpiMonto', money(monto));
  }

  function renderDashboard() {
    window.ARSFinanzasSync?.syncAll?.();
    renderKpis();
    renderPagoClinicas();
    renderFacturasAgente();
  }

  function refreshFromSql() {
    const done = function () { renderDashboard(); };
    const promise = window.ARSHybridStorage?.refreshNow?.();
    if (promise && typeof promise.finally === 'function') {
      promise.finally(done);
      return;
    }
    done();
  }

  document.getElementById('buscarPagoClinicas')?.addEventListener('input', () => { paginaPagoClinicas = 1; renderPagoClinicas(); });
  document.getElementById('limitePagoClinicas')?.addEventListener('change', () => { paginaPagoClinicas = 1; renderPagoClinicas(); });
  document.getElementById('btnPrevPagoClinicas')?.addEventListener('click', () => { if (paginaPagoClinicas > 1) { paginaPagoClinicas--; renderPagoClinicas(); } });
  document.getElementById('btnNextPagoClinicas')?.addEventListener('click', () => { const totalPaginas = Math.max(1, Math.ceil(getPagoClinicasFiltrado().length / pageSizePagoClinicas())); if (paginaPagoClinicas < totalPaginas) { paginaPagoClinicas++; renderPagoClinicas(); } });
  document.getElementById('buscarFactAgente')?.addEventListener('input', () => { paginaFactAgente = 1; renderFacturasAgente(); });
  document.getElementById('limiteFactAgente')?.addEventListener('change', () => { paginaFactAgente = 1; renderFacturasAgente(); });
  document.getElementById('btnPrevFactAgente')?.addEventListener('click', () => { if (paginaFactAgente > 1) { paginaFactAgente--; renderFacturasAgente(); } });
  document.getElementById('btnNextFactAgente')?.addEventListener('click', () => { const totalPaginas = Math.max(1, Math.ceil(getFacturasFiltradas().length / pageSizeFactAgente())); if (paginaFactAgente < totalPaginas) { paginaFactAgente++; renderFacturasAgente(); } });

  refreshFromSql();
  window.addEventListener('focus', refreshFromSql);
  window.addEventListener('ars:storage-sync', renderDashboard);
});

function irModulo(tipo) {
  switch (tipo) {
    case 'afiliados': window.location.href = 'afiliados.html'; break;
    case 'clinicas': window.location.href = 'proveedores.html'; break;
    case 'polizas': window.location.href = 'polizas.html'; break;
    case 'autorizaciones':
    case 'pendientes': window.location.href = 'autorizaciones.html'; break;
    case 'facturas': window.location.href = 'facturas.html'; break;
  }
}
