// Pruebas unitarias de las reglas de decisión de autorizaciones (RF-05). Se ejecutan con: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarDecision, DECISIONES, MIN_MOTIVO } = require('../dist/js/autorizaciones-reglas.js');

const pendiente = { id: 'AUTORIZACION-001', estado: 'pendiente', afiliadoActivo: true };

test('constantes: solo se decide aprobada o rechazada', () => {
  assert.deepEqual(DECISIONES, ['aprobada', 'rechazada']);
  assert.equal(MIN_MOTIVO, 5);
});

test('aprobar una autorización pendiente es válido', () => {
  assert.deepEqual(validarDecision(pendiente, 'aprobada', ''), { ok: true, error: '' });
});

test('rechazar con motivo es válido', () => {
  assert.equal(validarDecision(pendiente, 'rechazada', 'Servicio no cubierto').ok, true);
});

test('rechazar sin motivo o con motivo muy corto no es válido', () => {
  const sin = validarDecision(pendiente, 'rechazada', '');
  const corto = validarDecision(pendiente, 'rechazada', 'no');
  const espacios = validarDecision(pendiente, 'rechazada', '     ');
  assert.equal(sin.ok, false);
  assert.match(sin.error, /motivo/);
  assert.equal(corto.ok, false);
  assert.equal(espacios.ok, false);
});

test('el estado de la decisión se acepta en mayúsculas y con espacios', () => {
  assert.equal(validarDecision(pendiente, ' APROBADA ', '').ok, true);
});

test('una decisión distinta de aprobada o rechazada no es válida', () => {
  for (const estado of ['pendiente', 'privada', '', undefined, 'otro']) {
    const r = validarDecision(pendiente, estado, 'motivo largo');
    assert.equal(r.ok, false, `estado ${estado}`);
    assert.match(r.error, /aprobada/);
  }
});

test('no se pueden decidir autorizaciones que ya no están pendientes', () => {
  for (const estado of ['aprobada', 'rechazada', 'privada']) {
    const r = validarDecision({ estado }, 'aprobada', '');
    assert.equal(r.ok, false, estado);
    assert.match(r.error, /pendientes/);
  }
  assert.match(validarDecision({}, 'aprobada', '').error, /sin estado/);
});

test('autorización inexistente no es válida', () => {
  assert.equal(validarDecision(null, 'aprobada', '').ok, false);
  assert.equal(validarDecision(undefined, 'aprobada', '').ok, false);
  assert.equal(validarDecision('texto', 'aprobada', '').ok, false);
});

test('no se aprueba si el afiliado no está activo (estado actual del afiliado)', () => {
  const r = validarDecision(pendiente, 'aprobada', '', { estado: 'inactivo' });
  assert.equal(r.ok, false);
  assert.match(r.error, /activo/);
  assert.equal(validarDecision(pendiente, 'aprobada', '', { estado: 'Activo' }).ok, true);
});

test('sin datos del afiliado se usa el valor guardado en la autorización', () => {
  assert.equal(validarDecision({ estado: 'pendiente', afiliadoActivo: false }, 'aprobada', '').ok, false);
  assert.equal(validarDecision({ estado: 'pendiente' }, 'aprobada', '').ok, true);
});

test('un afiliado inactivo sí puede tener su autorización rechazada', () => {
  assert.equal(validarDecision(pendiente, 'rechazada', 'Afiliado inactivo', { estado: 'inactivo' }).ok, true);
});
