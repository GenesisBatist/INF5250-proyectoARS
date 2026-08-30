document.addEventListener('DOMContentLoaded', async () => {
  const user = await ARSAuth.requireRoleOrRedirect('clinica');
  if (!user) return;

  document.getElementById('userName').textContent = user.nombre || user.username || 'Clínica / Hospital';
  document.getElementById('procesoFecha').value = new Date().toISOString().slice(0, 10);

  cargarCatalogoServicios();
  actualizarPreviewCobertura();
  renderServicios();
  renderAutorizacionesProceso();

  document.getElementById('btnBuscarAfiliadoServicio')?.addEventListener('click', buscarAfiliado);
  document.getElementById('buscarCedulaServicio')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarAfiliado();
    }
  });
  document.getElementById('procesoServicio')?.addEventListener('change', actualizarPreviewCobertura);
  document.getElementById('procesoCosto')?.addEventListener('input', actualizarPreviewCobertura);
  document.getElementById('procesoModalidad')?.addEventListener('change', actualizarPreviewCobertura);
  document.getElementById('formProcesoClinico')?.addEventListener('submit', guardarProcesoClinico);
});

function getLs(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
function setLs(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function money(v) { return `RD$ ${Number(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function badgeEstado(estado) {
  const s = String(estado || '').toLowerCase();
  const map = { aprobada: 'success', pendiente: 'warning', privada: 'secondary', rechazada: 'danger' };
  return `<span class="badge text-bg-${map[s] || 'secondary'} text-uppercase">${escapeHtml(s || '-')}</span>`;
}
function audit(accion, detalle) {
  const actual = ARSAuth?.getCurrentUser?.();
  const arr = getLs('ars_auditoria');
  arr.unshift({ id: 'AUD-' + Date.now(), usuario: actual?.nombre || 'Clínica', accion, detalle, fecha: new Date().toLocaleString('es-DO') });
  setLs('ars_auditoria', arr);
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

function cargarCatalogoServicios() {
  const select = document.getElementById('procesoServicio');
  const catalogo = [];
  try {
    const polizas = ARSAuth.getPolizas();
    polizas.forEach(p => getServiciosPoliza(p).forEach(item => catalogo.push(item)));
  } catch (e) {}
  const base = Array.from(new Set(catalogo.length ? catalogo : ['Consulta general', 'Emergencia', 'Laboratorio', 'Rayos X']));
  select.innerHTML = base.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
}

function buscarAfiliado() {
  const cedula = document.getElementById('buscarCedulaServicio').value.trim();
  if (!cedula) {
    alert('Debes escribir la cédula del afiliado.');
    return;
  }

  const afiliado = ARSAuth.findAfiliadoByCedula(cedula);
  if (!afiliado) {
    limpiarAfiliadoSeleccionado();
    alert('No se encontró un afiliado con esa cédula.');
    return;
  }

  const poliza = afiliado.polizaId ? ARSAuth.findPoliza(afiliado.polizaId) : null;
  document.getElementById('procesoAfiliadoId').value = afiliado.id;
  document.getElementById('resultadoAfiliado').classList.remove('d-none');
  document.getElementById('resAfiliadoNombre').textContent = afiliado.nombre || '-';
  document.getElementById('resAfiliadoCedula').textContent = afiliado.cedula || '-';
  document.getElementById('resCodigoSeguro').textContent = afiliado.id || '-';
  document.getElementById('resPlan').textContent = poliza ? `${poliza.id} - ${poliza.nombrePlan}` : 'Sin póliza';
  const serviciosPlan = getServiciosPoliza(poliza);
  document.getElementById('resCoberturas').textContent = serviciosPlan.length ? serviciosPlan.join(', ') : 'Sin coberturas';
  document.getElementById('resTelefono').textContent = afiliado.telefono || '-';

  const activo = String(afiliado.estado || '').toLowerCase() === 'activo' && !!poliza;
  const estadoBox = document.getElementById('resAfiliadoEstado');
  estadoBox.className = `estado-chip ${activo ? 'estado-activo' : 'estado-inactivo'}`;
  estadoBox.innerHTML = activo
    ? '<i class="bi bi-check-circle"></i><span>ACTIVO</span>'
    : '<i class="bi bi-x-circle"></i><span>INACTIVO</span>';

  actualizarPreviewCobertura();
}

function limpiarAfiliadoSeleccionado() {
  document.getElementById('procesoAfiliadoId').value = '';
  document.getElementById('resultadoAfiliado').classList.add('d-none');
  document.getElementById('mensajeProcesoClinico').className = 'alert alert-light border mt-3 mb-3';
  document.getElementById('mensajeProcesoClinico').textContent = 'Primero consulta un afiliado para validar el seguro y habilitar la generación automática de autorizaciones.';
  document.getElementById('procesoCoberturaPreview').value = '';
}

function actualizarPreviewCobertura() {
  const afiliadoId = document.getElementById('procesoAfiliadoId').value;
  const modalidad = document.getElementById('procesoModalidad').value;
  const servicio = document.getElementById('procesoServicio').value;
  const costo = Number(document.getElementById('procesoCosto').value || 0);
  const mensaje = document.getElementById('mensajeProcesoClinico');

  if (!afiliadoId) {
    document.getElementById('procesoCoberturaPreview').value = '';
    return;
  }

  const cobertura = ARSAuth.getCobertura(afiliadoId, servicio, costo);
  const activo = String(cobertura.afiliado?.estado || '').toLowerCase() === 'activo';

  if (modalidad === 'privado') {
    document.getElementById('procesoCoberturaPreview').value = 'Privado / sin intervención ARS';
    mensaje.className = 'alert alert-secondary mt-3 mb-3';
    mensaje.textContent = 'Este proceso se registrará como privado. No genera autorización y el total quedará a cargo del paciente.';
    return;
  }

  if (!activo || !cobertura.plan) {
    document.getElementById('procesoCoberturaPreview').value = 'Afiliado sin seguro activo';
    mensaje.className = 'alert alert-danger mt-3 mb-3';
    mensaje.textContent = 'El afiliado está inactivo o no tiene póliza vigente. No se puede generar autorización automática con seguro.';
    return;
  }

  document.getElementById('procesoCoberturaPreview').value = cobertura.cubierto
    ? `${money(cobertura.seguro)} cubiertos por ARS (${Number(cobertura.porcentaje || 0)}%)`
    : 'Fuera de cobertura';

  if (cobertura.cubierto) {
    mensaje.className = 'alert alert-success mt-3 mb-3';
    mensaje.textContent = 'Servicio cubierto. Al guardar, la clínica generará la autorización automáticamente y el caso quedará listo para facturación.';
  } else {
    mensaje.className = 'alert alert-warning mt-3 mb-3';
    mensaje.textContent = 'El afiliado está activo, pero el servicio no figura en la cobertura de la póliza. Se guardará una autorización pendiente de revisión.';
  }
}

function guardarProcesoClinico(e) {
  e.preventDefault();

  const afiliadoId = document.getElementById('procesoAfiliadoId').value;
  const fecha = document.getElementById('procesoFecha').value;
  const modalidad = document.getElementById('procesoModalidad').value;
  const servicio = document.getElementById('procesoServicio').value;
  const doctor = document.getElementById('procesoDoctor').value.trim();
  const costo = Number(document.getElementById('procesoCosto').value || 0);
  const diagnostico = document.getElementById('procesoDiagnostico').value.trim();
  const user = ARSAuth.getCurrentUser();

  if (!afiliadoId) return alert('Primero consulta un afiliado válido.');
  if (!fecha || !servicio || !doctor || costo <= 0) return alert('Completa todos los datos del proceso clínico.');

  const cobertura = ARSAuth.getCobertura(afiliadoId, servicio, costo);
  const activo = String(cobertura.afiliado?.estado || '').toLowerCase() === 'activo';

  let autorizacionId = 'PRIVADO';
  let estadoAutorizacion = 'privada';
  let montoSeguro = 0;
  let diferencia = costo;
  let comentario = 'Proceso privado sin cobertura de ARS.';

  if (modalidad === 'seguro') {
    if (!activo || !cobertura.plan) {
      alert('El afiliado no tiene seguro activo. Usa modalidad privada o corrige la póliza del afiliado.');
      return;
    }

    const aut = ARSAuth.createAutorizacion({
      afiliadoId,
      clinicaId: user.referenciaId,
      servicio,
      doctor,
      diagnostico,
      observacionMedica: diagnostico,
      montoEstimado: costo,
      modalidadPago: modalidad,
      autoGenerada: true,
      fechaServicio: fecha,
      fechaCreacion: new Date().toISOString(),
      creadoPorRol: 'clinica'
    });

    autorizacionId = aut.id;
    estadoAutorizacion = aut.estado;
    montoSeguro = Number(aut.montoCubierto || 0);
    diferencia = Math.max(costo - montoSeguro, 0);
    comentario = aut.comentarioAgente || '';
  }

  const servicios = getLs('ars_servicios_clinica');
  servicios.unshift({
    id: 'SER-' + Date.now(),
    autorizacionId,
    clinicaId: user.referenciaId,
    clinicaNombre: user.nombre || user.username || 'Clínica',
    afiliadoId,
    afiliadoNombre: cobertura.afiliado?.nombre || '-',
    cedula: cobertura.afiliado?.cedula || '',
    codigoSeguro: cobertura.afiliado?.id || afiliadoId,
    servicio,
    modalidad,
    fechaRealizada: fecha,
    costoFinal: costo,
    montoSeguro,
    diferencia,
    doctor,
    observacion: diagnostico,
    estadoAutorizacion,
    comentarioAutorizacion: comentario,
    facturable: true,
    fechaCreacion: new Date().toISOString()
  });
  setLs('ars_servicios_clinica', servicios);

  audit('Registrar proceso clínico', `${servicio} / ${cobertura.afiliado?.nombre || afiliadoId} / modalidad ${modalidad}`);
  alert(modalidad === 'seguro'
    ? 'Proceso guardado y autorización generada automáticamente.'
    : 'Proceso privado guardado correctamente.');

  document.getElementById('formProcesoClinico').reset();
  document.getElementById('procesoFecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('procesoAfiliadoId').value = afiliadoId;
  actualizarPreviewCobertura();
  renderServicios();
  renderAutorizacionesProceso();
}

function renderServicios() {
  const user = ARSAuth.getCurrentUser();
  const tbody = document.getElementById('tablaServiciosClinica');
  const items = getLs('ars_servicios_clinica')
    .filter(s => String(s.clinicaId) === String(user.referenciaId))
    .sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0));

  tbody.innerHTML = items.length ? items.map(s => `
    <tr>
      <td>${escapeHtml(s.id)}</td>
      <td>${escapeHtml(s.afiliadoNombre || '')}</td>
      <td>${escapeHtml(s.servicio || '')}</td>
      <td>${escapeHtml(s.modalidad || '')}</td>
      <td>${escapeHtml(s.autorizacionId || '')}</td>
      <td>${money(s.costoFinal)}</td>
      <td>${money(s.montoSeguro)}</td>
      <td>${money(s.diferencia)}</td>
    </tr>
  `).join('') : '<tr><td colspan="8" class="text-center text-muted">No hay procesos registrados.</td></tr>';
}

function renderAutorizacionesProceso() {
  const user = ARSAuth.getCurrentUser();
  const tbody = document.getElementById('tablaAutProcesos');
  const items = getLs('ars_autorizaciones')
    .filter(a => String(a.clinicaId) === String(user.referenciaId) && a.autoGenerada)
    .sort((a, b) => new Date(b.fechaCreacion || b.fechaSolicitud || 0) - new Date(a.fechaCreacion || a.fechaSolicitud || 0));

  tbody.innerHTML = items.length ? items.slice(0, 10).map(a => `
    <tr>
      <td>${escapeHtml(a.id)}</td>
      <td>${escapeHtml(a.afiliadoNombre || '')}</td>
      <td>${escapeHtml(a.servicio || '')}</td>
      <td>${escapeHtml(a.modalidadPago || 'seguro')}</td>
      <td>${badgeEstado(a.estado)}</td>
      <td>${money(a.montoCubierto)}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" class="text-center text-muted">No se han generado autorizaciones automáticas.</td></tr>';
}
