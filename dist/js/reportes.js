(function () {
  const PAGE_DEFAULT = 5;
  let paginaHistorialPago = 1;

  const money = (value) => `RD$ ${Number(value || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

  function normalizeChrome(user) {
    const header = document.querySelector('.app-header .container-fluid');
    if (header) {
      header.innerHTML = `
        <a class="navbar-brand anchor-home brand-text-strong" href="agente-dashboard.html">Sistema ARS Salud</a>
        <div class="ms-auto d-flex align-items-center gap-2">
          <span class="header-pill">Rol Agente</span>
          <span id="userName" class="fw-semibold">${escapeHtml(user?.nombre || user?.username || 'Agente ARS')}</span>
          <button class="btn btn-outline-secondary btn-sm" id="btnLogout">Salir</button>
        </div>`;
    }

    const sidebarMenu = document.querySelector('.sidebar-menu');
    if (sidebarMenu) {
      sidebarMenu.setAttribute('role', 'menu');
      sidebarMenu.removeAttribute('data-accordion');
    }

    const brand = document.querySelector('.sidebar-brand .brand-link');
    if (brand) {
      brand.setAttribute('href', 'agente-dashboard.html');
    }

    const logoutBtn = document.getElementById('btnLogout');
    logoutBtn?.addEventListener('click', function (e) {
      e.preventDefault();
      window.ARSAuth?.logout?.();
    });
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
    const { afiliados, autorizaciones, facturas, clinicas } = obtenerDatos();
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

    const tot = window.ARSReportesFiltros.totales(getFacturasFiltradas());
    setText('montoFacturado', money(tot.facturado));
    setText('montoSeguro', money(tot.seguro));
    setText('montoPaciente', money(tot.paciente));
  }

  function leerFiltros() {
    const val = (id) => document.getElementById(id)?.value || '';
    return { clinicaId: val('filtroClinica'), estado: val('filtroEstado'), desde: val('filtroDesde'), hasta: val('filtroHasta') };
  }

  function getFacturasFiltradas() {
    return window.ARSReportesFiltros.filtrarFacturas(obtenerDatos().facturas, leerFiltros());
  }

  function construirHistorialPago() {
    return window.ARSReportesFiltros.resumenPorClinica(getFacturasFiltradas());
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
        <td>${r.facturas}</td>
        <td>${money(r.totalARS)}</td>
        <td>${money(r.totalPaciente)}</td>
        <td>${money(r.pendienteARS)}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="text-center py-4 text-muted">No hay datos para mostrar.</td></tr>';

    if (info) info.textContent = `Mostrando ${total ? inicio + 1 : 0}-${total ? Math.min(fin, total) : 0} de ${total} clínicas`;
    if (btnPrev) btnPrev.disabled = paginaHistorialPago <= 1;
    if (btnNext) btnNext.disabled = paginaHistorialPago >= totalPaginas;
  }

  // Llena las listas de clínica y estado con lo que hay en los datos, sin perder lo que el agente ya eligió.
  function llenarOpcionesFiltros() {
    const { facturas, clinicas } = obtenerDatos();
    const selClinica = document.getElementById('filtroClinica');
    const selEstado = document.getElementById('filtroEstado');
    if (selClinica) {
      const actual = selClinica.value;
      selClinica.innerHTML = '<option value="">Todas</option>' + clinicas
        .map(c => ({ id: String(c.id ?? ''), nombre: c.nombre || c.clinica || c.nombreClinica || `Clínica ${c.id}` }))
        .filter(c => c.id)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nombre)}</option>`).join('');
      selClinica.value = actual;
    }
    if (selEstado) {
      const actual = selEstado.value;
      selEstado.innerHTML = '<option value="">Todos</option>' + window.ARSReportesFiltros.estadosDisponibles(facturas)
        .map(e => `<option value="${escapeHtml(e.valor)}">${escapeHtml(e.etiqueta)}</option>`).join('');
      selEstado.value = actual;
    }
  }

  function actualizarInfoFiltros() {
    const total = obtenerDatos().facturas.length;
    const visibles = getFacturasFiltradas().length;
    const f = leerFiltros();
    const hayFiltro = !!(f.clinicaId || f.estado || f.desde || f.hasta);
    setText('infoFiltros', hayFiltro ? `Filtros activos: ${visibles} de ${total} facturas.` : 'Mostrando todas las facturas.');
  }

  function aplicarFiltros() {
    paginaHistorialPago = 1;
    cargarResumenes();
    renderHistorialPago();
    actualizarInfoFiltros();
  }

  function bindFiltros() {
    ['filtroClinica', 'filtroEstado', 'filtroDesde', 'filtroHasta'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', aplicarFiltros);
    });
    document.getElementById('btnLimpiarFiltros')?.addEventListener('click', function () {
      ['filtroClinica', 'filtroEstado', 'filtroDesde', 'filtroHasta'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      aplicarFiltros();
    });
  }

  function bindHistorialPago() {
    document.getElementById('buscarHistorialPago')?.addEventListener('input', function () { paginaHistorialPago = 1; renderHistorialPago(); });
    document.getElementById('limiteHistorialPago')?.addEventListener('change', function () { paginaHistorialPago = 1; renderHistorialPago(); });
    document.getElementById('btnPrevHistorialPago')?.addEventListener('click', function () { if (paginaHistorialPago > 1) { paginaHistorialPago--; renderHistorialPago(); } });
    document.getElementById('btnNextHistorialPago')?.addEventListener('click', function () { const totalPaginas = Math.max(1, Math.ceil(getHistorialFiltrado().length / getPageSize())); if (paginaHistorialPago < totalPaginas) { paginaHistorialPago++; renderHistorialPago(); } });
  }

  // syncAll() guarda en localStorage y ese guardado avisa con 'ars:storage-sync', que vuelve a llamar a refresh().
  // Sin esta bandera la página se llama a sí misma sin fin (desbordamiento de pila). Se ignora el aviso mientras se refresca.
  let refrescando = false;
  function refresh() {
    if (refrescando) return;
    refrescando = true;
    try {
      window.ARSFinanzasSync?.syncAll?.();
      llenarOpcionesFiltros();
      cargarResumenes();
      renderHistorialPago();
      actualizarInfoFiltros();
    } finally {
      refrescando = false;
    }
  }

  function refreshFromSql() {
    const done = function () { refresh(); };
    const promise = window.ARSHybridStorage?.refreshNow?.();
    if (promise && typeof promise.finally === 'function') {
      promise.finally(done);
      return;
    }
    done();
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const user = await window.ARSAuth.requireRoleOrRedirect('agente');
    if (!user) return;
    normalizeChrome(user);
    bindHistorialPago();
    bindFiltros();
    refreshFromSql();
    window.addEventListener('focus', refreshFromSql);
    window.addEventListener('ars:storage-sync', refresh);
  });

  window.cargarReportes = refresh;
})();
