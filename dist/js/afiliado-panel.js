
document.addEventListener('DOMContentLoaded', () => {
  const user = ARSAuth?.getCurrentUser?.() || {};

  const byId = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const el = byId(id);
    if (el) el.textContent = value;
  };
  const setHtml = (id, value) => {
    const el = byId(id);
    if (el) el.innerHTML = value;
  };

  setText('userName', user?.nombre || 'Afiliado');
  document.querySelectorAll('[data-home-link]').forEach(a => {
    try {
      a.href = ARSAuth?.getHomeByRole?.(user?.rol) || a.getAttribute('href') || '#';
    } catch (_) {}
  });

  const safeText = (v) => String(v ?? '').trim();
  const normalize = (v) => safeText(v).toLowerCase();
  const normalizeId = (v) => safeText(v).replace(/[^a-z0-9]/gi, '').toLowerCase();
  const normalizeCedula = (v) => safeText(v).replace(/\D/g, '');
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));

  function readLsArray(keys) {
    for (const key of keys) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(value)) return value;
      } catch (_) {}
    }
    return [];
  }

  function getAfiliados() {
    try {
      const fromAuth = ARSAuth?.getAfiliados?.();
      if (Array.isArray(fromAuth) && fromAuth.length) return fromAuth;
    } catch (_) {}
    return readLsArray(['ars_afiliados', 'afiliados']);
  }

  function findAfiliadoActual() {
    const afiliados = getAfiliados();
    if (!afiliados.length) return null;

    const idCandidates = [
      user?.codigoSeguro,
      user?.referenciaId,
      user?.id,
      user?.username
    ].map(normalizeId).filter(Boolean);

    const cedulaCandidates = [
      user?.cedula,
      user?.username
    ].map(normalizeCedula).filter(Boolean);

    const nameCandidates = [
      user?.nombre,
      user?.username
    ].map(normalize).filter(Boolean);

    const idFields = ['id', 'codigoSeguro', 'codigo', 'referenciaId', 'usuario', 'username'];
    const nameFields = ['nombre', 'afiliado', 'pacienteNombre', 'nombreCompleto'];

    let found = afiliados.find(a =>
      idFields.some(field => idCandidates.includes(normalizeId(a?.[field])))
    );
    if (found) return found;

    found = afiliados.find(a => cedulaCandidates.includes(normalizeCedula(a?.cedula)));
    if (found) return found;

    found = afiliados.find(a =>
      nameFields.some(field => nameCandidates.includes(normalize(a?.[field])))
    );
    if (found) return found;

    return null;
  }

  const afiliado = findAfiliadoActual();

  const plan = afiliado
    ? (ARSAuth?.findPoliza?.(afiliado.polizaId || afiliado.planId || afiliado.poliza) || null)
    : null;

  const coberturasPlan = typeof ARSAuth?.normalizePolicyCoverage === 'function'
    ? (ARSAuth.normalizePolicyCoverage(plan) || [])
    : ((plan?.coberturas || []).length
      ? plan.coberturas
      : (Array.isArray(plan?.cobertura) ? plan.cobertura.map(servicio => ({ servicio, porcentaje: 100, tope: 0 })) : []));

  setText('afiNombre', afiliado?.nombre || afiliado?.afiliado || '-');
  setText('afiCedula', afiliado?.cedula || '-');
  setText('afiPoliza', afiliado?.polizaId || afiliado?.poliza || '-');
  setText('afiPlan', plan?.nombre || plan?.nombrePlan || '-');
  setHtml(
    'afiCoberturas',
    coberturasPlan.length
      ? coberturasPlan.map(c => `<span class="badge text-bg-primary me-1 mb-1">${escapeHtml(c.servicio)}${c.porcentaje ? ` (${c.porcentaje}%)` : ''}</span>`).join('')
      : '<span class="text-muted">Sin coberturas registradas</span>'
  );

  const matchIds = new Set([
    afiliado?.id,
    afiliado?.codigoSeguro,
    afiliado?.usuario,
    afiliado?.username,
    user?.referenciaId,
    user?.codigoSeguro,
    user?.id,
    user?.username
  ].map(normalizeId).filter(Boolean));

  const matchCedulas = new Set([
    afiliado?.cedula,
    user?.cedula,
    user?.username
  ].map(normalizeCedula).filter(Boolean));

  const matchNames = new Set([
    afiliado?.nombre,
    afiliado?.afiliado,
    user?.nombre,
    user?.username
  ].map(normalize).filter(Boolean));

  function matchesAfiliado(record) {
    if (!record || !afiliado) return false;

    const ids = [
      record.afiliadoId,
      record.idAfiliado,
      record.referenciaId,
      record.codigoSeguro,
      record.codigoAfiliado,
      record.afiliadoCodigo,
      record.usuarioAfiliado,
      record.idUsuario,
      record.usuario,
      record.username
    ];

    const cedulas = [
      record.cedula,
      record.afiliadoCedula,
      record.documento,
      record.numeroDocumento
    ];

    const names = [
      record.afiliadoNombre,
      record.afiliado,
      record.pacienteNombre,
      record.nombre,
      record.nombrePaciente
    ];

    return ids.some(v => matchIds.has(normalizeId(v)))
      || cedulas.some(v => matchCedulas.has(normalizeCedula(v)))
      || names.some(v => matchNames.has(normalize(v)));
  }

  const badge = (estado) => {
    const estadoNorm = normalize(estado);
    const cls = ['aprobada', 'aprobado', 'comprobada', 'comprobado', 'activo', 'registrado'].includes(estadoNorm)
      ? 'approved'
      : ['rechazada', 'rechazado', 'inactivo'].includes(estadoNorm)
        ? 'rejected'
        : 'pending';
    return `<span class="badge-soft ${cls}">${escapeHtml(safeText(estado || 'pendiente').toUpperCase())}</span>`;
  };

  function createTableController({ tableBodyId, emptyMessage, columns, rowRenderer, data }) {
    const tbody = byId(tableBodyId);
    if (!tbody) return;

    const tableResponsive = tbody.closest('.table-responsive');
    const cardBody = tbody.closest('.card-body');
    if (!tableResponsive || !cardBody) {
      tbody.innerHTML = data.length
        ? data.map(rowRenderer).join('')
        : `<tr><td colspan="${columns}" class="text-center text-muted py-4">${escapeHtml(emptyMessage)}</td></tr>`;
      return;
    }

    const existingControls = cardBody.querySelector(`[data-table-controls="${tableBodyId}"]`);
    if (existingControls) existingControls.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'd-flex flex-column gap-2 mb-3';
    wrapper.setAttribute('data-table-controls', tableBodyId);
    wrapper.innerHTML = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
        <div class="input-group input-group-sm" style="max-width: 320px;">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input type="text" class="form-control" placeholder="Buscar...">
        </div>
        <div class="d-flex align-items-center gap-2 ms-md-auto">
          <label class="small text-muted mb-0">Ver</label>
          <select class="form-select form-select-sm" style="width: 90px;">
            <option value="5" selected>5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
          </select>
        </div>
      </div>
      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
        <small class="text-muted js-summary"></small>
        <nav><ul class="pagination pagination-sm mb-0 js-pagination"></ul></nav>
      </div>
    `;
    const insertionTarget = tableResponsive === cardBody
      ? (cardBody.querySelector('table') || cardBody.firstElementChild || null)
      : tableResponsive;

    if (insertionTarget) cardBody.insertBefore(wrapper, insertionTarget);
    else cardBody.prepend(wrapper);

    const input = wrapper.querySelector('input');
    const select = wrapper.querySelector('select');
    const summary = wrapper.querySelector('.js-summary');
    const pagination = wrapper.querySelector('.js-pagination');

    let searchTerm = '';
    let pageSize = 5;
    let currentPage = 1;

    function getFilteredData() {
      const term = normalize(searchTerm);
      if (!term) return [...data];
      return data.filter(item => normalize(JSON.stringify(item)).includes(term));
    }

    function renderPagination(totalPages) {
      pagination.innerHTML = '';
      if (totalPages <= 1) return;

      const addPageBtn = (label, page, disabled = false, active = false) => {
        const li = document.createElement('li');
        li.className = `page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'page-link';
        btn.textContent = label;
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
          currentPage = page;
          update();
        });
        li.appendChild(btn);
        pagination.appendChild(li);
      };

      addPageBtn('«', Math.max(1, currentPage - 1), currentPage === 1);
      for (let page = 1; page <= totalPages; page += 1) addPageBtn(String(page), page, false, page === currentPage);
      addPageBtn('»', Math.min(totalPages, currentPage + 1), currentPage === totalPages);
    }

    function update() {
      const filtered = getFilteredData();
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * pageSize;
      const visible = filtered.slice(start, start + pageSize);
      const from = total ? start + 1 : 0;
      const to = total ? start + visible.length : 0;

      summary.textContent = total ? `Mostrando ${from}-${to} de ${total} registros` : 'No hay registros para mostrar';
      tbody.innerHTML = visible.length
        ? visible.map(rowRenderer).join('')
        : `<tr><td colspan="${columns}" class="text-center text-muted py-4">${escapeHtml(emptyMessage)}</td></tr>`;
      renderPagination(totalPages);
    }

    input.addEventListener('input', (e) => {
      searchTerm = e.target.value || '';
      currentPage = 1;
      update();
    });

    select.addEventListener('change', (e) => {
      pageSize = parseInt(e.target.value, 10) || 5;
      currentPage = 1;
      update();
    });

    update();
  }

  const vinculoMessage = !afiliado
    ? 'No se pudo vincular este usuario con un afiliado registrado. Verifica que el usuario del rol afiliado tenga el mismo código AFI o la misma cédula del afiliado creado por Agente.'
    : '';

  const auts = afiliado
    ? readLsArray(['ars_autorizaciones', 'autorizaciones'])
        .filter(matchesAfiliado)
        .sort((a, b) => new Date(b.fechaISO || b.fechaServicio || b.fechaCreacion || b.fechaSolicitud || 0) - new Date(a.fechaISO || a.fechaServicio || a.fechaCreacion || a.fechaSolicitud || 0))
    : [];

  createTableController({
    tableBodyId: 'tablaAfiliadoAut',
    emptyMessage: vinculoMessage || 'No hay autorizaciones para este afiliado.',
    columns: 6,
    data: auts,
    rowRenderer: (a) => `
      <tr>
        <td>${escapeHtml(a.id || '-')}</td>
        <td>${escapeHtml(a.clinicaNombre || a.clinica || '-')}</td>
        <td>${escapeHtml(a.servicio || '-')}</td>
        <td>${escapeHtml(a.coberturaDisponible ? 'Cubierto' : 'Revisión')}</td>
        <td>${badge(a.estado)}</td>
        <td>${escapeHtml(a.fechaServicio || a.fechaCreacion || a.fechaSolicitud || '-')}</td>
      </tr>
    `
  });

  setText('kpiAutorizaciones', String(auts.length));

  const movimientos = afiliado
    ? [
        ...readLsArray(['ars_citas_clinica']).filter(matchesAfiliado).map((c) => ({
          tipo: 'Paciente creado en clínica',
          clinica: c.clinicaNombre || c.centro || '-',
          detalle: [c.afiliadoNombre || c.pacienteNombre || afiliado?.nombre || '-', c.motivo || '', c.codigoSeguro || c.afiliadoId || ''].filter(Boolean).join(' / '),
          estado: c.estadoSeguro || c.tipoAtencion || 'registrado',
          fecha: c.fechaCita || c.fechaCreacion || '-',
          fechaOrden: c.fechaCreacion || c.fechaCita || '',
          origenId: c.id || ''
        })),
        ...readLsArray(['ars_servicios_clinica', 'ars_servicios_realizados']).filter(matchesAfiliado).map((s) => ({
          tipo: 'Proceso clínico',
          clinica: s.clinicaNombre || '-',
          detalle: [s.servicio || '', s.doctor || '', s.observacion || s.observaciones || '', s.codigoSeguro || ''].filter(Boolean).join(' / '),
          estado: s.estadoAutorizacion || s.estado || s.modalidad || 'registrado',
          fecha: s.fechaRealizada || s.fechaServicio || s.fechaCreacion || '-',
          fechaOrden: s.fechaCreacion || s.fechaRealizada || s.fechaServicio || '',
          origenId: s.id || ''
        })),
        ...readLsArray(['ars_facturas', 'facturas']).filter(matchesAfiliado).map((f) => ({
          tipo: 'Factura / comprobante',
          clinica: f.clinicaNombre || f.clinica || '-',
          detalle: [f.descripcion || 'Factura generada', f.servicio || '', f.autorizacionId || ''].filter(Boolean).join(' / '),
          estado: f.estado || 'pendiente',
          fecha: f.fecha || f.fechaCreacion || '-',
          fechaOrden: f.fechaCreacion || f.fecha || '',
          origenId: f.id || ''
        })),
        ...auts.map((a) => ({
          tipo: 'Autorización registrada',
          clinica: a.clinicaNombre || a.clinica || '-',
          detalle: [a.servicio || '', a.doctor || '', a.comentarioAgente || ''].filter(Boolean).join(' / '),
          estado: a.estado || 'pendiente',
          fecha: a.fechaServicio || a.fechaSolicitud || a.fechaCreacion || '-',
          fechaOrden: a.fechaCreacion || a.fechaServicio || a.fechaSolicitud || '',
          origenId: a.id || ''
        }))
      ]
        .sort((a, b) => new Date(b.fechaOrden || 0) - new Date(a.fechaOrden || 0))
    : [];

  createTableController({
    tableBodyId: 'tablaAfiliadoMovimientos',
    emptyMessage: vinculoMessage || 'No hay movimientos realizados en clínica para este afiliado.',
    columns: 6,
    data: movimientos,
    rowRenderer: (m) => `
      <tr>
        <td>${escapeHtml(m.origenId || '-')}</td>
        <td>${escapeHtml(m.tipo || '-')}</td>
        <td>${escapeHtml(m.clinica || '-')}</td>
        <td>${escapeHtml(m.detalle || '-')}</td>
        <td>${badge(m.estado)}</td>
        <td>${escapeHtml(m.fecha || '-')}</td>
      </tr>
    `
  });

  const reclamos = afiliado
    ? readLsArray(['ars_reclamaciones', 'reclamaciones', 'ars_reclamos'])
        .filter(matchesAfiliado)
        .filter(r => ['aprobada', 'aprobado', 'comprobada', 'comprobado'].includes(normalize(r.estado)))
        .sort((a, b) => new Date(b.fechaCreacion || b.fecha || b.fechaSolicitud || 0) - new Date(a.fechaCreacion || a.fecha || a.fechaSolicitud || 0))
    : [];

  createTableController({
    tableBodyId: 'tablaAfiliadoReclamaciones',
    emptyMessage: vinculoMessage || 'No hay reclamaciones aprobadas o comprobadas para este afiliado.',
    columns: 5,
    data: reclamos,
    rowRenderer: (r) => `
      <tr>
        <td>${escapeHtml(r.id || '-')}</td>
        <td>${escapeHtml(r.motivo || r.tipo || 'Reclamación')}</td>
        <td>${escapeHtml(r.detalle || r.descripcion || r.servicio || '-')}</td>
        <td>${badge(r.estado)}</td>
        <td>${escapeHtml(r.fechaCreacion || r.fecha || r.fechaSolicitud || '-')}</td>
      </tr>
    `
  });

  setText('kpiReclamaciones', String(reclamos.length));
  setText('afiPolizaMirror', byId('afiPoliza')?.textContent || '-');
  setText('afiPlanMirror', byId('afiPlan')?.textContent || '-');
});
