// Pruebas unitarias de las reglas de afiliados (RF-03). Se ejecutan con: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { contarDependencias, quitarAfiliado } = require('../dist/js/afiliados-reglas.js');

const afiliado = { id: 'AFI-001', cedula: '22400401950', nombre: 'Mario' };

test('contarDependencias: sin datos devuelve cero', () => {
  assert.deepEqual(contarDependencias(afiliado, {}), { autorizaciones: 0, servicios: 0, citas: 0, reclamaciones: 0, total: 0 });
  assert.equal(contarDependencias(afiliado).total, 0);
});

test('contarDependencias: cuenta por afiliadoId en cada lista', () => {
  const r = contarDependencias(afiliado, {
    autorizaciones: [{ afiliadoId: 'AFI-001' }, { afiliadoId: 'AFI-002' }],
    servicios: [{ afiliadoId: 'AFI-001' }],
    citas: [{ afiliadoId: 'AFI-001' }, { afiliadoId: 'AFI-001' }],
    reclamaciones: []
  });
  assert.deepEqual(r, { autorizaciones: 1, servicios: 1, citas: 2, reclamaciones: 0, total: 4 });
});

test('contarDependencias: también reconoce la cédula (con guiones)', () => {
  const r = contarDependencias(afiliado, { reclamaciones: [{ cedula: '224-0040195-0' }, { cedula: '999' }] });
  assert.equal(r.reclamaciones, 1);
  assert.equal(r.total, 1);
});

test('contarDependencias: ignora listas inválidas y registros vacíos', () => {
  const r = contarDependencias(afiliado, { autorizaciones: 'no es lista', servicios: [null, 5, {}] });
  assert.equal(r.total, 0);
});

test('contarDependencias: un afiliado sin id ni cédula no coincide con registros vacíos', () => {
  const r = contarDependencias({}, { autorizaciones: [{ afiliadoId: '' }, { cedula: '' }] });
  assert.equal(r.total, 0);
});

test('quitarAfiliado: elimina al afiliado y su usuario, sin tocar a otros', () => {
  const afiliados = [afiliado, { id: 'AFI-002', cedula: '11111111111' }];
  const usuarios = [
    { rol: 'afiliado', referenciaId: 'AFI-001', cedula: '22400401950' },
    { rol: 'afiliado', referenciaId: 'AFI-002', cedula: '11111111111' },
    { rol: 'agente', referenciaId: 'AFI-001' }
  ];
  const r = quitarAfiliado('AFI-001', afiliados, usuarios);
  assert.equal(r.eliminado, true);
  assert.deepEqual(r.afiliados.map((a) => a.id), ['AFI-002']);
  assert.deepEqual(r.usuarios.map((u) => u.rol + ':' + u.referenciaId), ['afiliado:AFI-002', 'agente:AFI-001']);
  assert.equal(afiliados.length, 2, 'no modifica la lista original');
  assert.equal(usuarios.length, 3, 'no modifica la lista original');
});

test('quitarAfiliado: encuentra el usuario por cédula si no tiene referenciaId', () => {
  const r = quitarAfiliado('AFI-001', [afiliado], [{ rol: 'afiliado', cedula: '224-0040195-0' }]);
  assert.equal(r.usuarios.length, 0);
});

test('quitarAfiliado: id inexistente o vacío no elimina nada', () => {
  const r1 = quitarAfiliado('AFI-999', [afiliado], []);
  const r2 = quitarAfiliado('', [afiliado], []);
  assert.equal(r1.eliminado, false);
  assert.equal(r2.eliminado, false);
  assert.equal(r1.afiliados.length, 1);
});

test('quitarAfiliado: tolera listas inválidas', () => {
  const r = quitarAfiliado('AFI-001', null, undefined);
  assert.equal(r.eliminado, false);
  assert.deepEqual(r.afiliados, []);
});
