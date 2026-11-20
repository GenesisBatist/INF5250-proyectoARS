<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/sesion-segura.php';

ars_handle_cors();

// Solo usuarios con sesión válida pueden usar el almacenamiento (OWASP A01).
ars_requerir_sesion();

try {
    $pdo = ars_pdo();
    $rawKeys = trim((string) ($_GET['keys'] ?? ''));
    $keys = $rawKeys !== ''
        ? array_values(array_filter(array_map('trim', explode(',', $rawKeys)), static fn ($key) => $key !== ''))
        : [];

    ars_send_json([
        'ok' => true,
        'data' => ars_storage_snapshot($pdo, $keys),
    ]);
} catch (Throwable $error) {
    error_log('storage/snapshot.php: ' . $error->getMessage());
    ars_send_json([
        'ok' => false,
        'message' => 'No se pudo obtener el snapshot de almacenamiento',
    ], 500);
}
