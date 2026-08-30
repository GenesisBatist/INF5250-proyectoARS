<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

ars_handle_cors();

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
    $pdo = ars_pdo();

    if ($method === 'POST') {
        $body = ars_read_json_body();
        $key = trim((string) ($body['key'] ?? ''));
        $value = (string) ($body['value'] ?? '');

        if ($key === '') {
            ars_send_json([
                'ok' => false,
                'message' => 'La clave es obligatoria',
            ], 400);
        }

        $normalizedKey = ars_normalize_key($key);
        if (!isset(ars_array_defs()[$normalizedKey]) && !isset(ars_singleton_defs()[$normalizedKey])) {
            ars_send_json([
                'ok' => false,
                'message' => 'La clave no tiene tabla SQL asignada',
            ], 400);
        }

        ars_write_key($pdo, $key, $value);

        ars_send_json([
            'ok' => true,
            'key' => $key,
        ]);
    }

    if ($method === 'DELETE') {
        $key = trim((string) ($_GET['key'] ?? ''));
        if ($key === '') {
            ars_send_json([
                'ok' => false,
                'message' => 'La clave es obligatoria',
            ], 400);
        }

        $normalizedKey = ars_normalize_key($key);
        if (!isset(ars_array_defs()[$normalizedKey]) && !isset(ars_singleton_defs()[$normalizedKey])) {
            ars_send_json([
                'ok' => false,
                'message' => 'La clave no tiene tabla SQL asignada',
            ], 400);
        }

        ars_clear_key($pdo, $key);

        ars_send_json([
            'ok' => true,
            'key' => $key,
        ]);
    }

    ars_send_json([
        'ok' => false,
        'message' => 'Método no permitido',
    ], 405);
} catch (Throwable $error) {
    ars_send_json([
        'ok' => false,
        'message' => 'No se pudo procesar el elemento de almacenamiento',
        'error' => $error->getMessage(),
    ], 500);
}
