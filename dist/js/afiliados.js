
document.addEventListener('DOMContentLoaded', () => {
  const user = ARSAuth.getCurrentUser?.();
  if (!user) {
    window.location.href = 'examples/seleccion-rol.html';
    return;
  }

  if (document.getElementById('userName')) {
    document.getElementById('userName').textContent = user.nombre || 'Agente ARS';
  }

  window.AFILIADOS_PAGE_SIZE = 7;
  window.afiliadosPaginaActual = 1;

  document.getElementById('afFechaEstado').value = new Date().toISOString().slice(0, 10);

  aplicarFiltroNumerico('afCedula', 11);
  aplicarFiltroNumerico('afTelefono', 10);

  cargarPolizasEnSelect();
  bindAfiliadosEvents();
  renderTablaAfiliados();
});

function aplicarFiltroNumerico(id, maxLen) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener('input', function () {
    this.value = (this.value || '').replace(/\D/g, '').slice(0, maxLen);
  });
}

function bindAfiliadosEvents() {
  document.getElementById('formAfiliado')?.addEventListener('submit', guardarAfiliado);
  document.getElementById('btnCancelarEdicion')?.addEventListener('click', cancelarEdicionAfiliado);

  document.getElementById('buscarAfiliado')?.addEventListener('input', () => {
    window.afiliadosPaginaActual = 1;
    renderTablaAfiliados();
  });

  document.getElementById('btnPrevAfiliados')?.addEventListener('click', () => {
    if (window.afiliadosPaginaActual > 1) {
      window.afiliadosPaginaActual--;
      renderTablaAfiliados();
    }
  });

  document.getElementById('btnNextAfiliados')?.addEventListener('click', () => {
    const totalPaginas = obtenerTotalPaginasAfiliados();
    if (window.afiliadosPaginaActual < totalPaginas) {
      window.afiliadosPaginaActual++;
      renderTablaAfiliados();
    }
  });
}

function getAfiliadosBase() {
  const afiliados = JSON.parse(localStorage.getItem('ars_afiliados') || '[]');
  return [...afiliados].sort((a, b) => {
    const fa = new Date(a.fechaRegistro || a.fechaCreacion || 0).getTime();
    const fb = new Date(b.fechaRegistro || b.fechaCreacion || 0).getTime();
    return fb - fa;
  });
}

function getAfiliadosFiltrados() {
  const term = (document.getElementById('buscarAfiliado')?.value || '').toLowerCase().trim();
  let items = getAfiliadosBase();

  if (term) {
    items = items.filter(a =>
      [
        a.id, a.nombre, a.afiliado, a.cedula, a.telefono, a.fechaNacimiento,
        a.polizaId, a.poliza, a.estado, a.fechaEstado
      ].join(' ').toLowerCase().includes(term)
    );
  }

  return items;
}

function obtenerTotalPaginasAfiliados() {
  const total = getAfiliadosFiltrados().length;
  return Math.max(1, Math.ceil(total / window.AFILIADOS_PAGE_SIZE));
}

function formatearFecha(fecha) {
  if (!fecha) return '-';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-DO');
}

function formatearFechaHora(fecha) {
  if (!fecha) return '-';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleString('es-DO');
}

function formatearCedula(value) {
  const s = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (s.length !== 11) return value || '-';
  return `${s.slice(0,3)}-${s.slice(3,10)}-${s.slice(10)}`;
}

function formatearTelefono(value) {
  const s = String(value || '').replace(/\D/g, '').slice(0, 10);
  if (s.length !== 10) return value || '-';
  return `${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6)}`;
}

function badgeEstadoAfiliado(estado) {
  const normalizado = String(estado || '').toLowerCase();
  const map = { activo: 'success', inactivo: 'secondary' };
  return `<span class="badge text-bg-${map[normalizado] || 'light'} text-uppercase">${escapeHtml(normalizado || '-')}</span>`;
}

