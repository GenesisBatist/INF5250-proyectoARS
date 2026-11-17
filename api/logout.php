<?php
// POST /api/logout.php  -> cierra la sesión del servidor y registra el cierre (usuario, rol, fecha).
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/sesion-segura.php';

ars_handle_cors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    ars_send_json(['success' => false, 'message' => 'Método no permitido'], 405);
}

ars_sesion_iniciar();
if (!empty($_SESSION['usuario_id'])) {
    try {
        ars_registrar_evento_sesion(ars_pdo(), 'logout', (string) $_SESSION['usuario_id'], (string) ($_SESSION['rol'] ?? ''));
    } catch (Throwable $e) {
        error_log('logout.php: ' . $e->getMessage());
    }
}
ars_sesion_destruir();

ars_send_json(['success' => true]);
