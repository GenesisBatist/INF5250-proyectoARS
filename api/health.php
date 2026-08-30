<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

ars_handle_cors();

try {
    $pdo = ars_pdo();
    ars_ensure_schema($pdo);
    $pdo->query('SELECT 1');

    ars_send_json([
        'ok' => true,
        'message' => 'API PHP activa',
        'source' => 'workspace-api',
    ]);
} catch (Throwable $error) {
    ars_send_json([
        'ok' => false,
        'message' => 'No fue posible conectar con MySQL',
        'error' => $error->getMessage(),
    ], 500);
}
