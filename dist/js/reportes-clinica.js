(function () {
  const PAGE_SIZE = 5;
  const state = { historial: 1, pacientes: 1, procesos: 1, pagos: 1, actividad: 1 };
  const getLs = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  const money = (v) => `RD$ ${Number(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const formatDate = (v) => !v ? '-' : (isNaN(new Date(v).getTime()) ? String(v) : new Date(v).toLocaleString('es-DO'));

  function renderHeader(user) {
    document.getElementById('userName').textContent = user.nombre || user.username || 'Clínica';
    document.getElementById('userFullName').textContent = user.nombre || user.username || 'Clínica / Hospital';
  }

  function renderTable(rows, key, tbodyId, infoId, prevId, nextId, rowRenderer, emptyHtml) {
    const tbody = document.getElementById(tbodyId);
    const info = document.getElementById(infoId);
    const page = state[key] || 1;
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (state[key] > totalPages) state[key] = totalPages;
    const start = (state[key] - 1) * PAGE_SIZE;
    const visibles = rows.slice(start, start + PAGE_SIZE);
    tbody.innerHTML = visibles.length ? visibles.map(rowRenderer).join('') : emptyHtml;
    info.textContent = `Mostrando ${rows.length ? start + 1 : 0}-${rows.length ? start + visibles.length : 0} de ${rows.length} registros`;
    document.getElementById(prevId).disabled = state[key] <= 1;
    document.getElementById(nextId).disabled = state[key] >= totalPages;
  }

  function bindPager(prevId, nextId, key, renderFn) {
    document.getElementById(prevId)?.addEventListener('click', function () { if (state[key] > 1) { state[key]--; renderFn(); } });
    document.getElementById(nextId)?.addEventListener('click', function () { state[key]++; renderFn(); });
  }

  function renderSnapshot(snapshot, historyRows) {
    document.getElementById('repTotalPacientes').textContent = Number(snapshot.totalPacientesAgendados || 0);
    document.getElementById('repTotalProcesos').textContent = Number(snapshot.totalProcesosClinicos || 0);
    document.getElementById('repMontoSeguro').textContent = money(snapshot.totalSeguro || 0);
    document.getElementById('repMontoPaciente').textContent = money(snapshot.totalPaciente || 0);
    document.getElementById('repTotalAut').textContent = Number(snapshot.totalAutorizacionesAprobadas || 0);
    document.getElementById('repTotalPagos').textContent = Number(snapshot.totalPagosRecibidos || 0);
    document.getElementById('repClinicaNombre').textContent = snapshot.clinicaNombre || '-';
    document.getElementById('repPeriodo').textContent = snapshot.periodo || '-';
    document.getElementById('repMontoSeguroResumen').textContent = money(snapshot.totalSeguro || 0);
    document.getElementById('repMontoPacienteResumen').textContent = money(snapshot.totalPaciente || 0);
    document.getElementById('repMontoPrivadoResumen').textContent = money(snapshot.totalPrivado || 0);
    document.getElementById('repMontoSeguroOperacionResumen').textContent = money(snapshot.totalSeguroOperacion || 0);
    document.getElementById('repMontoPagadoResumen').textContent = money(snapshot.montoPagado || 0);

    renderTable(historyRows, 'historial', 'tablaReportesClinica', 'infoReportesClinica', 'btnPrevReporteClinica', 'btnNextReporteClinica',
      r => `<tr><td>${escapeHtml(r.periodo || '-')}</td><td>${Number(r.totalPacientesAgendados || 0)}</td><td>${Number(r.totalProcesosClinicos || 0)}</td><td>${money(r.totalSeguro || 0)}</td><td>${formatDate(r.fechaActualizacion)}</td></tr>`,
      '<tr><td colspan="5" class="text-center py-4 text-muted">No hay reportes todavía.</td></tr>'
    );

    renderTable(snapshot.detallePacientes || [], 'pacientes', 'tablaDetallePacientesClinica', 'infoPacientesClinica', 'btnPrevPacientesClinica', 'btnNextPacientesClinica',
      c => `<tr><td>${escapeHtml(c.pacienteNombre || '-')}</td><td>${escapeHtml(c.cedula || '-')}</td><td><div>${escapeHtml(c.seguro || '-')}</div><small class="text-muted">${escapeHtml(c.codigoSeguro || '-')}</small></td><td>${escapeHtml(c.estadoSeguro || '-')}</td><td>${escapeHtml(c.fechaCita || '-')} ${escapeHtml(c.horaCita || '')}</td><td>${escapeHtml(c.doctor || '-')}</td></tr>`,
      '<tr><td colspan="6" class="text-center py-4 text-muted">No hay pacientes registrados.</td></tr>'
    );

    renderTable(snapshot.detalleProcesos || [], 'procesos', 'tablaDetalleProcesosClinica', 'infoProcesosClinica', 'btnPrevProcesosClinica', 'btnNextProcesosClinica',
      p => `<tr><td>${escapeHtml(p.afiliadoNombre || '-')}</td><td>${escapeHtml(p.servicio || '-')}</td><td>${escapeHtml(p.modalidad || '-')}</td><td>${escapeHtml(p.autorizacionId || '-')}</td><td>${escapeHtml(p.estadoAutorizacion || '-')}</td><td>${money(p.costoFinal || 0)}</td></tr>`,
      '<tr><td colspan="6" class="text-center py-4 text-muted">No hay procesos clínicos para mostrar.</td></tr>'
    );

    renderTable(snapshot.detallePagos || [], 'pagos', 'tablaPagosMensualesClinica', 'infoPagosMensualesClinica', 'btnPrevPagosMensualesClinica', 'btnNextPagosMensualesClinica',
      p => `<tr><td>${escapeHtml(p.id || '-')}</td><td>${escapeHtml(p.periodo || '-')}</td><td>${money(p.monto || 0)}</td><td>${formatDate(p.fechaRecibido)}</td><td>${escapeHtml(p.observacion || '-')}</td></tr>`,
      '<tr><td colspan="5" class="text-center py-4 text-muted">No hay pagos registrados.</td></tr>'
    );

    renderTable(snapshot.timeline || [], 'actividad', 'tablaActividadClinica', 'infoActividadClinica', 'btnPrevActividadClinica', 'btnNextActividadClinica',
      item => `<tr><td>${formatDate(item.fecha)}</td><td>${escapeHtml(item.tipo || '-')}</td><td>${escapeHtml(item.referencia || '-')}</td><td>${escapeHtml(item.descripcion || '-')}</td></tr>`,
      '<tr><td colspan="4" class="text-center py-4 text-muted">No hay actividad registrada todavía.</td></tr>'
    );
  }

  document.addEventListener('DOMContentLoaded', function () {
    const user = window.ARSAuth?.getCurrentUser?.();
    if (!user || user.rol !== 'clinica') { window.location.href = 'examples/seleccion-rol.html'; return; }
    renderHeader(user);
    window.ARSFinanzasSync?.syncAll?.();
    const snapshot = window.ARSFinanzasSync?.buildReportForClinic?.(user.referenciaId) || {};
    const historyRows = (window.ARSFinanzasSync?.getReportes?.() || []).filter(r => String(r.clinicaId) === String(user.referenciaId)).sort((a,b) => new Date(b.fechaActualizacion || 0) - new Date(a.fechaActualizacion || 0));
    const renderAll = () => renderSnapshot(snapshot, historyRows);
    renderAll();

    bindPager('btnPrevReporteClinica', 'btnNextReporteClinica', 'historial', renderAll);
    bindPager('btnPrevPacientesClinica', 'btnNextPacientesClinica', 'pacientes', renderAll);
    bindPager('btnPrevProcesosClinica', 'btnNextProcesosClinica', 'procesos', renderAll);
    bindPager('btnPrevPagosMensualesClinica', 'btnNextPagosMensualesClinica', 'pagos', renderAll);
    bindPager('btnPrevActividadClinica', 'btnNextActividadClinica', 'actividad', renderAll);

    document.getElementById('btnLogout')?.addEventListener('click', function(e){ e.preventDefault(); window.ARSAuth?.logout?.(); });
    window.addEventListener('focus', () => { window.ARSFinanzasSync?.syncAll?.(); location.reload(); });
  });
})();
