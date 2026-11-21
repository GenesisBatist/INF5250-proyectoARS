// Pruebas unitarias de los filtros de reportes (RF-09). Se ejecutan con: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../dist/js/reportes-filtros.js');

const facturas = [
  { id: 'F1', clinicaId: '1', clinica: 'Clínica Norte', seguro: 800, paciente: 200, estado: 'pendiente_revision', fecha: '2026-11-02' },
  { id: 'F2', clinicaId: '1', clinica: 'Clínica Norte', seguro: 500, paciente: 100, estado: 'aceptado_clinica', fecha: '2026-11-15T10:30:00.000Z' },
  { id: 'F3', clinicaId: '2', clinica: 'Centro Médico', seguro: 300, paciente: 50, estado: 'enviado_clinica', fecha: '2026-10-20' },
  { id: 'F4', clinicaId: '2', clinica: 'Centro Médico', seguro: 100, paciente: 0, estado: 'pendiente_revision', fecha: '-' }
];

test('normalizarFecha: acepta AAAA-MM-DD e ISO, y devuelve vacío si no es fecha', () => {
  assert.equal(F.normalizarFecha('2026-11-02'), '2026-11-02');
  assert.equal(F.normalizarFecha('2026-11-15T10:30:00.000Z'), '2026-11-15');
  assert.equal(F.normalizarFecha('-'), '');
  assert.equal(F.normalizarFecha(''), '');
  assert.equal(F.normalizarFecha(null), '');
  assert.equal(F.normalizarFecha('no es fecha'), '');
});

test('normalizarFecha: entiende un texto de fecha que no es ISO', () => {
  assert.match(F.normalizarFecha('November 5, 2026'), /^2026-11-05$/);
});

test('filtrarFacturas: sin filtros devuelve todo', () => {
  assert.equal(F.filtrarFacturas(facturas, {}).length, 4);
  assert.equal(F.filtrarFacturas(facturas).length, 4);
});

test('filtrarFacturas: por clínica', () => {
  const r = F.filtrarFacturas(facturas, { clinicaId: '2' });
  assert.deepEqual(r.map((x) => x.id), ['F3', 'F4']);
});

test('filtrarFacturas: por estado, sin importar mayúsculas', () => {
  const r = F.filtrarFacturas(facturas, { estado: 'PENDIENTE_REVISION' });
  assert.deepEqual(r.map((x) => x.id), ['F1', 'F4']);
});

test('filtrarFacturas: por rango de fechas incluye los extremos', () => {
  const r = F.filtrarFacturas(facturas, { desde: '2026-11-02', hasta: '2026-11-15' });
  assert.deepEqual(r.map((x) => x.id), ['F1', 'F2']);
});

test('filtrarFacturas: solo desde, o solo hasta', () => {
  assert.deepEqual(F.filtrarFacturas(facturas, { desde: '2026-11-03' }).map((x) => x.id), ['F2']);
  assert.deepEqual(F.filtrarFacturas(facturas, { hasta: '2026-10-31' }).map((x) => x.id), ['F3']);
});

test('filtrarFacturas: con fechas, una factura sin fecha válida queda fuera', () => {
  const r = F.filtrarFacturas(facturas, { desde: '2026-01-01' });
  assert.ok(!r.some((x) => x.id === 'F4'));
});

test('filtrarFacturas: combina clínica, estado y fechas', () => {
  const r = F.filtrarFacturas(facturas, { clinicaId: '1', estado: 'aceptado_clinica', desde: '2026-11-01', hasta: '2026-11-30' });
  assert.deepEqual(r.map((x) => x.id), ['F2']);
});

test('filtrarFacturas: tolera datos inválidos', () => {
  assert.deepEqual(F.filtrarFacturas(null, {}), []);
  assert.deepEqual(F.filtrarFacturas([null, undefined], {}), []);
});

test('totales: suma seguro, paciente y total facturado', () => {
  const t = F.totales(facturas);
  assert.deepEqual(t, { cantidad: 4, seguro: 1700, paciente: 350, facturado: 2050 });
  assert.deepEqual(F.totales([]), { cantidad: 0, seguro: 0, paciente: 0, facturado: 0 });
  assert.equal(F.totales(null).cantidad, 0);
});

test('resumenPorClinica: agrupa, ordena y calcula lo pendiente para la ARS', () => {
  const r = F.resumenPorClinica(facturas);
  assert.deepEqual(r.map((x) => x.clinica), ['Centro Médico', 'Clínica Norte']);
  const norte = r.find((x) => x.clinicaId === '1');
  assert.equal(norte.facturas, 2);
  assert.equal(norte.totalARS, 1300);
  assert.equal(norte.totalPaciente, 300);
  assert.equal(norte.pendienteARS, 800);
});

test('resumenPorClinica: sin nombre usa un texto por defecto y tolera nulos', () => {
  const r = F.resumenPorClinica([null, { clinicaId: '9', seguro: 10, paciente: 5, estado: 'aceptado_clinica' }]);
  assert.equal(r.length, 1);
  assert.equal(r[0].clinica, 'Clínica sin nombre');
  assert.equal(r[0].pendienteARS, 0);
  assert.deepEqual(F.resumenPorClinica(null), []);
});

test('estadosDisponibles: lista los estados sin repetir y con etiqueta legible', () => {
  const r = F.estadosDisponibles(facturas);
  assert.deepEqual(r.map((x) => x.valor).sort(), ['aceptado_clinica', 'enviado_clinica', 'pendiente_revision']);
  assert.equal(F.etiquetaEstado('aceptado_clinica'), 'Aceptado por la clínica');
  assert.equal(F.etiquetaEstado('otro_estado'), 'otro_estado');
  assert.equal(F.etiquetaEstado(''), 'Sin estado');
  assert.deepEqual(F.estadosDisponibles(null), []);
});
