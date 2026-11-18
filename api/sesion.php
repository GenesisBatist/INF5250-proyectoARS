<?php
// GET /api/sesion.php  -> indica si hay una sesión vigente en el servidor (la renueva al consultarla).
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/sesion-segura.php';

ars_handle_cors();

try {
    $s = ars_sesion_validar(ars_pdo());
} catch (Throwable $e) {
    error_log('sesion.php: ' . $e->getMessage());
    $s = ars_sesion_validar();
}

if ($s === null) {
    ars_send_json(['success' => false, 'message' => 'Sesión no válida o expirada'], 401);
}
ars_send_json(['success' => true, 'rol' => $s['rol'], 'usuarioId' => $s['usuario_id']]);
