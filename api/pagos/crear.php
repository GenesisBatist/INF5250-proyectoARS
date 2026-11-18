<?php
// POST /api/pagos/crear.php  { "clinicaId": "CLI-001", "periodo": "2026-11", "monto": 50.00 }
// Solo el agente con sesión iniciada puede solicitar el pago mensual a la clínica (RF-16).
declare(strict_types=1);

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../sesion-segura.php';
require_once __DIR__ . '/../services/PagoService.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ars_send_json(['success' => false, 'error' => 'Método no permitido'], 405);
}

// Valida la sesión del servidor (incluye la expiración por 30 minutos de inactividad).
try {
    $sesion = ars_sesion_validar(ars_pdo());
} catch (Throwable $e) {
    $sesion = ars_sesion_validar();
}
if ($sesion === null || $sesion['rol'] !== 'agente') {
    ars_send_json(['success' => false, 'error' => 'No autorizado'], 401);
}

ars_load_env_files([__DIR__ . '/../.env', dirname(__DIR__, 2) . '/.env']);

$in = ars_read_json_body();
$monto = $in['monto'] ?? null;
if (!is_numeric($monto)) {
    ars_send_json(['success' => false, 'error' => 'Datos del pago no válidos'], 422);
}

$res = (new PagoService())->solicitarPago(
    (int) round(((float) $monto) * 100),
    (string) ($in['clinicaId'] ?? ''),
    (string) ($in['periodo'] ?? '')
);

if ($res['estado'] === 'creado') {
    ars_send_json(['success' => true, 'referencia' => $res['referencia'] ?? '', 'estadoProveedor' => $res['estadoProveedor'] ?? '']);
}
ars_send_json(['success' => false, 'error' => $res['motivo'] ?? 'No se pudo crear el pago'], $res['estado'] === 'invalido' ? 422 : 502);
