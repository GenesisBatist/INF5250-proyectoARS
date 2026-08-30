function applyRoleLayout() {
  const user = ARSAuth.getCurrentUser();
  if (!user) return;

  const home = ARSAuth.getHomeByRole ? ARSAuth.getHomeByRole(user.rol) : 'examples/seleccion-rol.html';
  document.querySelectorAll('[data-home-link]').forEach(a => a.href = home);

  const headerRoleLabel = document.getElementById('headerRoleLabel');
  if (headerRoleLabel) {
    headerRoleLabel.textContent = user.rol === 'clinica' ? 'Rol Clínica' : user.rol === 'agente' ? 'Rol Agente' : 'Rol Afiliado';
  }

  const userName = document.getElementById('userName');
  if (userName) userName.textContent = user.nombre || user.username || 'Usuario';

  const sidebar = document.getElementById('sidebarMenuAutorizaciones');
  if (!sidebar) return;

  if (user.rol === 'clinica') {
    sidebar.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="clinica-dashboard.html"><i class="nav-icon bi bi-house"></i><p>Dashboard</p></a></li>
      <li class="nav-item"><a class="nav-link active" href="autorizaciones.html"><i class="nav-icon bi bi-clipboard2-check"></i><p>Autorizaciones</p></a></li>
      <li class="nav-item"><a class="nav-link" href="servicios-clinica.html"><i class="nav-icon bi bi-heart-pulse"></i><p>Servicios realizados</p></a></li>
      <li class="nav-item"><a class="nav-link" href="facturas.html"><i class="nav-icon bi bi-receipt"></i><p>Facturas</p></a></li>`;
  } else if (user.rol === 'afiliado') {
    sidebar.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="afiliado-dashboard.html"><i class="nav-icon bi bi-house"></i><p>Mi historial</p></a></li>
      <li class="nav-item"><a class="nav-link active" href="autorizaciones.html"><i class="nav-icon bi bi-clipboard2-check"></i><p>Mis autorizaciones</p></a></li>
      <li class="nav-item"><a class="nav-link" href="reclamaciones.html"><i class="nav-icon bi bi-exclamation-circle"></i><p>Mis reclamaciones</p></a></li>`;
  } else {
    sidebar.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="agente-dashboard.html"><i class="nav-icon bi bi-house"></i><p>Dashboard</p></a></li>
      <li class="nav-item"><a class="nav-link" href="afiliados.html"><i class="nav-icon bi bi-people"></i><p>Afiliados</p></a></li>
      <li class="nav-item"><a class="nav-link" href="proveedores.html"><i class="nav-icon bi bi-hospital"></i><p>Clínicas</p></a></li>
      <li class="nav-item"><a class="nav-link" href="polizas.html"><i class="nav-icon bi bi-file-medical"></i><p>Pólizas</p></a></li>
      <li class="nav-item"><a class="nav-link active" href="autorizaciones.html"><i class="nav-icon bi bi-clipboard2-check"></i><p>Autorizaciones</p></a></li>
      <li class="nav-item"><a class="nav-link" href="facturas.html"><i class="nav-icon bi bi-receipt"></i><p>Facturas clínicas</p></a></li>
      <li class="nav-item"><a class="nav-link" href="reclamaciones.html"><i class="nav-icon bi bi-journal-text"></i><p>Historial reclamaciones</p></a></li>
      <li class="nav-item"><a class="nav-link" href="reportes.html"><i class="nav-icon bi bi-bar-chart-line"></i><p>Reportes</p></a></li>`;
  }
}

const FILAS_POR_PAGINA_AUTORIZACIONES = 7;
const FILAS_POR_PAGINA_DESGLOSE = 10;
let paginaAutorizacionesActual = 1;
let paginaDesgloseActual = 1;

function formatMoney(value) {
  return `RD$ ${Number(value || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function badgeEstado(estado) {
  const map = { pendiente: 'warning', aprobada: 'success', rechazada: 'danger', privada: 'secondary' };
  return `<span class="badge text-bg-${map[estado] || 'secondary'} text-uppercase">${escapeHtml(estado)}</span>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function getCoberturasPoliza(poliza) {
  if (!poliza) return [];
  if (typeof ARSAuth?.normalizePolicyCoverage === 'function') return ARSAuth.normalizePolicyCoverage(poliza);
  if (Array.isArray(poliza.coberturas)) return poliza.coberturas;
  return Array.isArray(poliza.cobertura) ? poliza.cobertura.map(servicio => ({ servicio, porcentaje: 100, tope: 0 })) : [];
}

function getServiciosPoliza(poliza) {
  return getCoberturasPoliza(poliza).map(item => item.servicio).filter(Boolean);
}

function ordenarAutorizaciones(items) {
  return [...items].sort((a, b) => {
    const fechaA = new Date(a.fechaCreacion || a.fechaSolicitud || a.fecha || 0).getTime();
    const fechaB = new Date(b.fechaCreacion || b.fechaSolicitud || b.fecha || 0).getTime();
    return fechaB - fechaA;
  });
}

function obtenerAutorizacionesFiltradas() {
  const user = ARSAuth.getCurrentUser();
  const term = (document.getElementById('buscarTablaAutorizaciones')?.value || '').toLowerCase().trim();
  let items = ARSAuth.getAutorizaciones();

  if (user.rol === 'clinica') items = items.filter(a => String(a.clinicaId) === String(user.referenciaId));
  if (user.rol === 'afiliado') items = items.filter(a => String(a.afiliadoId) === String(user.referenciaId));

  if (term) {
    items = items.filter(a => [a.id, a.afiliadoNombre, a.cedula, a.clinicaNombre, a.servicio, a.doctor, a.diagnostico].join(' ').toLowerCase().includes(term));
  }

  return ordenarAutorizaciones(items);
}

function asegurarContenedorPaginacion() {
  const tabla = document.getElementById('tablaAutorizaciones');
  if (!tabla) return null;
  const table = tabla.closest('table');
  if (!table) return null;

  let wrap = document.getElementById('paginacionAutorizacionesWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'paginacionAutorizacionesWrap';
    wrap.className = 'd-flex flex-wrap justify-content-between align-items-center gap-2 mt-3';
    wrap.innerHTML = `
      <div id="infoPaginacionAutorizaciones" class="text-muted small"></div>
      <div id="paginacionAutorizaciones" class="d-flex align-items-center gap-2"></div>`;
    const responsive = table.closest('.table-responsive');
    if (responsive) responsive.insertAdjacentElement('afterend', wrap);
    else table.insertAdjacentElement('afterend', wrap);
  }
  return wrap;
}

function renderPaginacion(totalItems) {
  const wrap = asegurarContenedorPaginacion();
  if (!wrap) return;

  const info = document.getElementById('infoPaginacionAutorizaciones');
  const nav = document.getElementById('paginacionAutorizaciones');
  if (!info || !nav) return;

  if (!totalItems) {
    info.textContent = 'Mostrando 0 de 0 autorizaciones';
    nav.innerHTML = '';
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(totalItems / FILAS_POR_PAGINA_AUTORIZACIONES));
  if (paginaAutorizacionesActual > totalPaginas) paginaAutorizacionesActual = totalPaginas;

  const inicio = ((paginaAutorizacionesActual - 1) * FILAS_POR_PAGINA_AUTORIZACIONES) + 1;
  const fin = Math.min(paginaAutorizacionesActual * FILAS_POR_PAGINA_AUTORIZACIONES, totalItems);
  info.textContent = `Mostrando ${inicio}-${fin} de ${totalItems} autorizaciones`;
  nav.innerHTML = `
    <button type="button" class="btn btn-outline-secondary btn-sm" ${paginaAutorizacionesActual === 1 ? 'disabled' : ''} onclick="cambiarPaginaAutorizaciones(-1)">Anterior</button>
    <span class="fw-semibold small">Página ${paginaAutorizacionesActual} de ${totalPaginas}</span>
    <button type="button" class="btn btn-outline-secondary btn-sm" ${paginaAutorizacionesActual === totalPaginas ? 'disabled' : ''} onclick="cambiarPaginaAutorizaciones(1)">Siguiente</button>`;
}

function cambiarPaginaAutorizaciones(delta) {
  const totalItems = obtenerAutorizacionesFiltradas().length;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / FILAS_POR_PAGINA_AUTORIZACIONES));
  const nueva = paginaAutorizacionesActual + delta;
  if (nueva < 1 || nueva > totalPaginas) return;
  paginaAutorizacionesActual = nueva;
  renderTabla();
}
window.cambiarPaginaAutorizaciones = cambiarPaginaAutorizaciones;

function renderTabla() {
  const tbody = document.getElementById('tablaAutorizaciones');
  if (!tbody) return;

  const user = ARSAuth.getCurrentUser();
  const items = obtenerAutorizacionesFiltradas();
  const totalPaginas = Math.max(1, Math.ceil(items.length / FILAS_POR_PAGINA_AUTORIZACIONES));
  if (paginaAutorizacionesActual > totalPaginas) paginaAutorizacionesActual = totalPaginas;

  const inicio = (paginaAutorizacionesActual - 1) * FILAS_POR_PAGINA_AUTORIZACIONES;
  const visibles = items.slice(inicio, inicio + FILAS_POR_PAGINA_AUTORIZACIONES);

  tbody.innerHTML = visibles.length ? visibles.map(a => {
    const comentario = a.comentarioAgente || a.observacionMedica || '-';
    const action = user.rol === 'agente' ? `<span>${escapeHtml(comentario)}</span>` : `<span>${escapeHtml(comentario)}</span>`;
    return `
      <tr>
        <td>${escapeHtml(a.id)}</td>
        <td>${escapeHtml(a.afiliadoNombre)}</td>
        <td>${escapeHtml(a.cedula)}</td>
        <td>${escapeHtml(a.clinicaNombre)}</td>
        <td>${escapeHtml(a.servicio)}</td>
        <td>${a.coberturaDisponible ? '<span class="badge text-bg-success">Cubierto</span>' : '<span class="badge text-bg-danger">No cubierto</span>'}</td>
        <td>${badgeEstado(a.estado)}</td>
        <td>${action}</td>
      </tr>`;
  }).join('') : '<tr><td colspan="8" class="text-center text-muted">No hay registros de autorizaciones</td></tr>';

  renderPaginacion(items.length);
}

function cargarSelectAfiliados(id) {
  const select = document.getElementById(id);
  if (!select) return;
  const afiliados = ARSAuth.getAfiliados();
  select.innerHTML = afiliados.length ? afiliados.map(a => `<option value="${a.id}">${a.id} - ${a.nombre} - ${a.cedula}</option>`).join('') : '<option value="">No hay afiliados registrados</option>';
}

function buscarAfiliadoPorCedula() {
  const cedula = document.getElementById('buscarCedulaAut').value.trim();
  if (!cedula) {
    alert('Escribe la cédula del afiliado para buscarlo.');
    return;
  }
  const afiliado = ARSAuth.findAfiliadoByCedula(cedula);
  if (!afiliado) {
    alert('No se encontró un afiliado con esa cédula.');
    return;
  }
  document.getElementById('clinicaAfiliadoId').value = afiliado.id;
  syncAfiliadoData();
}

function syncAfiliadoData() {
  const afiliadoId = document.getElementById('clinicaAfiliadoId').value;
  const afiliado = ARSAuth.findAfiliado(afiliadoId);
  const poliza = afiliado ? ARSAuth.findPoliza(afiliado.polizaId) : null;
  document.getElementById('autNumeroAfiliado').value = afiliado?.id || '';
  document.getElementById('autPlanAfiliado').value = poliza ? `${poliza.id} - ${poliza.nombrePlan}` : '';
  const serviciosPlan = getServiciosPoliza(poliza);
  document.getElementById('autCoberturaResumen').value = serviciosPlan.length ? `${serviciosPlan.length} servicios` : 'Sin cobertura';
  cargarServiciosSegunPoliza(poliza);
}

function cargarServiciosSegunPoliza(poliza) {
  const select = document.getElementById('servicioSolicitado');
  if (!select) return;
  const serviciosPlan = getServiciosPoliza(poliza);
  const base = serviciosPlan.length ? serviciosPlan : ['Consulta general', 'Emergencia', 'Laboratorio'];
  select.innerHTML = base.map(item => `<option value="${item}">${item}</option>`).join('');
  updateCoveragePreview();
}

function updateCoveragePreview() {
  const afiliado = ARSAuth.findAfiliado(document.getElementById('clinicaAfiliadoId').value);
  const poliza = afiliado ? ARSAuth.findPoliza(afiliado.polizaId) : null;
  const servicio = document.getElementById('servicioSolicitado').value;
  const cobertura = afiliado ? ARSAuth.getCobertura(afiliado.id, servicio, document.getElementById('montoEstimado').value || 0) : null;
  const cubierto = !!cobertura?.cubierto;
  const porcentaje = Number(cobertura?.porcentaje || 0);
  document.getElementById('coberturaServicio').value = cubierto ? `Servicio cubierto (${porcentaje}%${cobertura?.topeServicio ? `, tope RD$ ${Number(cobertura.topeServicio).toLocaleString('es-DO')}` : ''})` : 'Fuera de cobertura';
  document.getElementById('estadoPreliminar').value = cubierto ? 'Autorización automática' : 'Pendiente de revisión por cobertura';
}

function initClinicaVista() {
  document.getElementById('clinicaFormWrap')?.classList.remove('d-none');
  const user = ARSAuth.getCurrentUser();
  const clinica = ARSAuth.findClinica(user.referenciaId);
  const clinicaNombreInput = document.getElementById('autClinicaNombre');
  if (clinicaNombreInput) clinicaNombreInput.value = clinica?.nombre || '';

  cargarSelectAfiliados('clinicaAfiliadoId');
  syncAfiliadoData();
  document.getElementById('clinicaAfiliadoId')?.addEventListener('change', syncAfiliadoData);
  document.getElementById('servicioSolicitado')?.addEventListener('change', updateCoveragePreview);
  document.getElementById('btnBuscarAfiliadoAut')?.addEventListener('click', buscarAfiliadoPorCedula);
  document.getElementById('buscarCedulaAut')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarAfiliadoPorCedula();
    }
  });

  document.getElementById('formClinicaAutorizacion')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      const nueva = ARSAuth.createAutorizacion({
        afiliadoId: f.clinicaAfiliadoId.value,
        servicio: f.servicio.value,
        doctor: f.doctor.value.trim(),
        especialidad: f.especialidad.value.trim(),
        prioridad: f.prioridad.value,
        fechaServicio: f.fechaServicio.value,
        diagnostico: f.diagnostico.value.trim(),
        observacionMedica: f.observacionMedica.value.trim(),
        montoEstimado: f.monto.value,
        creadoPorRol: 'clinica',
        modalidadPago: 'seguro',
        autoGenerada: true,
        clinicaId: ARSAuth.getCurrentUser().referenciaId,
        fechaCreacion: new Date().toISOString()
      });
      const msg = nueva.estado === 'aprobada'
        ? 'Autorización generada y aprobada automáticamente por cobertura.'
        : 'Autorización generada. Quedó pendiente porque el servicio no está cubierto.';
      alert(msg);
      f.reset();
      cargarSelectAfiliados('clinicaAfiliadoId');
      syncAfiliadoData();
      paginaAutorizacionesActual = 1;
      renderTabla();
    } catch (err) {
      alert(err.message);
    }
  });
}

function obtenerDesgloseClinica() {
  const term = (document.getElementById('buscarClinicaDesglose')?.value || '').toLowerCase().trim();
  let items = ordenarAutorizaciones(ARSAuth.getAutorizaciones());
  if (term) {
    items = items.filter(a => String(a.clinicaNombre || '').toLowerCase().includes(term));
  }
  return items;
}

function renderDesgloseClinica() {
  const tbody = document.getElementById('tablaDesgloseClinica');
  if (!tbody) return;

  const items = obtenerDesgloseClinica();
  const clinicasUnicas = new Set(items.map(a => String(a.clinicaNombre || '').trim()).filter(Boolean));
  const aprobadas = items.filter(a => String(a.estado).toLowerCase() === 'aprobada').length;
  const pendientes = items.length - aprobadas;

  const totalPaginas = Math.max(1, Math.ceil(items.length / FILAS_POR_PAGINA_DESGLOSE));
  if (paginaDesgloseActual > totalPaginas) paginaDesgloseActual = totalPaginas;

  const inicio = (paginaDesgloseActual - 1) * FILAS_POR_PAGINA_DESGLOSE;
  const visibles = items.slice(inicio, inicio + FILAS_POR_PAGINA_DESGLOSE);

  tbody.innerHTML = visibles.length ? visibles.map(a => `
    <tr>
      <td>${escapeHtml(a.clinicaNombre)}</td>
      <td>${escapeHtml(a.id)}</td>
      <td>${escapeHtml(a.afiliadoNombre)}</td>
      <td>${escapeHtml(a.cedula)}</td>
      <td>${escapeHtml(a.servicio)}</td>
      <td>${a.coberturaDisponible ? '<span class="badge text-bg-success">Cubierto</span>' : '<span class="badge text-bg-danger">No cubierto</span>'}</td>
      <td>${badgeEstado(a.estado)}</td>
      <td>${escapeHtml(a.comentarioAgente || a.observacionMedica || '-')}</td>
    </tr>`).join('') : '<tr><td colspan="8" class="text-center text-muted">No hay autorizaciones para la clínica buscada.</td></tr>';

  const desde = items.length ? inicio + 1 : 0;
  const hasta = items.length ? Math.min(inicio + FILAS_POR_PAGINA_DESGLOSE, items.length) : 0;
  document.getElementById('infoPaginacionDesglose').textContent = `Mostrando ${desde}-${hasta} de ${items.length} autorizaciones`;
  document.getElementById('pageDesgloseLabel').textContent = `Página ${paginaDesgloseActual} de ${totalPaginas}`;
  document.getElementById('btnPrevDesglose').disabled = paginaDesgloseActual <= 1;
  document.getElementById('btnNextDesglose').disabled = paginaDesgloseActual >= totalPaginas;
  document.getElementById('resClinicasEncontradas').textContent = clinicasUnicas.size;
  document.getElementById('resAutorizacionesMostradas').textContent = items.length;
  document.getElementById('resAprobadasDesglose').textContent = aprobadas;
  document.getElementById('resPendientesDesglose').textContent = pendientes;
}

function initAgenteVista() {
  document.getElementById('agenteDesgloseWrap')?.classList.remove('d-none');
  document.getElementById('buscarClinicaDesglose')?.addEventListener('input', () => {
    paginaDesgloseActual = 1;
    renderDesgloseClinica();
  });
  document.getElementById('btnPrevDesglose')?.addEventListener('click', () => {
    if (paginaDesgloseActual > 1) {
      paginaDesgloseActual--;
      renderDesgloseClinica();
    }
  });
  document.getElementById('btnNextDesglose')?.addEventListener('click', () => {
    const totalPaginas = Math.max(1, Math.ceil(obtenerDesgloseClinica().length / FILAS_POR_PAGINA_DESGLOSE));
    if (paginaDesgloseActual < totalPaginas) {
      paginaDesgloseActual++;
      renderDesgloseClinica();
    }
  });
  renderDesgloseClinica();
}

function initAfiliadoVista() {
  document.getElementById('rolMessage')?.classList.replace('alert-info', 'alert-primary');
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await ARSAuth.requireRoleOrRedirect(['agente', 'clinica', 'afiliado']);
  if (!user) return;

  applyRoleLayout();

  const rolMessage = document.getElementById('rolMessage');
  const msg = {
    agente: 'Como Agente ARS, aquí solo ves el listado y el desglose por clínica para control y pago mensual. Se eliminó la sección inferior de decisión manual.',
    clinica: 'Como Clínica / Hospital, aquí generas autorizaciones automáticas. Si el afiliado está activo y el servicio está cubierto, la autorización queda aprobada automáticamente.',
    afiliado: 'Como Afiliado, aquí solo consultas el estado de las autorizaciones relacionadas con tu documento.'
  };
  if (rolMessage) rolMessage.textContent = msg[user.rol] || 'Autorizaciones médicas';

  if (user.rol === 'agente') initAgenteVista();
  else if (user.rol === 'clinica') initClinicaVista();
  else if (user.rol === 'afiliado') initAfiliadoVista();

  document.getElementById('buscarTablaAutorizaciones')?.addEventListener('input', () => {
    paginaAutorizacionesActual = 1;
    renderTabla();
  });

  renderTabla();
});
