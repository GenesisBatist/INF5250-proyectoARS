// Reglas para que el agente apruebe o rechace autorizaciones (RF-05).
// No dependen del navegador, así que se pueden probar con pruebas unitarias.
// En el navegador queda como window.ARSAutorizacionesReglas; en Node se importa con require().
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ARSAutorizacionesReglas = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const DECISIONES = ['aprobada', 'rechazada'];
  const MIN_MOTIVO = 5;
  const txt = (valor) => String(valor ?? '').trim();
  const norm = (valor) => txt(valor).toLowerCase();

  /**
   * Revisa si el agente puede tomar esa decisión sobre la autorización.
   * - Solo se deciden autorizaciones pendientes.
   * - La decisión debe ser "aprobada" o "rechazada".
   * - Para rechazar hay que escribir el motivo.
   * - No se aprueba si el afiliado no está activo (se usa su estado actual si se pasa, o el guardado en la autorización).
   * @returns {{ok: boolean, error: string}}
   */
  function validarDecision(autorizacion, estado, comentario, afiliado) {
    if (!autorizacion || typeof autorizacion !== 'object') {
      return { ok: false, error: 'No se encontró la autorización.' };
    }
    const decision = norm(estado);
    if (!DECISIONES.includes(decision)) {
      return { ok: false, error: 'La decisión debe ser "aprobada" o "rechazada".' };
    }
    if (norm(autorizacion.estado) !== 'pendiente') {
      return { ok: false, error: `Solo se pueden decidir autorizaciones pendientes (esta ya está ${norm(autorizacion.estado) || 'sin estado'}).` };
    }
    if (decision === 'rechazada' && txt(comentario).length < MIN_MOTIVO) {
      return { ok: false, error: `Para rechazar debe escribir el motivo (mínimo ${MIN_MOTIVO} caracteres).` };
    }
    if (decision === 'aprobada') {
      const activo = afiliado ? norm(afiliado.estado) === 'activo' : autorizacion.afiliadoActivo !== false;
      if (!activo) {
        return { ok: false, error: 'No se puede aprobar: el afiliado no está activo.' };
      }
    }
    return { ok: true, error: '' };
  }

  return { DECISIONES, MIN_MOTIVO, validarDecision };
});
