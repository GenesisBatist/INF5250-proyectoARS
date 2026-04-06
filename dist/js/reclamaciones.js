(function () {
  const STORAGE_KEY = 'reclamaciones';

  function getCurrentUser() {
    if (typeof ARSAuth === 'undefined' || !ARSAuth.getCurrentUser) return null;
    return ARSAuth.getCurrentUser();
  }

  function safeRead() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function safeWrite(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function today() {
    return new Date().toLocaleString();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function text(v) { return String(v ?? '').trim(); }
  function norm(v) { return text(v).toLowerCase(); }
  function normId(v) { return text(v).replace(/\s+/g, '').toLowerCase(); }
  function normCed(v) { return text(v).replace(/\D/g, ''); }

  function badgeEstado(estado) {
    const clases = {
      pendiente: 'warning',
      aprobada: 'success',
      comprobada: 'primary',
      rechazada: 'danger'
    };
    const css = clases[norm(estado)] || 'secondary';
    return `<span class="badge text-bg-${css} text-uppercase">${escapeHtml(estado)}</span>`;
  }

  function nextId(lista) {
    const max = lista.reduce((acc, item) => {
      const n = parseInt(String(item.id || '').replace(/\D/g, ''), 10);
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    return `REC-${String(max + 1).padStart(3, '0')}`;
  }

  function getAfiliadoDelUsuario(user) {
    if (!user || user.rol !== 'afiliado' || typeof ARSAuth === 'undefined') return null;
    const afiliados = ARSAuth.getAfiliados?.() || [];
    return afiliados.find(a => normId(a.id) === normId(user.referenciaId))
      || afiliados.find(a => normCed(a.cedula) === normCed(user.cedula))
      || afiliados.find(a => norm(a.nombre) === norm(user.nombre))
      || null;
  }

  function buildSidebar(role) {
    const menu = document.getElementById('sidebarMenu');
    const roleTitle = document.getElementById('sidebarRoleTitle');
    const roleLabel = document.getElementById('headerRoleLabel');
    const homeLinks = document.querySelectorAll('[data-home-link]');
    const home = typeof ARSAuth !== 'undefined' && ARSAuth.getHomeByRole ? ARSAuth.getHomeByRole(role) : 'examples/seleccion-rol.html';

    homeLinks.forEach((a) => { a.href = home; });

    if (role === 'afiliado') {
      roleTitle.textContent = 'Afiliado';
      roleLabel.textContent = 'Rol Afiliado';
      menu.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="afiliado-dashboard.html"><i class="nav-icon bi bi-house"></i><p>Mi historial</p></a></li>
        <li class="nav-item"><a class="nav-link active" href="reclamaciones.html"><i class="nav-icon bi bi-exclamation-circle"></i><p>Mis reclamaciones</p></a></li>`;
    } else {
      roleTitle.textContent = 'Agente ARS';
      roleLabel.textContent = 'Rol Agente';
      menu.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="agente-dashboard.html"><i class="nav-icon bi bi-house"></i><p>Dashboard</p></a></li>
        <li class="nav-item"><a class="nav-link" href="afiliados.html"><i class="nav-icon bi bi-people"></i><p>Afiliados</p></a></li>
        <li class="nav-item"><a class="nav-link" href="proveedores.html"><i class="nav-icon bi bi-hospital"></i><p>Clínicas</p></a></li>
        <li class="nav-item"><a class="nav-link" href="polizas.html"><i class="nav-icon bi bi-file-medical"></i><p>Pólizas</p></a></li>
        <li class="nav-item"><a class="nav-link" href="autorizaciones.html"><i class="nav-icon bi bi-clipboard2-check"></i><p>Autorizaciones</p></a></li>
        <li class="nav-item"><a class="nav-link" href="facturas.html"><i class="nav-icon bi bi-receipt"></i><p>Facturas clínicas</p></a></li>
        <li class="nav-item"><a class="nav-link active" href="reclamaciones.html"><i class="nav-icon bi bi-journal-text"></i><p>Historial reclamaciones</p></a></li>
        <li class="nav-item"><a class="nav-link" href="reportes.html"><i class="nav-icon bi bi-bar-chart-line"></i><p>Reportes</p></a></li>`;
    }
  }

  function setupPaginationControls(onChange) {
    const input = document.getElementById('buscarReclamacion');
    const header = input?.parentElement;
    if (!input || !header) return null;

    input.classList.add('form-control-sm');
    input.style.maxWidth = '260px';

    const sizeWrap = document.createElement('div');
    sizeWrap.className = 'd-flex align-items-center gap-2 ms-auto';
    sizeWrap.innerHTML = `
      <label class="small text-muted mb-0">Ver</label>
      <select id="cantidadReclamacion" class="form-select form-select-sm" style="width:90px;">
        <option value="5" selected>5</option>
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="30">30</option>
      </select>
    `;
    header.appendChild(sizeWrap);

    const cardBody = document.querySelector('#tablaReclamaciones')?.closest('.card-body');
    const footer = document.createElement('div');
    footer.className = 'd-flex justify-content-between align-items-center gap-2 flex-wrap mt-3';
    footer.innerHTML = `
      <small class="text-muted" id="reclamacionesResumen"></small>
      <nav><ul class="pagination pagination-sm mb-0" id="reclamacionesPaginacion"></ul></nav>
    `;
    cardBody?.appendChild(footer);

    input.addEventListener('input', onChange);
    sizeWrap.querySelector('select')?.addEventListener('change', onChange);

    return {
      input,
      select: sizeWrap.querySelector('select'),
      summary: document.getElementById('reclamacionesResumen'),
      pagination: document.getElementById('reclamacionesPaginacion')
    };
  }

  let currentPage = 1;
  let controls = null;

  function render(role, user) {
    const data = safeRead();
    const tbody = document.getElementById('tablaReclamaciones');
    const filtro = (controls?.input?.value || '').trim().toLowerCase();
    const afiliado = getAfiliadoDelUsuario(user);

    const visibles = data
      .filter((item) => {
        if (role === 'agente') return true;
        return normId(item.afiliadoId) === normId(afiliado?.id) || normCed(item.cedula) === normCed(afiliado?.cedula);
      })
      .filter((item) => {
        if (!filtro) return true;
        return [item.id, item.afiliado, item.cedula, item.motivo, item.detalle, item.estado].join(' ').toLowerCase().includes(filtro);
      })
      .sort((a, b) => new Date(b.fechaISO || b.fechaCreacion || 0) - new Date(a.fechaISO || a.fechaCreacion || 0));

    document.getElementById('kpiPendientes').textContent = visibles.filter((x) => norm(x.estado) === 'pendiente').length;
    document.getElementById('kpiAprobadas').textContent = visibles.filter((x) => norm(x.estado) === 'aprobada').length;
    document.getElementById('kpiComprobadas').textContent = visibles.filter((x) => norm(x.estado) === 'comprobada').length;
    document.getElementById('kpiRechazadas').textContent = visibles.filter((x) => norm(x.estado) === 'rechazada').length;

    const pageSize = parseInt(controls?.select?.value || '5', 10) || 5;
    const total = visibles.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pageItems = visibles.slice(start, start + pageSize);
    const from = total ? start + 1 : 0;
    const to = total ? start + pageItems.length : 0;

    tbody.innerHTML = pageItems.length ? pageItems.map((r) => {
      const acciones = role === 'agente'
        ? `
          <div class="d-flex flex-wrap gap-1">
            <button class="btn btn-success btn-sm" onclick="window.actualizarEstadoReclamacion('${r.id}','aprobada')">Aprobar</button>
            <button class="btn btn-primary btn-sm" onclick="window.actualizarEstadoReclamacion('${r.id}','comprobada')">Comprobada</button>
            <button class="btn btn-outline-danger btn-sm" onclick="window.actualizarEstadoReclamacion('${r.id}','rechazada')">Rechazar</button>
          </div>`
        : '<span class="text-muted">Consulta</span>';

      return `
        <tr>
          <td>${escapeHtml(r.id)}</td>
          <td>${escapeHtml(r.afiliado)}<br><small class="text-muted">${escapeHtml(r.cedula)}</small></td>
          <td>${escapeHtml(r.motivo)}</td>
          <td style="max-width: 240px; white-space: normal;">${escapeHtml(r.detalle)}</td>
          <td>${badgeEstado(r.estado)}</td>
          <td>${escapeHtml(r.fechaCreacion || '')}</td>
          <td>${acciones}</td>
        </tr>`;
    }).join('') : '<tr><td colspan="7" class="text-center text-muted py-4">No hay reclamaciones para mostrar.</td></tr>';

    if (controls?.summary) {
      controls.summary.textContent = total ? `Mostrando ${from}-${to} de ${total} registros` : 'No hay registros para mostrar';
    }

    if (controls?.pagination) {
      controls.pagination.innerHTML = '';
      if (totalPages > 1) {
        const addPage = (label, page, disabled = false, active = false) => {
          const li = document.createElement('li');
          li.className = `page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}`;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'page-link';
          btn.textContent = label;
          btn.disabled = disabled;
          btn.addEventListener('click', () => {
            currentPage = page;
            render(role, user);
          });
          li.appendChild(btn);
          controls.pagination.appendChild(li);
        };

        addPage('«', Math.max(1, currentPage - 1), currentPage === 1);
        for (let i = 1; i <= totalPages; i += 1) addPage(String(i), i, false, i === currentPage);
        addPage('»', Math.min(totalPages, currentPage + 1), currentPage === totalPages);
      }
    }
  }

  function setupRoleView(role, user) {
    document.getElementById('userName').textContent = user?.nombre || (role === 'agente' ? 'Agente ARS' : 'Afiliado');
    buildSidebar(role);

    const colFormulario = document.getElementById('colFormulario');
    const cardAccionesAgente = document.getElementById('cardAccionesAgente');
    const tableTitle = document.getElementById('tableTitle');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const colAccionesTitulo = document.getElementById('colAccionesTitulo');

    if (role === 'agente') {
      pageTitle.textContent = 'Historial de reclamaciones';
      pageSubtitle.textContent = 'El afiliado crea la reclamación y el agente solo revisa el historial, aprueba, rechaza o marca como comprobada.';
      tableTitle.textContent = 'Reclamaciones registradas por los afiliados';
      colFormulario.style.display = 'none';
      document.getElementById('colTabla').className = 'col-12';
      cardAccionesAgente.style.display = '';
      colAccionesTitulo.textContent = 'Acciones';
    } else {
      pageTitle.textContent = 'Mis reclamaciones';
      pageSubtitle.textContent = 'Registra reclamaciones sobre cobertura, autorizaciones, pagos o servicios, y consulta su estado.';
      tableTitle.textContent = 'Historial de mis reclamaciones';
      cardAccionesAgente.style.display = 'none';
      colAccionesTitulo.textContent = 'Vista';

      const afiliado = getAfiliadoDelUsuario(user);
      document.getElementById('afiliadoNombre').value = afiliado?.nombre || '';
      document.getElementById('afiliadoCedula').value = afiliado?.cedula || '';
    }
  }

  function handleCreate(role, user) {
    const form = document.getElementById('formReclamacion');
    if (!form || role !== 'afiliado') return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const afiliado = getAfiliadoDelUsuario(user);
      if (!afiliado) {
        alert('No se pudo identificar el afiliado actual.');
        return;
      }

      const motivo = document.getElementById('motivo').value.trim();
      const detalle = document.getElementById('detalle').value.trim();
      if (!motivo || !detalle) {
        alert('Complete el motivo y el detalle de la reclamación.');
        return;
      }
      if (detalle.length > 300) {
        alert('El detalle no puede pasar de 300 caracteres.');
        return;
      }

      const lista = safeRead();
      const nueva = {
        id: nextId(lista),
        afiliadoId: afiliado.id,
        afiliado: afiliado.nombre,
        cedula: afiliado.cedula,
        motivo,
        detalle,
        estado: 'pendiente',
        fechaCreacion: today(),
        fechaISO: new Date().toISOString(),
        revisadoPor: null,
        fechaRevision: null
      };

      lista.push(nueva);
      safeWrite(lista);
      form.reset();
      document.getElementById('afiliadoNombre').value = afiliado?.nombre || '';
      document.getElementById('afiliadoCedula').value = afiliado?.cedula || '';
      alert(`Reclamación ${nueva.id} enviada correctamente.`);
      currentPage = 1;
      render(role, user);
    });
  }

  window.actualizarEstadoReclamacion = function (id, estado) {
    const user = getCurrentUser();
    if (!user || user.rol !== 'agente') return;

    const lista = safeRead().map((item) => item.id === id ? {
      ...item,
      estado,
      revisadoPor: user.nombre,
      fechaRevision: today()
    } : item);

    safeWrite(lista);
    render('agente', user);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (!user || !['agente', 'afiliado'].includes(user.rol)) {
      window.location.href = 'examples/seleccion-rol.html';
      return;
    }

    setupRoleView(user.rol, user);
    controls = setupPaginationControls(() => {
      currentPage = 1;
      render(user.rol, user);
    });
    handleCreate(user.rol, user);
    render(user.rol, user);

    window.addEventListener('storage', () => render(user.rol, user));
    window.addEventListener('focus', () => render(user.rol, user));
  });
})();