function cargarPolizasEnSelect() {
  const select = document.getElementById('afPolizaId');
  if (!select) return;

  const polizas = JSON.parse(localStorage.getItem('ars_polizas') || '[]');
  select.innerHTML = polizas.length
    ? '<option value="">Seleccione una póliza</option>' + polizas.map(p =>
        `<option value="${escapeHtml(p.id)}">${escapeHtml(p.id)} - ${escapeHtml(p.nombrePlan || p.nombre || 'Póliza')}</option>`
      ).join('')
    : '<option value="">No hay pólizas registradas</option>';
}


function generarIdAfiliadoSecuencial() {
  const afiliados = JSON.parse(localStorage.getItem('ars_afiliados') || '[]');
  let max = 0;
  afiliados.forEach(a => {
    const m = String(a.id || '').match(/^AFI-(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  });
  return 'AFI-' + String(max + 1).padStart(3, '0');
}

function construirPayloadAfiliado() {
  const nombre = document.getElementById('afNombre').value.trim();
  const cedula = document.getElementById('afCedula').value.trim();
  const telefono = document.getElementById('afTelefono').value.trim();
  const fechaNacimiento = document.getElementById('afFechaNacimiento').value.trim();
  const polizaId = document.getElementById('afPolizaId').value.trim();
  const estado = document.getElementById('afEstado').value.trim();
  const fechaEstado = document.getElementById('afFechaEstado').value.trim();
  const password = document.getElementById('afPassword').value.trim();

  return {
    nombre,
    afiliado: nombre,
    cedula,
    telefono,
    fechaNacimiento,
    polizaId,
    poliza: polizaId,
    estado,
    fechaEstado,
    password
  };
}

function validarPayloadAfiliado(payload, idEdit = '') {
  if (!payload.nombre || !payload.cedula || !payload.telefono || !payload.fechaNacimiento || !payload.polizaId || !payload.estado || !payload.fechaEstado || !payload.password) {
    throw new Error('Todos los campos del afiliado son obligatorios.');
  }

  if (payload.nombre.length > 30) {
    throw new Error('El nombre no puede tener más de 30 caracteres.');
  }

  if (!/^\d{11}$/.test(payload.cedula)) {
    throw new Error('La cédula debe tener exactamente 11 dígitos.');
  }

  if (!/^\d{10}$/.test(payload.telefono)) {
    throw new Error('El teléfono debe tener exactamente 10 dígitos.');
  }

  if (payload.password.length > 15) {
    throw new Error('La contraseña no puede tener más de 15 caracteres.');
  }

  const hoy = new Date();
  const nacimiento = new Date(payload.fechaNacimiento + 'T00:00:00');
  if (Number.isNaN(nacimiento.getTime()) || nacimiento > hoy) {
    throw new Error('La fecha de nacimiento no es válida.');
  }
}

function guardarAfiliado(e) {
  e.preventDefault();
  const idEdit = document.getElementById('afiliadoEditId').value.trim();
  const payload = construirPayloadAfiliado();

  try {
    validarPayloadAfiliado(payload, idEdit);

    if (idEdit) {
      actualizarAfiliadoDirecto(idEdit, payload);
      alert('Afiliado actualizado correctamente.');
    } else {
      crearAfiliadoDirecto(payload);
      alert('Afiliado registrado correctamente.');
    }

    cancelarEdicionAfiliado();
    renderTablaAfiliados();
  } catch (err) {
    alert(err.message || 'Ocurrió un error al guardar el afiliado.');
  }
}

function crearAfiliadoDirecto(payload) {
  const afiliados = JSON.parse(localStorage.getItem('ars_afiliados') || '[]');
  const usuarios = JSON.parse(localStorage.getItem('ars_users') || '[]');

  if (afiliados.some(a => String(a.cedula) === String(payload.cedula))) {
    throw new Error('Ya existe un afiliado con esa cédula.');
  }

  if (usuarios.some(u => u.rol === 'afiliado' && String(u.username) === String(payload.cedula))) {
    throw new Error('Ya existe un usuario afiliado con esa cédula.');
  }

  const nuevoId = generarIdAfiliadoSecuencial();
  const ahora = new Date().toISOString();

  const nuevo = {
    id: nuevoId,
    nombre: payload.nombre,
    afiliado: payload.afiliado,
    cedula: payload.cedula,
    telefono: payload.telefono,
    fechaNacimiento: payload.fechaNacimiento,
    polizaId: payload.polizaId,
    poliza: payload.poliza,
    estado: payload.estado,
    fechaEstado: payload.fechaEstado,
    password: payload.password,
    fechaRegistro: ahora,
    fechaCreacion: ahora
  };

  afiliados.unshift(nuevo);
  localStorage.setItem('ars_afiliados', JSON.stringify(afiliados));

  usuarios.push({
    id: 'USR-' + Date.now(),
    nombre: payload.nombre,
    afiliado: payload.afiliado,
    username: nuevoId,
    cedula: payload.cedula,
    telefono: payload.telefono,
    fechaNacimiento: payload.fechaNacimiento,
    password: payload.password,
    rol: 'afiliado',
    referenciaId: nuevoId
  });
  localStorage.setItem('ars_users', JSON.stringify(usuarios));

  registrarAuditoria('Crear afiliado', `Se registró el afiliado ${payload.nombre} (${payload.cedula})`);
}

function actualizarAfiliadoDirecto(idEdit, payload) {
  const afiliados = JSON.parse(localStorage.getItem('ars_afiliados') || '[]');
  const index = afiliados.findIndex(a => String(a.id) === String(idEdit));
  if (index === -1) throw new Error('No se encontró el afiliado a editar.');

  const existente = afiliados[index];

  const duplicadoCedula = afiliados.some(a => String(a.cedula) === String(payload.cedula) && String(a.id) !== String(idEdit));
  if (duplicadoCedula) {
    throw new Error('Ya existe otro afiliado con esa cédula.');
  }

  afiliados[index] = {
    ...existente,
    nombre: payload.nombre,
    afiliado: payload.afiliado,
    cedula: payload.cedula,
    telefono: payload.telefono,
    fechaNacimiento: payload.fechaNacimiento,
    polizaId: payload.polizaId,
    poliza: payload.poliza,
    estado: payload.estado,
    fechaEstado: payload.fechaEstado,
    password: payload.password
  };
  localStorage.setItem('ars_afiliados', JSON.stringify(afiliados));

  const usuarios = JSON.parse(localStorage.getItem('ars_users') || '[]');
  const userIndex = usuarios.findIndex(u =>
    u.rol === 'afiliado' && (String(u.referenciaId) === String(idEdit) || String(u.cedula) === String(existente.cedula))
  );
  if (userIndex >= 0) {
    usuarios[userIndex] = {
      ...usuarios[userIndex],
      nombre: payload.nombre,
      afiliado: payload.afiliado,
      cedula: payload.cedula,
      username: idEdit,
      telefono: payload.telefono,
      fechaNacimiento: payload.fechaNacimiento,
      password: payload.password,
      referenciaId: idEdit
    };
    localStorage.setItem('ars_users', JSON.stringify(usuarios));
  }

  registrarAuditoria('Editar afiliado', `Se actualizó el afiliado ${payload.nombre} (${payload.cedula})`);
}

function registrarAuditoria(accion, detalle) {
  const current = ARSAuth.getCurrentUser?.();
  const auditoria = JSON.parse(localStorage.getItem('ars_auditoria') || '[]');
  auditoria.unshift({
    id: 'AUD-' + Date.now(),
    usuario: current?.nombre || 'Agente ARS',
    accion,
    detalle,
    fecha: new Date().toLocaleString('es-DO')
  });
  localStorage.setItem('ars_auditoria', JSON.stringify(auditoria));
}

function renderTablaAfiliados() {
  const tbody = document.getElementById('tablaAfiliados');
  if (!tbody) return;

  const items = getAfiliadosFiltrados();
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / window.AFILIADOS_PAGE_SIZE));

  if (window.afiliadosPaginaActual > totalPaginas) {
    window.afiliadosPaginaActual = totalPaginas;
  }

  const start = (window.afiliadosPaginaActual - 1) * window.AFILIADOS_PAGE_SIZE;
  const end = start + window.AFILIADOS_PAGE_SIZE;
  const pageItems = items.slice(start, end);

  if (!pageItems.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay afiliados registrados</td></tr>';
  } else {
    const polizas = JSON.parse(localStorage.getItem('ars_polizas') || '[]');
    tbody.innerHTML = pageItems.map(a => {
      const poliza = polizas.find(p => String(p.id) === String(a.polizaId || a.poliza));
      const nombrePoliza = poliza ? (poliza.nombrePlan || poliza.nombre || poliza.id) : (a.polizaId || a.poliza || '-');

      return `
        <tr>
          <td>${escapeHtml(a.id)}</td>
          <td>${escapeHtml(a.nombre || a.afiliado || '')}</td>
          <td>${escapeHtml(formatearCedula(a.cedula))}</td>
          <td>${escapeHtml(formatearTelefono(a.telefono))}</td>
          <td>${escapeHtml(formatearFecha(a.fechaNacimiento))}</td>
          <td>${escapeHtml(nombrePoliza)}</td>
          <td>
            <div class="estado-fecha-wrap">
              ${badgeEstadoAfiliado(a.estado)}
              <span class="small text-muted">Fecha: ${escapeHtml(formatearFecha(a.fechaEstado))}</span>
            </div>
          </td>
          <td>${escapeHtml(formatearFechaHora(a.fechaRegistro || a.fechaCreacion))}</td>
          <td>
            <button type="button" class="btn btn-sm btn-primary" onclick="editarAfiliado('${escapeHtml(a.id)}')">Editar</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  const info = document.getElementById('infoPaginacionAfiliados');
  if (info) {
    const from = total ? start + 1 : 0;
    const to = total ? Math.min(end, total) : 0;
    info.textContent = `Mostrando ${from}-${to} de ${total} afiliados`;
  }

  const prev = document.getElementById('btnPrevAfiliados');
  const next = document.getElementById('btnNextAfiliados');
  if (prev) prev.disabled = window.afiliadosPaginaActual <= 1;
  if (next) next.disabled = window.afiliadosPaginaActual >= totalPaginas;
}

function editarAfiliado(id) {
  const afiliado = getAfiliadosBase().find(a => String(a.id) === String(id));
  if (!afiliado) {
    alert('No se encontró el afiliado seleccionado.');
    return;
  }

  document.getElementById('afiliadoEditId').value = afiliado.id || '';
  document.getElementById('afNombre').value = afiliado.nombre || afiliado.afiliado || '';
  document.getElementById('afCedula').value = (afiliado.cedula || '').replace(/\D/g, '').slice(0, 11);
  document.getElementById('afTelefono').value = (afiliado.telefono || '').replace(/\D/g, '').slice(0, 10);
  document.getElementById('afFechaNacimiento').value = afiliado.fechaNacimiento ? String(afiliado.fechaNacimiento).slice(0, 10) : '';
  document.getElementById('afPolizaId').value = afiliado.polizaId || afiliado.poliza || '';
  document.getElementById('afEstado').value = (afiliado.estado || 'activo').toLowerCase();
  document.getElementById('afFechaEstado').value = afiliado.fechaEstado ? String(afiliado.fechaEstado).slice(0, 10) : new Date().toISOString().slice(0, 10);
  document.getElementById('afPassword').value = afiliado.password || '';

  document.getElementById('tituloFormularioAfiliado').textContent = 'Editar afiliado';
  document.getElementById('btnGuardarAfiliado').textContent = 'Guardar cambios';
  document.getElementById('btnCancelarEdicion').classList.remove('d-none');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.editarAfiliado = editarAfiliado;

function cancelarEdicionAfiliado() {
  document.getElementById('formAfiliado')?.reset();
  document.getElementById('afiliadoEditId').value = '';
  document.getElementById('tituloFormularioAfiliado').textContent = 'Crear afiliado';
  document.getElementById('btnGuardarAfiliado').textContent = 'Guardar afiliado';
  document.getElementById('btnCancelarEdicion').classList.add('d-none');
  cargarPolizasEnSelect();
  document.getElementById('afEstado').value = 'activo';
  document.getElementById('afFechaEstado').value = new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}
