document.addEventListener('DOMContentLoaded', async () => {
  const user = await ARSAuth.requireRoleOrRedirect('agente');
  if (!user) return;
  const userName = document.getElementById('userName');
  if (userName) userName.textContent = user.nombre || 'Agente ARS';

  window.POLIZAS_PAGE_SIZE = 5;
  window.polizasPaginaActual = 1;

  bindPolizasEvents();
  resetCoberturasBase();
  renderPolizas();
});

const PLANES_PREDEFINIDOS = {
  basico: {
    nombre: 'Plan Básico',
    maximoAnual: 150000,
    coberturas: [
      { servicio: 'Emergencia', porcentaje: 100, tope: 0 },
      { servicio: 'Internamiento', porcentaje: 100, tope: 0 },
      { servicio: 'Consulta general', porcentaje: 70, tope: 0 },
      { servicio: 'Laboratorio', porcentaje: 65, tope: 0 }
    ]
  },
  basico_familiar: {
    nombre: 'Plan Básico Familiar',
    maximoAnual: 300000,
    coberturas: [
      { servicio: 'Emergencia', porcentaje: 100, tope: 0 },
      { servicio: 'Internamiento', porcentaje: 100, tope: 0 },
      { servicio: 'Consulta general', porcentaje: 80, tope: 0 },
      { servicio: 'Laboratorio', porcentaje: 75, tope: 0 },
      { servicio: 'Sonografía', porcentaje: 70, tope: 0 },
      { servicio: 'Rayos X', porcentaje: 70, tope: 0 }
    ]
  },
  premium_integral: {
    nombre: 'Plan Premium Integral',
    maximoAnual: 600000,
    coberturas: [
      { servicio: 'Emergencia', porcentaje: 100, tope: 0 },
      { servicio: 'Internamiento', porcentaje: 100, tope: 0 },
      { servicio: 'Consulta general', porcentaje: 95, tope: 0 },
      { servicio: 'Laboratorio', porcentaje: 90, tope: 0 },
      { servicio: 'Sonografía', porcentaje: 90, tope: 0 },
      { servicio: 'Rayos X', porcentaje: 90, tope: 0 },
      { servicio: 'Tomografía', porcentaje: 85, tope: 0 },
      { servicio: 'Resonancia', porcentaje: 85, tope: 0 }
    ]
  }
};

