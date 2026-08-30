(function () {
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const money = (v) => `RD$ ${Number(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const formatDate = (v) => {
    if (!v) return '-';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('es-DO');
  };
  const badge = (estado) => {
    const s = String(estado || '').toLowerCase();
    const cls = s === 'aceptado_clinica' ? 'success' : s === 'enviado_clinica' ? 'warning' : 'secondary';
    const label = s === 'aceptado_clinica' ? 'Aceptado por clínica' : s === 'enviado_clinica' ? 'Enviado a clínica' : 'Pendiente';
    return `<span class="badge text-bg-${cls} detail-chip">${label}</span>`;
  };
  const audit = (accion, detalle) => {
    const arr = read('ars_auditoria');
    const user = window.ARSAuth?.getCurrentUser?.();
    arr.unshift({ id: 'AUD-' + Date.now(), usuario: user?.nombre || user?.username || 'Sistema', accion, detalle, fecha: new Date().toLocaleString('es-DO') });
    write('ars_auditoria', arr);
  };
  const state = { selectedReportId: null };

  function getReportes() {
    if (window.ARSFinanzasSync?.getReportes) return window.ARSFinanzasSync.getReportes();
    return read('ars_reportes_clinica').map(r => ({ ...r, estadoPago: r.estadoPago || 'pendiente_revision' }));
  }

  function setReportes(reportes) {
    write('ars_reportes_clinica', reportes);
  }

  function getPagos() {
    return read('ars_pagos_mensuales').map(p => ({ ...p, estado: p.estado || 'enviado_clinica' }));
  }

  function setPagos(pagos) {
    write('ars_pagos_mensuales', pagos);
  }

  function menuFor(role) {
    if (role === 'agente') {
      return {
        home: 'agente-dashboard.html',
        title: 'Agente ARS',
        badgeClass: 'text-bg-primary',
        badgeText: 'Rol Agente',
        pageTitle: 'Facturas clínicas',
        items: [
          ['agente-dashboard.html','bi-house','Dashboard'],
          ['afiliados.html','bi-people','Afiliados'],
          ['proveedores.html','bi-hospital','Clínicas'],
          ['polizas.html','bi-file-medical','Pólizas'],
          ['autorizaciones.html','bi-clipboard2-check','Autorizaciones'],
          ['facturas.html','bi-receipt','Facturas clínicas', true],
          ['reclamaciones.html','bi-journal-text','Historial reclamaciones'],
          ['reportes.html','bi-bar-chart-line','Reportes']
        ]
      };
    }
    return {
      home: 'clinica-dashboard.html',
      title: 'Clínica / Hospital',
      badgeClass: 'text-bg-success',
      badgeText: 'Rol Clínica',
      pageTitle: 'Pagos mensuales',
      items: [
        ['clinica-dashboard.html','bi-house','Dashboard'],
        ['crear-paciente-clinica.html','bi-person-plus','Crear paciente'],
        ['servicios-clinica.html','bi-heart-pulse','Procesos clínicos'],
        ['facturas.html','bi-cash-coin','Pagos mensuales', true],
        ['reportes-clinica.html','bi-bar-chart-line','Reportes']
      ]
    };
  }

  function initChrome(user) {
    const cfg = menuFor(user.rol);
    document.getElementById('brandHome').href = cfg.home;
    document.getElementById('sidebarHome').href = cfg.home;
    document.getElementById('crumbHome').href = cfg.home;
    document.getElementById('sidebarTitle').textContent = cfg.title;
    document.getElementById('pageTitle').textContent = cfg.pageTitle;
    document.getElementById('crumbCurrent').textContent = cfg.pageTitle;
    document.getElementById('roleBadge').className = `badge ${cfg.badgeClass}`;
    document.getElementById('roleBadge').textContent = cfg.badgeText;
    document.getElementById('userName').textContent = user.nombre || user.username || cfg.title;
    document.getElementById('sidebarMenu').innerHTML = cfg.items.map(([href, icon, label, active]) => `
      <li class="nav-item"><a class="nav-link${active ? ' active' : ''}" href="${href}"><i class="nav-icon bi ${icon}"></i><p>${label}</p></a></li>`).join('');
  }

  function agentPendingRows() {
    const q = (document.getElementById('buscarClinicaAgente')?.value || '').trim().toLowerCase();
    return getReportes()
      .filter(r => Number(r.totalSeguro || 0) > 0)
      .filter(r => !['enviado_clinica', 'aceptado_clinica'].includes(String(r.estadoPago || '').toLowerCase()))
      .filter(r => !q || `${r.clinicaNombre || ''} ${r.periodo || ''} ${r.id || ''}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.fechaActualizacion || 0) - new Date(a.fechaActualizacion || 0));
  }

  function agentHistoryRows() {
    const q = (document.getElementById('buscarHistorialAgente')?.value || '').trim().toLowerCase();
    return getPagos()
      .filter(p => !q || `${p.id || ''} ${p.clinicaNombre || ''} ${p.periodo || ''} ${p.estado || ''}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.fechaEnvio || b.fechaCreacion || 0) - new Date(a.fechaEnvio || a.fechaCreacion || 0));
  }

  function syncSelectedReport() {
    const rows = agentPendingRows();
    if (!rows.length) {
      state.selectedReportId = null;
      return null;
    }
    const exists = rows.some(r => String(r.id) === String(state.selectedReportId));
    if (!exists) state.selectedReportId = rows[0].id;
    return rows.find(r => String(r.id) === String(state.selectedReportId)) || rows[0];
  }

  function renderAgent() {
    document.getElementById('agentSection').classList.remove('section-hidden');
    const pending = agentPendingRows();
    const history = agentHistoryRows();
    const sent = history.filter(p => String(p.estado) === 'enviado_clinica').length;
    const accepted = history.filter(p => String(p.estado) === 'aceptado_clinica').length;
    document.getElementById('agClinicasPend').textContent = pending.length;
    document.getElementById('agMontoPend').textContent = money(pending.reduce((a, r) => a + Number(r.totalSeguro || 0), 0));
    document.getElementById('agPagosEnv').textContent = sent;
    document.getElementById('agPagosAcept').textContent = accepted;

    const tbody = document.getElementById('tablaFacturasAgente');
    tbody.innerHTML = pending.length ? pending.map(r => `
      <tr class="clickable-row ${String(r.id) === String(state.selectedReportId) ? 'table-active' : ''}" data-report-id="${escapeHtml(r.id)}">
        <td>${escapeHtml(r.clinicaNombre || '-')}</td>
        <td>${escapeHtml(r.periodo || '-')}</td>
        <td>${Number(r.totalProcesosClinicos || 0)}</td>
        <td>${money(r.totalSeguro || 0)}</td>
        <td>${badge(r.estadoPago)}</td>
        <td><button class="btn btn-outline-primary btn-sm btn-ver-detalle" data-report-id="${escapeHtml(r.id)}">Ver detalle</button></td>
      </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4 text-muted">No hay clínicas pendientes de pago.</td></tr>';

    const selected = syncSelectedReport();
    renderAgentDetail(selected);

    tbody.querySelectorAll('.btn-ver-detalle').forEach(btn => btn.addEventListener('click', () => {
      state.selectedReportId = btn.dataset.reportId;
      renderAgent();
    }));
  }

  function renderAgentDetail(report) {
    const tbody = document.getElementById('tablaDetalleClinicaAgente');
    const label = document.getElementById('detalleClinicaLabel');
    const total = document.getElementById('totalPagarClinica');
    const btn = document.getElementById('btnEnviarPagoClinica');
    if (!report) {
      label.textContent = 'Seleccione una clínica para ver sus reclamaciones/procesos';
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No hay detalle para mostrar.</td></tr>';
      total.textContent = money(0);
      btn.disabled = true;
      return;
    }
    label.textContent = `${report.clinicaNombre || '-'} • período ${report.periodo || '-'}`;
    const detailRows = Array.isArray(report.detalleProcesos) ? report.detalleProcesos : [];
    tbody.innerHTML = detailRows.length ? detailRows.map(item => `
      <tr>
        <td>${escapeHtml(item.id || '-')}</td>
        <td>${escapeHtml(item.afiliadoNombre || '-')}</td>
        <td>${escapeHtml(item.servicio || '-')}</td>
        <td>${escapeHtml(item.autorizacionId || '-')}</td>
        <td>${money(item.montoSeguro || 0)}</td>
        <td>${escapeHtml(item.fechaRealizada || '-')}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4 text-muted">Esta clínica no tiene detalle de reclamaciones/procesos en este período.</td></tr>';
    total.textContent = money(report.totalSeguro || 0);
    btn.disabled = false;
    btn.dataset.reportId = report.id;
  }

  function sendPaymentToClinic(reportId) {
    const reportes = getReportes();
    const idx = reportes.findIndex(r => String(r.id) === String(reportId));
    if (idx < 0) return;
    const report = reportes[idx];
    const currentStatus = String(report.estadoPago || '').toLowerCase();
    if (['enviado_clinica', 'aceptado_clinica'].includes(currentStatus)) {
      renderAgent();
      return;
    }
    const pagos = getPagos();
    let pago = pagos.find(p => String(p.reporteId) === String(reportId));
    const observacion = (document.getElementById('observacionPagoAgente')?.value || '').trim() || 'Pago enviado por el agente a la clínica';
    if (!pago) {
      const seq = pagos.filter(p => /^PAG-\d+$/i.test(String(p.id || ''))).length + 1;
      pago = {
        id: `PAG-${String(seq).padStart(3, '0')}`,
        reporteId: report.id,
        clinicaId: report.clinicaId,
        clinicaNombre: report.clinicaNombre || '-',
        periodo: report.periodo || '-',
        monto: Number(report.totalSeguro || 0),
        observacion,
        fechaEnvio: new Date().toISOString(),
        fechaAceptacion: null,
        estado: 'enviado_clinica'
      };
      pagos.unshift(pago);
    } else {
      pago.monto = Number(report.totalSeguro || 0);
      pago.observacion = observacion;
      pago.fechaEnvio = new Date().toISOString();
      pago.estado = 'enviado_clinica';
      pago.fechaAceptacion = null;
    }
    setPagos(pagos);
    reportes[idx] = { ...report, estadoPago: 'enviado_clinica', pagoId: pago.id, fechaPago: pago.fechaEnvio };
    setReportes(reportes);
    audit('Enviar pago a clínica', `Pago ${pago.id} enviado a ${report.clinicaNombre} por ${money(report.totalSeguro || 0)}`);
    document.getElementById('observacionPagoAgente').value = '';
    renderAgent();
  }

  function clinicPendingRows(user) {
    const q = (document.getElementById('buscarPagosClinica')?.value || '').trim().toLowerCase();
    return getPagos()
      .filter(p => String(p.clinicaId) === String(user.referenciaId))
      .filter(p => String(p.estado) === 'enviado_clinica')
      .filter(p => !q || `${p.id || ''} ${p.periodo || ''} ${p.observacion || ''}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.fechaEnvio || 0) - new Date(a.fechaEnvio || 0));
  }

  function clinicHistoryRows(user) {
    const q = (document.getElementById('buscarHistorialClinica')?.value || '').trim().toLowerCase();
    return getPagos()
      .filter(p => String(p.clinicaId) === String(user.referenciaId))
      .filter(p => String(p.estado) === 'aceptado_clinica')
      .filter(p => !q || `${p.id || ''} ${p.periodo || ''}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.fechaAceptacion || 0) - new Date(a.fechaAceptacion || 0));
  }

  function acceptPayment(paymentId) {
    const user = window.ARSAuth?.getCurrentUser?.();
    if (!user || user.rol !== 'clinica') return;
    const pagos = getPagos();
    const idx = pagos.findIndex(p => String(p.id) === String(paymentId) && String(p.clinicaId) === String(user.referenciaId));
    if (idx < 0) return;
    if (String(pagos[idx].estado) === 'aceptado_clinica') { renderClinic(user); return; }
    pagos[idx] = { ...pagos[idx], estado: 'aceptado_clinica', fechaAceptacion: new Date().toISOString() };
    setPagos(pagos);

    const reportes = getReportes();
    const reportIdx = reportes.findIndex(r => String(r.id) === String(pagos[idx].reporteId));
    if (reportIdx >= 0) {
      reportes[reportIdx] = { ...reportes[reportIdx], estadoPago: 'aceptado_clinica', pagoId: pagos[idx].id, fechaPago: pagos[idx].fechaAceptacion };
      setReportes(reportes);
    }
    audit('Aceptar pago de clínica', `La clínica aceptó el pago ${pagos[idx].id} por ${money(pagos[idx].monto || 0)}`);
    renderClinic(user);
  }

  function renderClinic(user) {
    document.getElementById('clinicSection').classList.remove('section-hidden');
    const pending = clinicPendingRows(user);
    const history = clinicHistoryRows(user);
    document.getElementById('clPendientes').textContent = pending.length;
    document.getElementById('clMontoPend').textContent = money(pending.reduce((a, p) => a + Number(p.monto || 0), 0));
    document.getElementById('clAceptados').textContent = history.length;
    document.getElementById('clMontoAcept').textContent = money(history.reduce((a, p) => a + Number(p.monto || 0), 0));

    const tbodyPending = document.getElementById('tablaPagosClinica');
    tbodyPending.innerHTML = pending.length ? pending.map(p => `
      <tr>
        <td>${escapeHtml(p.id || '-')}</td>
        <td>${escapeHtml(p.periodo || '-')}</td>
        <td>${money(p.monto || 0)}</td>
        <td>${escapeHtml(p.observacion || '-')}</td>
        <td>${formatDate(p.fechaEnvio)}</td>
        <td><button class="btn btn-success btn-sm btn-aceptar-pago" data-id="${escapeHtml(p.id)}">Aceptar pago</button></td>
      </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4 text-muted">No hay pagos pendientes por aceptar.</td></tr>';
    tbodyPending.querySelectorAll('.btn-aceptar-pago').forEach(btn => btn.addEventListener('click', () => acceptPayment(btn.dataset.id)));

    const tbodyHistory = document.getElementById('tablaHistorialClinica');
    tbodyHistory.innerHTML = history.length ? history.map(p => `
      <tr>
        <td>${escapeHtml(p.id || '-')}</td>
        <td>${escapeHtml(p.periodo || '-')}</td>
        <td>${money(p.monto || 0)}</td>
        <td>${formatDate(p.fechaEnvio)}</td>
        <td>${formatDate(p.fechaAceptacion)}</td>
        <td>${badge(p.estado)}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4 text-muted">No hay pagos aceptados todavía.</td></tr>';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    window.ARSFinanzasSync?.syncAll?.();
    const user = await window.ARSAuth.requireRoleOrRedirect(['agente', 'clinica']);
    if (!user) return;
    initChrome(user);
    document.getElementById('btnLogout')?.addEventListener('click', (e) => { e.preventDefault(); window.ARSAuth?.logout?.(); });

    if (user.rol === 'agente') {
      syncSelectedReport();
      renderAgent();
      document.getElementById('buscarClinicaAgente')?.addEventListener('input', () => renderAgent());
      document.getElementById('buscarHistorialAgente')?.addEventListener('input', () => renderAgent());
      document.getElementById('btnEnviarPagoClinica')?.addEventListener('click', () => {
        const reportId = document.getElementById('btnEnviarPagoClinica').dataset.reportId;
        if (reportId) sendPaymentToClinic(reportId);
      });
    } else {
      renderClinic(user);
      document.getElementById('buscarPagosClinica')?.addEventListener('input', () => renderClinic(user));
      document.getElementById('buscarHistorialClinica')?.addEventListener('input', () => renderClinic(user));
    }
  });
})();
