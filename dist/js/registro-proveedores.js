/* El agente registra proveedores y sus pagos (RF-12, lado del agente). */
document.addEventListener('DOMContentLoaded', async () => {
  const user = await ARSAuth.requireRoleOrRedirect('agente');
  if (!user) return;

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  $('userName').textContent = user.nombre || user.username || 'Agente ARS';

  function aviso(texto, tipo) {
    const a = $('aviso');
    a.className = 'alert alert-' + (tipo || 'success');
    a.textContent = texto;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => a.classList.add('d-none'), 5000);
  }

  ['pRnc', 'pTelefono'].forEach(id => $(id).addEventListener('input', function () { this.value = this.value.replace(/\D/g, ''); }));

  function render() {
    const provs = ARSAuth.getProveedores() || [];
    const pagos = ARSAuth.getPagosProveedores() || [];
    $('cuerpoProveedores').innerHTML = provs.length ? provs.map(p => `<tr><td>${esc(p.id)}</td><td>${esc(p.nombre)}</td><td>${esc(p.tipo || '—')}</td><td>${esc(p.rnc)}</td><td>${esc(p.telefono)}</td><td>${esc(p.usuario)}</td><td><span class="badge text-bg-success">${esc(p.estado)}</span></td></tr>`).join('')
      : '<tr><td colspan="7" class="empty-state">Aún no hay proveedores registrados.</td></tr>';
    const sel = $('gProveedor'), actual = sel.value;
    sel.innerHTML = '<option value="">Seleccione…</option>' + provs.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)} (${esc(p.id)})</option>`).join('');
    sel.value = actual;
    $('cuerpoPagos').innerHTML = pagos.length ? [...pagos].reverse().map(p => `<tr><td>${esc(p.id)}</td><td>${esc(p.proveedorNombre)}</td><td>${esc(p.periodo)}</td><td>${esc(p.concepto)}</td><td class="text-end">${esc(ARSAuth.formatMoney(p.monto))}</td>
      <td><span class="badge ${p.estado === 'pagado' ? 'text-bg-success' : 'text-bg-warning'}">${p.estado === 'pagado' ? 'Pagado' : 'Pendiente'}</span></td>
      <td>${p.estado === 'pendiente' ? `<button class="btn btn-sm btn-outline-success" data-pagar="${esc(p.id)}">Marcar como pagado</button>` : '—'}</td></tr>`).join('')
      : '<tr><td colspan="7" class="empty-state">Aún no hay pagos registrados.</td></tr>';
  }

  $('formProveedor').addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const d = { nombre: $('pNombre').value, rnc: $('pRnc').value, tipo: $('pTipo').value, telefono: $('pTelefono').value, direccion: $('pDireccion').value, usuario: $('pUsuario').value, password: $('pPassword').value };
      if (!/^\d{9,11}$/.test(d.rnc.trim())) throw new Error('El RNC debe tener entre 9 y 11 dígitos.');
      if (!/^\d{10}$/.test(d.telefono.trim())) throw new Error('El teléfono debe tener exactamente 10 dígitos.');
      const n = ARSAuth.createProveedor(d);
      e.target.reset();
      aviso(`Proveedor ${n.nombre} registrado con el ID ${n.id}.`);
      render();
    } catch (err) { aviso(err.message, 'danger'); }
  });

  $('formPago').addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const n = ARSAuth.createPagoProveedor({ proveedorId: $('gProveedor').value, periodo: $('gPeriodo').value.trim(), concepto: $('gConcepto').value, monto: $('gMonto').value, observacion: $('gObs').value, estado: $('gEstado').value });
      e.target.reset();
      aviso(`Pago ${n.id} registrado para ${n.proveedorNombre}.`);
      render();
    } catch (err) { aviso(err.message, 'danger'); }
  });

  $('cuerpoPagos').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pagar]');
    if (!b) return;
    const pagos = ARSAuth.getPagosProveedores();
    const p = pagos.find(x => x.id === b.dataset.pagar);
    if (!p) return;
    p.estado = 'pagado';
    p.fechaPago = new Date().toISOString();
    localStorage.setItem(ARSAuth.STORAGE_KEYS.pagosProveedores, JSON.stringify(pagos));
    ARSAuth.logAction('Pago a proveedor', `${p.id} marcado como pagado`);
    aviso(`Pago ${p.id} marcado como pagado.`);
    render();
  });

  window.addEventListener('ars:storage-sync', render);
  render();
});
