<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

ars_handle_cors();

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
    ars_send_json([
        'ok' => false,
        'message' => 'No se pudo obtener el snapshot de almacenamiento',
        'error' => $error->getMessage(),
    ], 500);
}
