/* Panel del proveedor (RF-12): consulta de pagos y servicios asociados. Solo lectura. */
document.addEventListener('DOMContentLoaded', async () => {
  const user = await ARSAuth.requireRoleOrRedirect('proveedor');
  if (!user) return;

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  $('userName').textContent = user.nombre || user.username || 'Proveedor';

  function misPagos() {
    return (ARSAuth.getPagosProveedores() || [])
      .filter(p => String(p.proveedorId) === String(user.referenciaId))
      .sort((a, b) => String(b.fechaEnvio || '').localeCompare(String(a.fechaEnvio || '')));
  }

  function llenarPeriodos(pagos) {
    const sel = $('filtroPeriodo');
    const actual = sel.value;
    const periodos = [...new Set(pagos.map(p => p.periodo).filter(Boolean))].sort().reverse();
    sel.innerHTML = '<option value="">Todos los períodos</option>' + periodos.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
    if (periodos.includes(actual)) sel.value = actual;
  }

  function render() {
    const todos = misPagos();
    llenarPeriodos(todos);
    const est = $('filtroEstado').value, per = $('filtroPeriodo').value;
    const lista = todos.filter(p => (!est || p.estado === est) && (!per || p.periodo === per));

    const pend = todos.filter(p => p.estado === 'pendiente');
    const pag = todos.filter(p => p.estado === 'pagado');
    const suma = (xs) => xs.reduce((a, p) => a + Number(p.monto || 0), 0);
    $('kpiPendientes').textContent = pend.length;
    $('kpiPagados').textContent = pag.length;
    $('kpiMontoPend').textContent = ARSAuth.formatMoney(suma(pend));
    $('kpiMontoPag').textContent = ARSAuth.formatMoney(suma(pag));

    $('cuerpoPagos').innerHTML = lista.length ? lista.map(p => `
      <tr><td>${esc(p.id)}</td><td>${esc(p.periodo)}</td><td>${esc(p.concepto)}</td>
      <td class="text-end">${esc(ARSAuth.formatMoney(p.monto))}</td>
      <td><span class="badge ${p.estado === 'pagado' ? 'text-bg-success' : 'text-bg-warning'}">${p.estado === 'pagado' ? 'Pagado' : 'Pendiente'}</span></td>
      <td>${esc(String(p.fechaEnvio || '').slice(0, 10))}</td><td>${esc(p.observacion || '—')}</td></tr>`).join('')
      : '<tr><td colspan="7" class="empty-state">Todavía no tienes pagos registrados por la ARS.</td></tr>';
    $('infoPagos').textContent = `${lista.length} de ${todos.length} registros`;
  }

  $('filtroEstado').addEventListener('change', render);
  $('filtroPeriodo').addEventListener('change', render);
  window.addEventListener('ars:storage-sync', render);
  render();
});
