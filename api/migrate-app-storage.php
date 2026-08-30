<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

ars_handle_cors();

function ars_is_effectively_empty(string $key, ?array $payload): bool
{
    if ($payload === null) {
        return true;
    }

    $value = (string) ($payload['value'] ?? '');
    if ($value === '') {
        return true;
    }

    $normalizedKey = ars_normalize_key($key);
    if (isset(ars_array_defs()[$normalizedKey])) {
        $decoded = ars_parse_json($value, []);
        return !is_array($decoded) || count($decoded) === 0;
    }

    return trim($value) === '';
}

try {
    $pdo = ars_pdo();
    ars_ensure_schema($pdo);

    $stmt = $pdo->query('SELECT storage_key, storage_value, updated_at FROM app_storage ORDER BY storage_key');
    $rows = $stmt->fetchAll();

    $migrated = [];
    $skipped = [];

    foreach ($rows as $row) {
        $sourceKey = (string) $row['storage_key'];
        $targetKey = ars_normalize_key($sourceKey);
        $value = (string) $row['storage_value'];

        if (!isset(ars_array_defs()[$targetKey]) && !isset(ars_singleton_defs()[$targetKey])) {
            $skipped[] = ['key' => $sourceKey, 'reason' => 'sin tabla destino'];
            continue;
        }

        $current = ars_read_key($pdo, $targetKey);
        if (!ars_is_effectively_empty($targetKey, ['value' => $value]) && ars_is_effectively_empty($targetKey, $current)) {
            ars_write_key($pdo, $targetKey, $value);
            $migrated[] = $sourceKey;
            continue;
        }

        $skipped[] = ['key' => $sourceKey, 'reason' => 'destino ya contiene datos o el origen está vacío'];
    }

    ars_send_json([
        'ok' => true,
        'migrated' => $migrated,
        'skipped' => $skipped,
    ]);
} catch (Throwable $error) {
    ars_send_json([
        'ok' => false,
        'message' => 'No se pudo migrar app_storage',
        'error' => $error->getMessage(),
    ], 500);
}
