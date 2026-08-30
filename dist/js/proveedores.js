document.addEventListener("DOMContentLoaded", async () => {
  const user = await ARSAuth.requireRoleOrRedirect('agente');
  if (!user) return;

  const $ = (id) => document.getElementById(id);
  const form = $("formClinica");
  const tbody = $("tablaClinicas");
  const inputBuscar = $("buscarClinica");
  const selectLimite = $("limiteClinicas");
  const info = $("infoPaginacionClinicas");
  const btnPrev = $("btnPrevClinicas");
  const btnNext = $("btnNextClinicas");
  const btnCancelar = $("btnCancelarEdicion");
  const btnGuardar = $("btnGuardar");
  const editId = $("editId");
  const state = { page: 1, pageSize: 5 };

  if ($("userName")) $("userName").textContent = user.nombre || user.username || 'Agente ARS';

  [$("rnc"), $("telefono")].forEach(inp => inp?.addEventListener('input', function () {
    this.value = String(this.value || '').replace(/\D/g, '');
  }));

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }

  function getClinicas() {
    return [...(ARSAuth.getClinicas?.() || [])].sort((a, b) => new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0));
  }

  function registrarAuditoria(accion, detalle) {
    ARSAuth.logAction?.(accion, detalle);
  }

  function validar(payload, currentId = '') {
    if (!payload.nombre || payload.nombre.length > 30) throw new Error('El nombre es obligatorio y no puede pasar de 30 caracteres.');
    if (!/^\d{9,11}$/.test(payload.rnc)) throw new Error('El RNC debe tener entre 9 y 11 dígitos.');
    if (!/^\d{10}$/.test(payload.telefono)) throw new Error('El teléfono debe tener exactamente 10 dígitos.');
    if (!payload.direccion || payload.direccion.length > 30) throw new Error('La dirección es obligatoria y no puede pasar de 30 caracteres.');
    if (!payload.usuario || payload.usuario.length > 15) throw new Error('El usuario es obligatorio y no puede pasar de 15 caracteres.');
    if (!payload.password || payload.password.length > 15) throw new Error('La contraseña es obligatoria y no puede pasar de 15 caracteres.');
    const usuarioNormalizado = payload.usuario.toLowerCase();
    const clinicas = ARSAuth.getClinicas?.() || [];
    const duplicada = clinicas.find(c => String(c.usuario || '').toLowerCase() === usuarioNormalizado && String(c.id) !== String(currentId));
    if (duplicada) throw new Error('Ese usuario ya existe. Debes usar otro.');
    const duplicadoRnc = clinicas.find(c => String(c.rnc || '') === String(payload.rnc) && String(c.id) !== String(currentId));
    if (duplicadoRnc) throw new Error('Ese RNC ya existe.');
  }

  function getFiltradas() {
    const term = String(inputBuscar?.value || '').toLowerCase().trim();
    let items = getClinicas();
    if (term) {
      items = items.filter(c => [c.id, c.nombre, c.rnc, c.telefono, c.direccion, c.usuario, c.estado, c.fechaRegistro].join(' ').toLowerCase().includes(term));
    }
    return items;
  }

  function render() {
    const items = getFiltradas();
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageItems = items.slice(start, start + state.pageSize);

    tbody.innerHTML = pageItems.length ? pageItems.map(c => `
      <tr>
        <td>${escapeHtml(c.id)}</td>
        <td>${escapeHtml(c.nombre)}</td>
        <td>${escapeHtml(c.rnc)}</td>
        <td>${escapeHtml(c.telefono)}</td>
        <td>${escapeHtml(c.direccion)}</td>
        <td>${escapeHtml(c.usuario)}</td>
        <td>${escapeHtml(new Date(c.fechaRegistro || '').toLocaleString('es-DO'))}</td>
        <td><span class="badge text-bg-success text-uppercase">${escapeHtml(c.estado || 'activa')}</span></td>
        <td><button type="button" class="btn btn-sm btn-warning btn-editar" data-id="${escapeHtml(c.id)}">Editar</button></td>
      </tr>
    `).join('') : '<tr><td colspan="9" class="text-center text-muted">No hay clínicas registradas.</td></tr>';

    tbody.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => cargarEdicion(btn.dataset.id)));
    const from = total ? start + 1 : 0;
    const to = total ? start + pageItems.length : 0;
    if (info) info.textContent = `Mostrando ${from}-${to} de ${total} clínicas`;
    if (btnPrev) btnPrev.disabled = state.page <= 1;
    if (btnNext) btnNext.disabled = state.page >= totalPages;
  }

  function resetForm() {
    form.reset();
    editId.value = '';
    btnGuardar.textContent = 'Registrar clínica';
    btnCancelar.classList.add('d-none');
  }

  function cargarEdicion(id) {
    const clinica = (ARSAuth.getClinicas?.() || []).find(c => String(c.id) === String(id));
    if (!clinica) return;
    editId.value = clinica.id || '';
    $("nombre").value = clinica.nombre || '';
    $("rnc").value = clinica.rnc || '';
    $("telefono").value = String(clinica.telefono || '').replace(/\D/g, '').slice(0, 10);
    $("direccion").value = clinica.direccion || '';
    $("usuario").value = clinica.usuario || '';
    $("password").value = clinica.password || '';
    btnGuardar.textContent = 'Guardar cambios';
    btnCancelar.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      nombre: $("nombre").value.trim(),
      rnc: $("rnc").value.trim(),
      telefono: $("telefono").value.trim(),
      direccion: $("direccion").value.trim(),
      usuario: $("usuario").value.trim(),
      password: $("password").value.trim()
    };

    try {
      validar(payload, editId.value.trim());
      if (editId.value.trim()) {
        const clinicas = ARSAuth.getClinicas?.() || [];
        const idx = clinicas.findIndex(c => String(c.id) === String(editId.value.trim()));
        if (idx < 0) throw new Error('No se encontró la clínica a editar.');
        const actualizada = { ...clinicas[idx], ...payload, estado: 'activa' };
        clinicas[idx] = actualizada;
        localStorage.setItem('ars_clinicas', JSON.stringify(clinicas));
        const users = ARSAuth.getUsers?.() || [];
        const userIdx = users.findIndex(u => u.rol === 'clinica' && String(u.referenciaId) === String(actualizada.id));
        if (userIdx >= 0) {
          users[userIdx] = { ...users[userIdx], username: actualizada.usuario, password: actualizada.password, nombre: actualizada.nombre, activo: true };
        } else {
          users.push({ id: 'USR-' + Date.now(), username: actualizada.usuario, password: actualizada.password, rol: 'clinica', nombre: actualizada.nombre, referenciaId: actualizada.id, activo: true });
        }
        localStorage.setItem('ars_users', JSON.stringify(users));
        registrarAuditoria('Editar clínica', `Se actualizó la clínica ${actualizada.nombre}`);
        alert('Clínica actualizada correctamente.');
      } else {
        ARSAuth.createClinica(payload);
        alert('Clínica registrada correctamente.');
      }
      resetForm();
      render();
    } catch (err) {
      alert(err.message || 'Ocurrió un error al guardar la clínica.');
    }
  });

  btnCancelar?.addEventListener('click', resetForm);
  inputBuscar?.addEventListener('input', () => { state.page = 1; render(); });
  selectLimite?.addEventListener('change', () => { state.pageSize = Number(selectLimite.value || 5); state.page = 1; render(); });
  btnPrev?.addEventListener('click', () => { if (state.page > 1) { state.page--; render(); } });
  btnNext?.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(getFiltradas().length / state.pageSize));
    if (state.page < totalPages) { state.page++; render(); }
  });

  if (selectLimite) selectLimite.value = '5';
  render();
});
