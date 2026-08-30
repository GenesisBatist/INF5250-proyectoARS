document.addEventListener('DOMContentLoaded', async () => {
  const user = await ARSAuth.requireRoleOrRedirect('clinica');
  if (!user) return;

  const qs = (id) => document.getElementById(id);
  qs('userName').textContent = user.nombre || user.username || 'Clínica / Hospital';
  qs('pcFechaCita').value = new Date().toISOString().slice(0, 10);
  qs('pcCentro').value = user.nombre || user.username || 'Clínica / Hospital';

  limitarNumeros('pcTelefono', 10);
  limitarNumeros('pcCedula', 11);

  qs('pcTipoAtencion')?.addEventListener('change', toggleTipoAtencion);
  qs('btnConsultarSeguro')?.addEventListener('click', consultarSeguro);
  qs('formCrearPacienteClinica')?.addEventListener('submit', guardarPacienteAgendado);
  qs('buscarPacienteAgendado')?.addEventListener('input', () => { state.page = 1; renderTabla(); });
  qs('btnPrevPacientesAgendados')?.addEventListener('click', () => { if (state.page > 1) { state.page--; renderTabla(); }});
  qs('btnNextPacientesAgendados')?.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(getFilteredItems().length / state.pageSize));
    if (state.page < totalPages) { state.page++; renderTabla(); }
  });

  toggleTipoAtencion();
  renderTabla();
});

const state = { page: 1, pageSize: 10 };