function getPolizas() {
  return JSON.parse(localStorage.getItem('ars_polizas') || '[]');
}
function setPolizas(items) {
  localStorage.setItem('ars_polizas', JSON.stringify(items));
}
function money(v) {
  return `RD$ ${Number(v || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function audit(accion, detalle) {
  const actual = ARSAuth?.getCurrentUser?.();
  const arr = JSON.parse(localStorage.getItem('ars_auditoria') || '[]');
  arr.unshift({
    id: 'AUD-' + Date.now(),
    usuario: actual?.nombre || 'Agente ARS',
    accion,
    detalle,
    fecha: new Date().toLocaleString('es-DO')
  });
  localStorage.setItem('ars_auditoria', JSON.stringify(arr));
}

function bindPolizasEvents() {
  document.getElementById('btnAgregarCobertura')?.addEventListener('click', () => agregarFilaCobertura());
  document.getElementById('formPoliza')?.addEventListener('submit', guardarPoliza);
  document.getElementById('btnCancelarPoliza')?.addEventListener('click', cancelarEdicionPoliza);
  document.getElementById('buscarPoliza')?.addEventListener('input', () => {
    window.polizasPaginaActual = 1;
    renderPolizas();
  });
  document.getElementById('tipoPlan')?.addEventListener('change', aplicarPlanPredefinido);
  document.getElementById('btnPrevPolizas')?.addEventListener('click', () => {
    if (window.polizasPaginaActual > 1) {
      window.polizasPaginaActual--;
      renderPolizas();
    }
  });
  document.getElementById('btnNextPolizas')?.addEventListener('click', () => {
    const total = totalPaginasPolizas();
    if (window.polizasPaginaActual < total) {
      window.polizasPaginaActual++;
      renderPolizas();
    }
  });
}

function resetCoberturasBase() {
  const tbody = document.getElementById('tablaCoberturasPoliza');
  if (!tbody) return;
  tbody.innerHTML = '';
}

function aplicarPlanPredefinido() {
  const tipo = document.getElementById('tipoPlan').value;
  const plan = PLANES_PREDEFINIDOS[tipo];
  if (!plan) {
    resetCoberturasBase();
    return;
  }
  document.getElementById('polizaNombre').value = plan.nombre;
  document.getElementById('polizaMaximo').value = plan.maximoAnual;
  const tbody = document.getElementById('tablaCoberturasPoliza');
  tbody.innerHTML = '';
  plan.coberturas.forEach(c => agregarFilaCobertura(c.servicio, c.porcentaje, c.tope || ''));
}

function agregarFilaCobertura(servicio = '', porcentaje = '', tope = '') {
  const tbody = document.getElementById('tablaCoberturasPoliza');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.className = 'service-row';
  tr.innerHTML = `
    <td><input type="text" class="form-control servicio-input" value="${escapeHtml(servicio)}" required></td>
    <td><input type="number" min="0" max="100" step="1" class="form-control porcentaje-input" value="${escapeHtml(porcentaje)}" required></td>
    <td><input type="number" min="0" step="0.01" class="form-control tope-input" value="${escapeHtml(tope)}"></td>
    <td class="text-center"><button type="button" class="btn btn-outline-danger btn-sm" onclick="this.closest('tr').remove()">Quitar</button></td>
  `;
  tbody.appendChild(tr);
}

function leerCoberturasFormulario() {
  const rows = [...document.querySelectorAll('#tablaCoberturasPoliza tr')];
  const coberturas = rows.map(row => ({
    servicio: row.querySelector('.servicio-input')?.value.trim(),
    porcentaje: Number(row.querySelector('.porcentaje-input')?.value || 0),
    tope: Number(row.querySelector('.tope-input')?.value || 0)
  })).filter(c => c.servicio);
  if (!coberturas.length) throw new Error('Debes agregar al menos una cobertura.');
  return coberturas;
}

function guardarPoliza(e) {
  e.preventDefault();
  const idEdit = document.getElementById('polizaEditId').value.trim();
  const tipoPlan = document.getElementById('tipoPlan').value.trim();
  const nombrePlan = document.getElementById('polizaNombre').value.trim();
  const maximoAnual = Number(document.getElementById('polizaMaximo').value || 0);
  const consumidoAnual = Number(document.getElementById('polizaConsumido').value || 0);
  const coberturas = leerCoberturasFormulario();

  if (!tipoPlan || !nombrePlan || maximoAnual <= 0) {
    alert('Tipo de plan, nombre y máximo anual son obligatorios.');
    return;
  }

  const items = getPolizas();
  if (idEdit) {
    const idx = items.findIndex(p => String(p.id) === String(idEdit));
    if (idx === -1) return alert('No se encontró la póliza a editar.');
    items[idx] = { ...items[idx], tipoPlan, nombrePlan, maximoAnual, montoMaximo: maximoAnual, consumidoAnual, coberturas, cobertura: coberturas.map(c => c.servicio) };
    audit('Editar póliza', `Se actualizó la póliza ${nombrePlan}`);
    alert('Póliza actualizada correctamente.');
  } else {
    items.unshift({
      id: 'POL-' + Date.now(),
      tipoPlan,
      nombrePlan,
      maximoAnual,
      montoMaximo: maximoAnual,
      consumidoAnual,
      coberturas,
      cobertura: coberturas.map(c => c.servicio),
      fechaCreacion: new Date().toISOString()
    });
    audit('Crear póliza', `Se creó la póliza ${nombrePlan}`);
    alert('Póliza creada correctamente.');
  }

  setPolizas(items);
  cancelarEdicionPoliza();
  renderPolizas();
}

function getPolizasFiltradas() {
  const term = (document.getElementById('buscarPoliza')?.value || '').toLowerCase().trim();
  let items = [...getPolizas()].sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0));
  if (term) items = items.filter(p => [p.id, p.nombrePlan, p.tipoPlan].join(' ').toLowerCase().includes(term));
  return items;
}

function totalPaginasPolizas() {
  return Math.max(1, Math.ceil(getPolizasFiltradas().length / window.POLIZAS_PAGE_SIZE));
}

function renderPolizas() {
  const tbody = document.getElementById('tablaPolizas');
  if (!tbody) return;
  const items = getPolizasFiltradas();
  const total = items.length;
  const totalPaginas = totalPaginasPolizas();

  if (window.polizasPaginaActual > totalPaginas) window.polizasPaginaActual = totalPaginas;

  const start = (window.polizasPaginaActual - 1) * window.POLIZAS_PAGE_SIZE;
  const end = start + window.POLIZAS_PAGE_SIZE;
  const pageItems = items.slice(start, end);

  tbody.innerHTML = pageItems.length ? pageItems.map(p => {
    const disponible = Math.max(Number(p.maximoAnual || 0) - Number(p.consumidoAnual || 0), 0);
    const listaCob = (p.coberturas || ((p.cobertura || []).map(servicio => ({ servicio, porcentaje: 100 }))));
    const resumen = listaCob.map(c => `${c.servicio}: ${c.porcentaje}%`).join(', ');
    return `
      <tr>
        <td>${escapeHtml(p.id)}</td>
        <td>${escapeHtml(p.nombrePlan)}</td>
        <td>${escapeHtml((p.tipoPlan || '').replaceAll('_', ' '))}</td>
        <td>${money(p.maximoAnual)}</td>
        <td>${money(p.consumidoAnual)}</td>
        <td>${money(disponible)}</td>
        <td>${escapeHtml(resumen || '-')}</td>
        <td><button type="button" class="btn btn-sm btn-primary" onclick="editarPoliza('${escapeHtml(p.id)}')">Editar</button></td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="8" class="text-center text-muted">No hay pólizas registradas.</td></tr>';

  const info = document.getElementById('infoPaginacionPolizas');
  if (info) {
    const from = total ? start + 1 : 0;
    const to = total ? Math.min(end, total) : 0;
    info.textContent = `Mostrando ${from}-${to} de ${total} pólizas`;
  }

  const prev = document.getElementById('btnPrevPolizas');
  const next = document.getElementById('btnNextPolizas');
  if (prev) prev.disabled = window.polizasPaginaActual <= 1;
  if (next) next.disabled = window.polizasPaginaActual >= totalPaginas;
}
window.editarPoliza = function(id) {
  const item = getPolizas().find(p => String(p.id) === String(id));
  if (!item) return;
  document.getElementById('polizaEditId').value = item.id;
  document.getElementById('tipoPlan').value = item.tipoPlan || '';
  document.getElementById('polizaNombre').value = item.nombrePlan || '';
  document.getElementById('polizaMaximo').value = item.maximoAnual || 0;
  document.getElementById('polizaConsumido').value = item.consumidoAnual || 0;
  document.getElementById('tituloPoliza').textContent = 'Editar póliza';
  document.getElementById('btnGuardarPoliza').textContent = 'Guardar cambios';
  document.getElementById('btnCancelarPoliza').classList.remove('d-none');

  const tbody = document.getElementById('tablaCoberturasPoliza');
  tbody.innerHTML = '';
  ((item.coberturas || ((item.cobertura || []).map(servicio => ({ servicio, porcentaje: 100, tope: 0 }))))).forEach(c => agregarFilaCobertura(c.servicio, c.porcentaje, c.tope || ''));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicionPoliza() {
  document.getElementById('formPoliza')?.reset();
  document.getElementById('polizaEditId').value = '';
  document.getElementById('tituloPoliza').textContent = 'Crear póliza';
  document.getElementById('btnGuardarPoliza').textContent = 'Guardar póliza';
  document.getElementById('btnCancelarPoliza').classList.add('d-none');
  document.getElementById('polizaConsumido').value = 0;
  resetCoberturasBase();
}
