<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

ars_handle_cors();

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    ars_send_json([
        'ok' => false,
        'message' => 'Método no permitido',
    ], 405);
}

try {
    $pdo = ars_pdo();

    $body = ars_read_json_body();
    $keys = array_values(array_filter(
        array_map(static fn ($item) => trim((string) $item), is_array($body['keys'] ?? null) ? $body['keys'] : []),
        static fn ($item) => $item !== ''
    ));

    if ($keys === []) {
        ars_send_json([
            'ok' => true,
            'deleted' => 0,
        ]);
    }

    foreach ($keys as $key) {
        ars_clear_key($pdo, $key);
    }

    ars_send_json([
        'ok' => true,
        'deleted' => count($keys),
    ]);
} catch (Throwable $error) {
    ars_send_json([
        'ok' => false,
        'message' => 'No se pudo limpiar el almacenamiento',
        'error' => $error->getMessage(),
    ], 500);
}