function lsRead(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
function lsWrite(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function limitarNumeros(id, maxLen) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', function () { this.value = (this.value || '').replace(/\D/g, '').slice(0, maxLen); });
}
function normalizarNumero(v) { return String(v || '').replace(/\D/g, ''); }
function badgeEstado(estado) {
  const s = String(estado || '').toLowerCase();
  const map = { activo: 'success', inactivo: 'secondary', vencido: 'danger', privado: 'dark', pendiente: 'warning' };
  return `<span class="badge text-bg-${map[s] || 'secondary'} text-uppercase">${escapeHtml(s || '-')}</span>`;
}
function auditar(accion, detalle) {
  const logs = lsRead('ars_auditoria');
  const user = ARSAuth?.getCurrentUser?.();
  logs.unshift({ id: 'AUD-' + Date.now(), fecha: new Date().toLocaleString('es-DO'), usuario: user?.nombre || 'Clínica', accion, detalle });
  lsWrite('ars_auditoria', logs);
}
function resetPanelSeguro() {
  document.getElementById('pcSeguro').value = '';
  document.getElementById('pcEstadoSeguro').value = '';
  document.getElementById('viewAfiliado').textContent = '-';
  document.getElementById('viewPoliza').textContent = '-';
  document.getElementById('viewPlan').textContent = '-';
  document.getElementById('viewEstado').textContent = '-';
  document.getElementById('seguroBadgeWrap').innerHTML = '';
}
function toggleTipoAtencion() {
  const tipo = (document.getElementById('pcTipoAtencion')?.value || 'seguro').toLowerCase();
  const bloque = document.getElementById('bloqueSeguro');
  const ayuda = document.getElementById('textoAyudaSeguro');
  const codigo = document.getElementById('pcCodigoSeguro');

  if (bloque) bloque.classList.toggle('d-none', tipo !== 'seguro');

  if (tipo === 'privado') {
    if (codigo) codigo.value = '';
    document.getElementById('pcSeguro').value = 'PRIVADO';
    document.getElementById('pcEstadoSeguro').value = 'PRIVADO';
    document.getElementById('viewEstado').textContent = 'PRIVADO';
    document.getElementById('seguroBadgeWrap').innerHTML = badgeEstado('privado');
    if (ayuda) ayuda.textContent = 'Paciente privado: no requiere validación de seguro.';
  } else {
    resetPanelSeguro();
    if (ayuda) ayuda.textContent = 'Ingresa el código del seguro generado por el Agente, por ejemplo AFI-001.';
  }
}
function consultarSeguro() {
  const codigo = String(document.getElementById('pcCodigoSeguro').value || '').trim().toUpperCase();
  if (!/^AFI-\d{3,}$/i.test(codigo)) {
    alert('Debes escribir un código válido como AFI-001.');
    return;
  }

  const afiliados = lsRead('ars_afiliados');
  const polizas = lsRead('ars_polizas');
  const afiliado = afiliados.find(a => String(a.id || '').toUpperCase() === codigo);

  const viewAfiliado = document.getElementById('viewAfiliado');
  const viewPoliza = document.getElementById('viewPoliza');
  const viewPlan = document.getElementById('viewPlan');
  const viewEstado = document.getElementById('viewEstado');
  const badgeWrap = document.getElementById('seguroBadgeWrap');

  if (!afiliado) {
    document.getElementById('pcSeguro').value = 'No encontrado';
    document.getElementById('pcEstadoSeguro').value = 'INACTIVO';
    badgeWrap.innerHTML = badgeEstado('inactivo');
    viewAfiliado.textContent = '-';
    viewPoliza.textContent = '-';
    viewPlan.textContent = '-';
    viewEstado.textContent = 'No encontrado';
    return;
  }

  const poliza = polizas.find(p => String(p.id) === String(afiliado.polizaId || afiliado.poliza));
  const estado = String(afiliado.estado || 'inactivo').toUpperCase();

  document.getElementById('pcCedula').value = normalizarNumero(afiliado.cedula).slice(0, 11);
  document.getElementById('pcNombre').value = afiliado.nombre || afiliado.afiliado || '';
  document.getElementById('pcTelefono').value = normalizarNumero(afiliado.telefono).slice(0, 10);
  document.getElementById('pcFechaNacimiento').value = afiliado.fechaNacimiento || '';
  document.getElementById('pcSeguro').value = poliza?.nombrePlan || afiliado.poliza || afiliado.polizaId || 'Sin póliza';
  document.getElementById('pcEstadoSeguro').value = estado;

  viewAfiliado.textContent = afiliado.nombre || afiliado.afiliado || '-';
  viewPoliza.textContent = poliza?.id || afiliado.polizaId || '-';
  viewPlan.textContent = poliza?.nombrePlan || afiliado.poliza || '-';
  viewEstado.textContent = estado;
  badgeWrap.innerHTML = badgeEstado(afiliado.estado || 'inactivo');
}
function guardarPacienteAgendado(e) {
  e.preventDefault();
  const user = ARSAuth.getCurrentUser();
  const tipoAtencion = (document.getElementById('pcTipoAtencion').value || 'seguro').toLowerCase();
  const codigoSeguro = String(document.getElementById('pcCodigoSeguro').value || '').trim().toUpperCase();
  const cedula = normalizarNumero(document.getElementById('pcCedula').value);
  const nombre = document.getElementById('pcNombre').value.trim();
  const telefono = normalizarNumero(document.getElementById('pcTelefono').value).slice(0, 10);
  const fechaNacimiento = document.getElementById('pcFechaNacimiento').value;
  const doctor = document.getElementById('pcDoctor').value.trim();
  const fechaCita = document.getElementById('pcFechaCita').value;
  const horaCita = document.getElementById('pcHoraCita').value;
  const centro = document.getElementById('pcCentro').value.trim();
  const seguro = document.getElementById('pcSeguro').value.trim();
  const estadoSeguro = document.getElementById('pcEstadoSeguro').value.trim() || (tipoAtencion === 'privado' ? 'PRIVADO' : 'INACTIVO');
  const motivo = document.getElementById('pcMotivo').value.trim();
  const afiliadoSeguro = tipoAtencion === 'seguro' && codigoSeguro ? lsRead('ars_afiliados').find(a => String(a.id || '').toUpperCase() === codigoSeguro) : null;

  if (!nombre || cedula.length !== 11 || telefono.length !== 10 || !fechaCita || !horaCita) {
    alert('Completa nombre, cédula, teléfono, fecha y hora de cita.');
    return;
  }

  if (tipoAtencion === 'seguro') {
    if (!/^AFI-\d{3,}$/i.test(codigoSeguro)) {
      alert('Debes indicar el código del seguro generado por el Agente, por ejemplo AFI-001.');
      return;
    }
    if (!seguro || /no encontrado/i.test(seguro) || String(estadoSeguro).toLowerCase() !== 'activo') {
      alert('Valida primero un afiliado activo con seguro antes de guardar.');
      return;
    }
  }

  const citas = lsRead('ars_citas_clinica');
  citas.unshift({
    id: 'CIT-' + Date.now(),
    clinicaId: user.referenciaId,
    clinicaNombre: user.nombre || user.username,
    pacienteNombre: nombre,
    afiliadoId: afiliadoSeguro?.id || '',
    afiliadoNombre: afiliadoSeguro?.nombre || nombre,
    cedula,
    telefono,
    fechaNacimiento,
    doctor,
    fechaCita,
    horaCita,
    centro,
    tipoAtencion,
    codigoSeguro: tipoAtencion === 'seguro' ? codigoSeguro : '',
    seguro: tipoAtencion === 'seguro' ? seguro : 'PRIVADO',
    estadoSeguro: tipoAtencion === 'seguro' ? estadoSeguro.toLowerCase() : 'privado',
    motivo,
    fechaCreacion: new Date().toISOString()
  });
  lsWrite('ars_citas_clinica', citas);
  auditar('Agendar paciente clínica', `Se agendó a ${nombre} (${tipoAtencion === 'seguro' ? codigoSeguro : 'privado'}) para ${fechaCita} ${horaCita}`);
  alert('Paciente agendado correctamente.');

  document.getElementById('formCrearPacienteClinica').reset();
  document.getElementById('pcFechaCita').value = new Date().toISOString().slice(0, 10);
  document.getElementById('pcCentro').value = user.nombre || user.username || 'Clínica / Hospital';
  document.getElementById('pcTipoAtencion').value = 'seguro';
  resetPanelSeguro();
  toggleTipoAtencion();
  state.page = 1;
  renderTabla();
}
function getFilteredItems() {
  const user = ARSAuth.getCurrentUser();
  const term = (document.getElementById('buscarPacienteAgendado')?.value || '').toLowerCase().trim();
  return lsRead('ars_citas_clinica')
    .filter(c => String(c.clinicaId) === String(user.referenciaId))
    .filter(c => !term || [c.pacienteNombre, c.cedula, c.seguro, c.doctor, c.fechaCita, c.codigoSeguro].join(' ').toLowerCase().includes(term))
    .sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0));
}
function abrirProcesos(citaId) {
  const citas = lsRead('ars_citas_clinica');
  const cita = citas.find(c => String(c.id) === String(citaId));
  if (cita) localStorage.setItem('ars_cita_para_proceso', JSON.stringify(cita));
  window.location.href = `servicios-clinica.html?citaId=${encodeURIComponent(citaId)}`;
}
function renderTabla() {
  const tbody = document.getElementById('tablaPacientesAgendados');
  const items = getFilteredItems();
  const totalPages = Math.max(1, Math.ceil(items.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * state.pageSize;
  const visibles = items.slice(start, start + state.pageSize);

  const info = document.getElementById('infoPacientesAgendados');
  const pageInfo = document.getElementById('pageInfoPacientesAgendados');
  const prev = document.getElementById('btnPrevPacientesAgendados');
  const next = document.getElementById('btnNextPacientesAgendados');

  if (info) info.textContent = `Mostrando ${visibles.length ? start + 1 : 0}-${start + visibles.length} de ${items.length} registros`;
  if (pageInfo) pageInfo.textContent = `Página ${state.page} de ${totalPages}`;
  if (prev) prev.disabled = state.page <= 1;
  if (next) next.disabled = state.page >= totalPages;

  tbody.innerHTML = visibles.length ? visibles.map(c => `
    <tr>
      <td>${escapeHtml(c.pacienteNombre)}</td>
      <td>${escapeHtml(c.cedula)}</td>
      <td>${escapeHtml(c.codigoSeguro || c.seguro || '-')}</td>
      <td>${badgeEstado(c.estadoSeguro)}</td>
      <td>${escapeHtml(c.fechaCita || '-')}</td>
      <td>${escapeHtml(c.horaCita || '-')}</td>
      <td>${escapeHtml(c.doctor || '-')}</td>
      <td><button type="button" class="btn btn-sm btn-outline-primary btn-autorizar" data-id="${escapeHtml(c.id)}">Autorizar</button></td>
    </tr>`).join('') : '<tr><td colspan="8" class="text-center text-muted">No hay pacientes agendados.</td></tr>';

  tbody.querySelectorAll('.btn-autorizar').forEach(btn => btn.addEventListener('click', () => abrirProcesos(btn.dataset.id)));
}
