// Reglas de negocio de afiliados que no dependen del navegador (para poder probarlas con pruebas unitarias).
// En el navegador queda disponible como window.ARSAfiliadosReglas; en Node se importa con require().
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ARSAfiliadosReglas = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const txt = (valor) => String(valor ?? '').trim();
  const soloDigitos = (valor) => txt(valor).replace(/\D/g, '');

  // Un registro pertenece al afiliado si guarda su id (afiliadoId) o su cédula.
  function perteneceAfiliado(registro, id, cedula) {
    if (!registro || typeof registro !== 'object') return false;
    if (id && txt(registro.afiliadoId) === id) return true;
    return Boolean(cedula) && soloDigitos(registro.cedula) === cedula;
  }

  function contar(lista, id, cedula) {
    return Array.isArray(lista) ? lista.filter((r) => perteneceAfiliado(r, id, cedula)).length : 0;
  }

  /**
   * Cuenta los registros que dependen de un afiliado (autorizaciones, servicios, citas y reclamaciones).
   * Si tiene alguno, no se debe eliminar para no perder el historial.
   */
  function contarDependencias(afiliado, datos) {
    const id = txt(afiliado && afiliado.id);
    const cedula = soloDigitos(afiliado && afiliado.cedula);
    const origen = datos || {};
    const resultado = {
      autorizaciones: contar(origen.autorizaciones, id, cedula),
      servicios: contar(origen.servicios, id, cedula),
      citas: contar(origen.citas, id, cedula),
      reclamaciones: contar(origen.reclamaciones, id, cedula)
    };
    resultado.total = resultado.autorizaciones + resultado.servicios + resultado.citas + resultado.reclamaciones;
    return resultado;
  }

  /**
   * Quita al afiliado de la lista de afiliados y su usuario de acceso de la lista de usuarios.
   * No modifica las listas originales: devuelve copias nuevas.
   */
  function quitarAfiliado(id, afiliados, usuarios) {
    const idTexto = txt(id);
    const listaAfiliados = Array.isArray(afiliados) ? afiliados : [];
    const listaUsuarios = Array.isArray(usuarios) ? usuarios : [];
    const afiliado = listaAfiliados.find((a) => txt(a && a.id) === idTexto);

    if (!idTexto || !afiliado) {
      return { eliminado: false, afiliado: null, afiliados: [...listaAfiliados], usuarios: [...listaUsuarios] };
    }

    const cedula = soloDigitos(afiliado.cedula);
    return {
      eliminado: true,
      afiliado,
      afiliados: listaAfiliados.filter((a) => txt(a && a.id) !== idTexto),
      usuarios: listaUsuarios.filter((u) => {
        const esDelAfiliado = u && u.rol === 'afiliado' &&
          (txt(u.referenciaId) === idTexto || (cedula !== '' && soloDigitos(u.cedula) === cedula));
        return !esDelAfiliado;
      })
    };
  }

  return { contarDependencias, quitarAfiliado };
});
