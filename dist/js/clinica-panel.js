document.addEventListener('DOMContentLoaded', async () => {
  const user = await ARSAuth.requireRoleOrRedirect('clinica');
  if (!user) return;

  const q = (id) => document.getElementById(id);
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const money = (v) => `RD$ ${Number(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const statusBadge = (estado) => {
    const s = String(estado || '').toLowerCase();
    const cls = s === 'activo' ? 'success' : s === 'inactivo' ? 'danger' : s === 'privado' ? 'secondary' : 'warning';
    return `<span class="badge text-bg-${cls} status-chip text-uppercase">${escapeHtml(s || '-')}</span>`;
  };

  q('userName').textContent = user.nombre || user.username || 'Clínica / Hospital';
  window.ARSFinanzasSync?.syncAll?.();

  const clinicaId = String(user.referenciaId);
  const clinica = ARSAuth.findClinica ? ARSAuth.findClinica(clinicaId) : null;
  const snapshot = window.ARSFinanzasSync?.buildReportForClinic?.(clinicaId);
  const pacientes = read('ars_pacientes_clinica').filter(p => String(p.clinicaId) === clinicaId);
  const citas = read('ars_citas_clinica')
    .filter(c => String(c.clinicaId) === clinicaId)
    .sort((a, b) => new Date(`${b.fechaCita || b.fecha || ''}T${b.horaCita || b.hora || '00:00'}`) - new Date(`${a.fechaCita || a.fecha || ''}T${a.horaCita || a.hora || '00:00'}`));
  const pagos = read('ars_pagos_mensuales').filter(p => String(p.clinicaId) === clinicaId);
  const pendientesPago = pagos.filter(p => String(p.estado || '').toLowerCase() === 'enviado_clinica');
  const segurosActivos = citas.filter(p => String(p.estadoSeguro).toLowerCase() === 'activo').length || pacientes.filter(p => String(p.estadoSeguro).toLowerCase() === 'activo').length;
  const totalPendiente = pendientesPago.reduce((acc, r) => acc + Number(r.monto || 0), 0);

  q('kpiPacientes').textContent = snapshot?.totalPacientesAgendados ?? (pacientes.length || citas.length);
  q('kpiCitasHoy').textContent = citas.length;
  q('kpiSegurosActivos').textContent = segurosActivos;
  q('kpiPendPago').textContent = pendientesPago.length;
  q('resProcesos').textContent = snapshot?.totalProcesosClinicos || 0;
  q('resPagosRecibidos').textContent = pagos.filter(p => String(p.estado || '').toLowerCase() === 'aceptado_clinica').length;
  q('resPendiente').textContent = money(totalPendiente);
  q('resClinica').textContent = clinica?.nombre || user.nombre || 'Clínica';
  q('resReportesClinica').textContent = snapshot ? 1 : 0;

  const buscar = q('buscarAgendados');
  const tbody = q('tablaPacientesAgendados');
  const info = q('infoAgendados');
  const pageInfo = q('pageInfoAgendados');
  const btnPrev = q('btnPrevAgendados');
  const btnNext = q('btnNextAgendados');
  const PAGE_SIZE = 10;
  let currentPage = 1;

  const getFiltered = () => {
    const term = (buscar?.value || '').trim().toLowerCase();
    let items = citas;
    if (term) {
      items = items.filter(c => [c.pacienteNombre, c.nombre, c.cedula, c.seguro, c.seguroNombre, c.estadoSeguro, c.doctor, c.codigoSeguro, c.fechaCita, c.fecha].join(' ').toLowerCase().includes(term));
    }
    return items;
  };

  const goProcesos = (citaId) => {
    const cita = citas.find(c => String(c.id) === String(citaId));
    if (cita) localStorage.setItem('ars_cita_para_proceso', JSON.stringify(cita));
    window.location.href = `servicios-clinica.html?citaId=${encodeURIComponent(citaId)}`;
  };

  const render = () => {
    const items = getFiltered();
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const visibles = items.slice(start, start + PAGE_SIZE);
    info.textContent = `Mostrando ${visibles.length ? start + 1 : 0}-${start + visibles.length} de ${items.length} registros`;
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;

    tbody.innerHTML = visibles.length ? visibles.map(c => `
      <tr>
        <td><div class="fw-semibold">${escapeHtml(c.fechaCita || c.fecha || '')}</div><small class="text-muted">${escapeHtml(c.horaCita || c.hora || '')}</small></td>
        <td>${escapeHtml(c.pacienteNombre || c.nombre || '')}</td>
        <td>${escapeHtml(c.cedula || '')}</td>
        <td><div>${escapeHtml(c.seguro || c.seguroNombre || 'Privado')}</div><small class="text-muted">${escapeHtml(c.codigoSeguro || '-')}</small></td>
        <td>${statusBadge(c.estadoSeguro)}</td>
        <td>${escapeHtml(c.doctor || '-')}</td>
        <td class="table-actions"><button type="button" class="btn btn-sm btn-outline-primary btn-autorizar" data-id="${escapeHtml(c.id)}">Procesar</button></td>
      </tr>`).join('') : `<tr><td colspan="7"><div class="empty-state">No hay pacientes agendados para mostrar.</div></td></tr>`;

    tbody.querySelectorAll('.btn-autorizar').forEach(btn => btn.addEventListener('click', () => goProcesos(btn.dataset.id)));
  };

  buscar?.addEventListener('input', () => { currentPage = 1; render(); });
  btnPrev?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; render(); } });
  btnNext?.addEventListener('click', () => { const totalPages = Math.max(1, Math.ceil(getFiltered().length / PAGE_SIZE)); if (currentPage < totalPages) { currentPage++; render(); } });
  render();
});
