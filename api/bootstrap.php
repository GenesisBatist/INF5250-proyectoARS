<?php

declare(strict_types=1);

function ars_load_env_files(array $paths): void
{
    foreach ($paths as $path) {
        if (!is_file($path) || !is_readable($path)) {
            continue;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            continue;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $key = trim($parts[0]);
            $value = trim($parts[1]);
            $value = trim($value, " \t\n\r\0\x0B\"'");

            if ($key === '' || getenv($key) !== false) {
                continue;
            }

            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

function ars_env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === null || $value === '') {
        return $default;
    }

    return $value;
}

function ars_send_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ars_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function ars_handle_cors(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function ars_pdo(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    ars_load_env_files([
        __DIR__ . '/.env',
        dirname(__DIR__) . '/.env',
    ]);

    $host = ars_env('MYSQL_HOST', 'localhost');
    $port = ars_env('MYSQL_PORT', '3306');
    $database = ars_env('MYSQL_DATABASE', 'proyecto_s_hibrido');
    $user = ars_env('MYSQL_USER', 'root');
    $password = ars_env('MYSQL_PASSWORD', '');

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $database);

    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function ars_parse_json(string $value, $fallback)
{
    $decoded = json_decode($value, true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : $fallback;
}

function ars_stringify_json($value, string $fallback = '{}'): string
{
    $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return $encoded === false ? $fallback : $encoded;
}

function ars_normalize_bool($value): int
{
    return $value ? 1 : 0;
}

function ars_denormalize_bool($value): bool
{
    return (int) $value === 1;
}

function ars_build_insert_sql(string $tableName, array $columns): string
{
    $placeholders = implode(', ', array_fill(0, count($columns), '?'));
    return sprintf('INSERT INTO %s (%s) VALUES (%s)', $tableName, implode(', ', $columns), $placeholders);
}

function ars_normalize_key(string $key): string
{
    $map = [
        'ars_reclamaciones' => 'reclamaciones',
        'ars_reclamos' => 'reclamaciones',
    ];

    return $map[$key] ?? $key;
}

function ars_array_defs(): array
{
    static $defs = null;
    if ($defs !== null) {
        return $defs;
    }

    $defs = [
        'ars_users' => [
            'tableName' => 'ars_users',
            'columns' => ['id', 'username', 'password', 'rol', 'nombre', 'referencia_id', 'activo', 'codigo_seguro', 'cedula', 'extra_json'],
            'toRow' => function (array $item): array {
                $extra = $item;
                unset($extra['id'], $extra['username'], $extra['password'], $extra['rol'], $extra['nombre'], $extra['referenciaId'], $extra['activo'], $extra['codigoSeguro'], $extra['cedula']);
                return [
                    $item['id'] ?? null,
                    $item['username'] ?? null,
                    $item['password'] ?? null,
                    $item['rol'] ?? null,
                    $item['nombre'] ?? null,
                    $item['referenciaId'] ?? null,
                    ars_normalize_bool(($item['activo'] ?? true) !== false),
                    $item['codigoSeguro'] ?? null,
                    $item['cedula'] ?? null,
                    ars_stringify_json($extra),
                ];
            },
            'fromRow' => function (array $row): array {
                return array_merge([
                    'id' => $row['id'],
                    'username' => $row['username'],
                    'password' => $row['password'],
                    'rol' => $row['rol'],
                    'nombre' => $row['nombre'],
                    'referenciaId' => $row['referencia_id'],
                    'activo' => ars_denormalize_bool($row['activo']),
                    'codigoSeguro' => $row['codigo_seguro'],
                    'cedula' => $row['cedula'],
                ], ars_parse_json((string) ($row['extra_json'] ?? '{}'), []));
            },
        ],
        'ars_afiliados' => [
            'tableName' => 'ars_afiliados',
            'columns' => ['id', 'nombre', 'afiliado', 'cedula', 'telefono', 'correo', 'direccion', 'poliza_id', 'poliza', 'estado', 'usuario', 'password', 'fecha_registro', 'fecha_creacion', 'fecha_nacimiento', 'fecha_estado', 'extra_json'],
            'toRow' => function (array $item): array {
                $extra = $item;
                unset($extra['id'], $extra['nombre'], $extra['afiliado'], $extra['cedula'], $extra['telefono'], $extra['correo'], $extra['direccion'], $extra['polizaId'], $extra['poliza'], $extra['estado'], $extra['usuario'], $extra['password'], $extra['fechaRegistro'], $extra['fechaCreacion'], $extra['fechaNacimiento'], $extra['fechaEstado']);
                return [
                    $item['id'] ?? null,
                    $item['nombre'] ?? null,
                    $item['afiliado'] ?? null,
                    $item['cedula'] ?? null,
                    $item['telefono'] ?? null,
                    $item['correo'] ?? null,
                    $item['direccion'] ?? null,
                    $item['polizaId'] ?? null,
                    $item['poliza'] ?? null,
                    $item['estado'] ?? null,
                    $item['usuario'] ?? null,
                    $item['password'] ?? null,
                    $item['fechaRegistro'] ?? null,
                    $item['fechaCreacion'] ?? null,
                    $item['fechaNacimiento'] ?? null,
                    $item['fechaEstado'] ?? null,
                    ars_stringify_json($extra),
                ];
            },
            'fromRow' => function (array $row): array {
                return array_merge([
                    'id' => $row['id'],
                    'nombre' => $row['nombre'],
                    'afiliado' => $row['afiliado'],
                    'cedula' => $row['cedula'],
                    'telefono' => $row['telefono'],
                    'correo' => $row['correo'],
                    'direccion' => $row['direccion'],
                    'polizaId' => $row['poliza_id'],
                    'poliza' => $row['poliza'],
                    'estado' => $row['estado'],
                    'usuario' => $row['usuario'],
                    'password' => $row['password'],
                    'fechaRegistro' => $row['fecha_registro'],
                    'fechaCreacion' => $row['fecha_creacion'],
                    'fechaNacimiento' => $row['fecha_nacimiento'],
                    'fechaEstado' => $row['fecha_estado'],
                ], ars_parse_json((string) ($row['extra_json'] ?? '{}'), []));
            },
        ],
        'ars_clinicas' => [
            'tableName' => 'ars_clinicas',
            'columns' => ['id', 'nombre', 'rnc', 'telefono', 'direccion', 'usuario', 'password', 'estado', 'fecha_registro', 'extra_json'],
            'toRow' => function (array $item): array {
                $extra = $item;
                unset($extra['id'], $extra['nombre'], $extra['rnc'], $extra['telefono'], $extra['direccion'], $extra['usuario'], $extra['password'], $extra['estado'], $extra['fechaRegistro']);
                return [
                    $item['id'] ?? null,
                    $item['nombre'] ?? null,
                    $item['rnc'] ?? null,
                    $item['telefono'] ?? null,
                    $item['direccion'] ?? null,
                    $item['usuario'] ?? null,
                    $item['password'] ?? null,
                    $item['estado'] ?? null,
                    $item['fechaRegistro'] ?? null,
                    ars_stringify_json($extra),
                ];
            },
            'fromRow' => function (array $row): array {
                return array_merge([
                    'id' => $row['id'],
                    'nombre' => $row['nombre'],
                    'rnc' => $row['rnc'],
                    'telefono' => $row['telefono'],
                    'direccion' => $row['direccion'],
                    'usuario' => $row['usuario'],
                    'password' => $row['password'],
                    'estado' => $row['estado'],
                    'fechaRegistro' => $row['fecha_registro'],
                ], ars_parse_json((string) ($row['extra_json'] ?? '{}'), []));
            },
        ],
        'ars_polizas' => [
            'tableName' => 'ars_polizas',
            'columns' => ['id', 'tipo_plan', 'nombre_plan', 'monto_maximo', 'maximo_anual', 'consumido_anual', 'estado', 'cobertura_json', 'coberturas_json', 'extra_json'],
            'toRow' => function (array $item): array {
                $extra = $item;
                unset($extra['id'], $extra['tipoPlan'], $extra['nombrePlan'], $extra['montoMaximo'], $extra['maximoAnual'], $extra['consumidoAnual'], $extra['estado'], $extra['cobertura'], $extra['coberturas']);
                return [
                    $item['id'] ?? null,
                    $item['tipoPlan'] ?? null,
                    $item['nombrePlan'] ?? null,
                    (float) ($item['montoMaximo'] ?? 0),
                    (float) ($item['maximoAnual'] ?? 0),
                    (float) ($item['consumidoAnual'] ?? 0),
                    $item['estado'] ?? null,
                    ars_stringify_json($item['cobertura'] ?? [], '[]'),
                    ars_stringify_json($item['coberturas'] ?? [], '[]'),
                    ars_stringify_json($extra),
                ];
            },
            'fromRow' => function (array $row): array {
                return array_merge([
                    'id' => $row['id'],
                    'tipoPlan' => $row['tipo_plan'],
                    'nombrePlan' => $row['nombre_plan'],
                    'montoMaximo' => (float) ($row['monto_maximo'] ?? 0),
                    'maximoAnual' => (float) ($row['maximo_anual'] ?? 0),
                    'consumidoAnual' => (float) ($row['consumido_anual'] ?? 0),
                    'estado' => $row['estado'],
                    'cobertura' => ars_parse_json((string) ($row['cobertura_json'] ?? '[]'), []),
                    'coberturas' => ars_parse_json((string) ($row['coberturas_json'] ?? '[]'), []),
                ], ars_parse_json((string) ($row['extra_json'] ?? '{}'), []));
            },
        ],
        'ars_autorizaciones' => [
            'tableName' => 'ars_autorizaciones',
            'columns' => ['id', 'afiliado_id', 'afiliado_nombre', 'cedula', 'poliza_id', 'clinica_id', 'clinica_nombre', 'servicio', 'doctor', 'especialidad', 'prioridad', 'fecha_servicio', 'diagnostico', 'observacion_medica', 'monto_estimado', 'monto_cubierto', 'porcentaje_cobertura', 'creado_por_rol', 'modalidad_pago', 'auto_generada', 'afiliado_activo', 'cobertura_disponible', 'estado', 'comentario_agente', 'fecha_solicitud', 'fecha_decision', 'fecha_creacion', 'extra_json'],
            'toRow' => function (array $item): array {
                $extra = $item;
                unset($extra['id'], $extra['afiliadoId'], $extra['afiliadoNombre'], $extra['cedula'], $extra['polizaId'], $extra['clinicaId'], $extra['clinicaNombre'], $extra['servicio'], $extra['doctor'], $extra['especialidad'], $extra['prioridad'], $extra['fechaServicio'], $extra['diagnostico'], $extra['observacionMedica'], $extra['montoEstimado'], $extra['montoCubierto'], $extra['porcentajeCobertura'], $extra['creadoPorRol'], $extra['modalidadPago'], $extra['autoGenerada'], $extra['afiliadoActivo'], $extra['coberturaDisponible'], $extra['estado'], $extra['comentarioAgente'], $extra['fechaSolicitud'], $extra['fechaDecision'], $extra['fechaCreacion']);
                return [
                    $item['id'] ?? null,
                    $item['afiliadoId'] ?? null,
                    $item['afiliadoNombre'] ?? null,
                    $item['cedula'] ?? null,
                    $item['polizaId'] ?? null,
                    $item['clinicaId'] ?? null,
                    $item['clinicaNombre'] ?? null,
                    $item['servicio'] ?? null,
                    $item['doctor'] ?? null,
                    $item['especialidad'] ?? null,
                    $item['prioridad'] ?? null,
                    $item['fechaServicio'] ?? null,
                    $item['diagnostico'] ?? null,
                    $item['observacionMedica'] ?? null,
                    (float) ($item['montoEstimado'] ?? 0),
                    (float) ($item['montoCubierto'] ?? 0),
                    (float) ($item['porcentajeCobertura'] ?? 0),
                    $item['creadoPorRol'] ?? null,
                    $item['modalidadPago'] ?? null,
                    ars_normalize_bool($item['autoGenerada'] ?? false),
                    ars_normalize_bool($item['afiliadoActivo'] ?? false),
                    ars_normalize_bool($item['coberturaDisponible'] ?? false),
                    $item['estado'] ?? null,
                    $item['comentarioAgente'] ?? null,
                    $item['fechaSolicitud'] ?? null,
                    $item['fechaDecision'] ?? null,
                    $item['fechaCreacion'] ?? null,
                    ars_stringify_json($extra),
                ];
            },
            'fromRow' => function (array $row): array {
                return array_merge([
                    'id' => $row['id'],
                    'afiliadoId' => $row['afiliado_id'],
                    'afiliadoNombre' => $row['afiliado_nombre'],
                    'cedula' => $row['cedula'],
                    'polizaId' => $row['poliza_id'],
                    'clinicaId' => $row['clinica_id'],
                    'clinicaNombre' => $row['clinica_nombre'],
                    'servicio' => $row['servicio'],
                    'doctor' => $row['doctor'],
                    'especialidad' => $row['especialidad'],
                    'prioridad' => $row['prioridad'],
                    'fechaServicio' => $row['fecha_servicio'],
                    'diagnostico' => $row['diagnostico'],
                    'observacionMedica' => $row['observacion_medica'],
                    'montoEstimado' => (float) ($row['monto_estimado'] ?? 0),
                    'montoCubierto' => (float) ($row['monto_cubierto'] ?? 0),
                    'porcentajeCobertura' => (float) ($row['porcentaje_cobertura'] ?? 0),
                    'creadoPorRol' => $row['creado_por_rol'],
                    'modalidadPago' => $row['modalidad_pago'],
                    'autoGenerada' => ars_denormalize_bool($row['auto_generada']),
                    'afiliadoActivo' => ars_denormalize_bool($row['afiliado_activo']),
                    'coberturaDisponible' => ars_denormalize_bool($row['cobertura_disponible']),
                    'estado' => $row['estado'],
                    'comentarioAgente' => $row['comentario_agente'],
                    'fechaSolicitud' => $row['fecha_solicitud'],
                    'fechaDecision' => $row['fecha_decision'],
                    'fechaCreacion' => $row['fecha_creacion'],
                ], ars_parse_json((string) ($row['extra_json'] ?? '{}'), []));
            },
        ],
        'ars_servicios_realizados' => [
            'tableName' => 'ars_servicios_realizados',
            'columns' => ['id', 'autorizacion_id', 'clinica_id', 'clinica_nombre', 'afiliado_id', 'afiliado_nombre', 'cedula', 'servicio', 'doctor', 'observaciones', 'fecha_servicio', 'estado', 'extra_json'],
            'toRow' => function (array $item): array {
                $extra = $item;
                unset($extra['id'], $extra['autorizacionId'], $extra['clinicaId'], $extra['clinicaNombre'], $extra['afiliadoId'], $extra['afiliadoNombre'], $extra['cedula'], $extra['servicio'], $extra['doctor'], $extra['observaciones'], $extra['fechaServicio'], $extra['estado']);
                return [
                    $item['id'] ?? null,
                    $item['autorizacionId'] ?? null,
                    $item['clinicaId'] ?? null,
                    $item['clinicaNombre'] ?? null,
                    $item['afiliadoId'] ?? null,
                    $item['afiliadoNombre'] ?? null,
                    $item['cedula'] ?? null,
                    $item['servicio'] ?? null,
                    $item['doctor'] ?? null,
                    $item['observaciones'] ?? null,
                    $item['fechaServicio'] ?? null,
                    $item['estado'] ?? null,
                    ars_stringify_json($extra),
                ];
            },
            'fromRow' => function (array $row): array {
                return array_merge([
                    'id' => $row['id'],
                    'autorizacionId' => $row['autorizacion_id'],
                    'clinicaId' => $row['clinica_id'],
                    'clinicaNombre' => $row['clinica_nombre'],
                    'afiliadoId' => $row['afiliado_id'],
                    'afiliadoNombre' => $row['afiliado_nombre'],
                    'cedula' => $row['cedula'],
                    'servicio' => $row['servicio'],
                    'doctor' => $row['doctor'],
                    'observaciones' => $row['observaciones'],
                    'fechaServicio' => $row['fecha_servicio'],
                    'estado' => $row['estado'],
                ], ars_parse_json((string) ($row['extra_json'] ?? '{}'), []));
            },
        ],
        'ars_servicios_clinica' => [
            'tableName' => 'ars_servicios_clinica',
            'columns' => ['id', 'autorizacion_id', 'clinica_id', 'clinica_nombre', 'afiliado_id', 'afiliado_nombre', 'cedula', 'codigo_seguro', 'servicio', 'modalidad', 'fecha_realizada', 'costo_final', 'monto_seguro', 'diferencia', 'doctor', 'observacion', 'estado_autorizacion', 'comentario_autorizacion', 'facturable', 'fecha_creacion', 'extra_json'],
            'toRow' => function (array $item): array {
                $extra = $item;
                unset($extra['id'], $extra['autorizacionId'], $extra['clinicaId'], $extra['clinicaNombre'], $extra['afiliadoId'], $extra['afiliadoNombre'], $extra['cedula'], $extra['codigoSeguro'], $extra['servicio'], $extra['modalidad'], $extra['fechaRealizada'], $extra['costoFinal'], $extra['montoSeguro'], $extra['diferencia'], $extra['doctor'], $extra['observacion'], $extra['estadoAutorizacion'], $extra['comentarioAutorizacion'], $extra['facturable'], $extra['fechaCreacion']);
                return [
                    $item['id'] ?? null,
                    $item['autorizacionId'] ?? null,
                    $item['clinicaId'] ?? null,
                    $item['clinicaNombre'] ?? null,
                    $item['afiliadoId'] ?? null,
                    $item['afiliadoNombre'] ?? null,
                    $item['cedula'] ?? null,
                    $item['codigoSeguro'] ?? null,
                    $item['servicio'] ?? null,
                    $item['modalidad'] ?? null,
                    $item['fechaRealizada'] ?? null,
                    (float) ($item['costoFinal'] ?? 0),
                    (float) ($item['montoSeguro'] ?? 0),
                    (float) ($item['diferencia'] ?? 0),
                    $item['doctor'] ?? null,
                    $item['observacion'] ?? null,
                    $item['estadoAutorizacion'] ?? null,
                    $item['comentarioAutorizacion'] ?? null,
                    ars_normalize_bool(($item['facturable'] ?? true) !== false),
                    $item['fechaCreacion'] ?? null,
                    ars_stringify_json($extra),
                ];
            },
            'fromRow' => function (array $row): array {
                return array_merge([
                    'id' => $row['id'],
                    'autorizacionId' => $row['autorizacion_id'],
                    'clinicaId' => $row['clinica_id'],
                    'clinicaNombre' => $row['clinica_nombre'],
                    'afiliadoId' => $row['afiliado_id'],
                    'afiliadoNombre' => $row['afiliado_nombre'],
                    'cedula' => $row['cedula'],
                    'codigoSeguro' => $row['codigo_seguro'],
                    'servicio' => $row['servicio'],
                    'modalidad' => $row['modalidad'],
                    'fechaRealizada' => $row['fecha_realizada'],
                    'costoFinal' => (float) ($row['costo_final'] ?? 0),
                    'montoSeguro' => (float) ($row['monto_seguro'] ?? 0),
                    'diferencia' => (float) ($row['diferencia'] ?? 0),
                    'doctor' => $row['doctor'],
                    'observacion' => $row['observacion'],
                    'estadoAutorizacion' => $row['estado_autorizacion'],
                    'comentarioAutorizacion' => $row['comentario_autorizacion'],
                    'facturable' => ars_denormalize_bool($row['facturable']),
                    'fechaCreacion' => $row['fecha_creacion'],
                ], ars_parse_json((string) ($row['extra_json'] ?? '{}'), []));
            },
        ],
        'ars_citas_clinica' => [
            'tableName' => 'ars_citas_clinica',
            'columns' => ['id', 'clinica_id', 'clinica_nombre', 'afiliado_id', 'paciente_nombre', 'cedula', 'codigo_seguro', 'fecha_cita', 'hora_cita', 'doctor', 'estado_seguro', 'payload_json'],
            'toRow' => function (array $item, int $index = 0): array {
                $id = $item['id'] ?? ('CITA-' . ($index + 1));
                return [
                    $id,
                    $item['clinicaId'] ?? null,
                    $item['clinicaNombre'] ?? null,
                    $item['afiliadoId'] ?? null,
                    $item['pacienteNombre'] ?? ($item['nombre'] ?? null),
                    $item['cedula'] ?? null,
                    $item['codigoSeguro'] ?? null,
                    $item['fechaCita'] ?? ($item['fecha'] ?? null),
                    $item['horaCita'] ?? ($item['hora'] ?? null),
                    $item['doctor'] ?? null,
                    $item['estadoSeguro'] ?? null,
                    ars_stringify_json($item, '{}'),
                ];
            },
            'fromRow' => function (array $row): array {
                $payload = ars_parse_json((string) ($row['payload_json'] ?? '{}'), []);
                if (!is_array($payload)) {
                    $payload = [];
                }
                $payload['id'] = $payload['id'] ?? $row['id'];
                $payload['clinicaId'] = $payload['clinicaId'] ?? $row['clinica_id'];
                $payload['clinicaNombre'] = $payload['clinicaNombre'] ?? $row['clinica_nombre'];
                $payload['afiliadoId'] = $payload['afiliadoId'] ?? $row['afiliado_id'];
                $payload['pacienteNombre'] = $payload['pacienteNombre'] ?? $row['paciente_nombre'];
                $payload['cedula'] = $payload['cedula'] ?? $row['cedula'];
                $payload['codigoSeguro'] = $payload['codigoSeguro'] ?? $row['codigo_seguro'];
                $payload['fechaCita'] = $payload['fechaCita'] ?? $row['fecha_cita'];
                $payload['horaCita'] = $payload['horaCita'] ?? $row['hora_cita'];
                $payload['doctor'] = $payload['doctor'] ?? $row['doctor'];
                $payload['estadoSeguro'] = $payload['estadoSeguro'] ?? $row['estado_seguro'];
                return $payload;
            },
        ],
        'ars_pacientes_clinica' => [
            'tableName' => 'ars_pacientes_clinica',
            'columns' => ['id', 'clinica_id', 'afiliado_id', 'nombre', 'cedula', 'codigo_seguro', 'estado_seguro', 'payload_json'],
            'toRow' => function (array $item, int $index = 0): array {
                $id = $item['id'] ?? ('PAC-' . ($index + 1));
                return [
                    $id,
                    $item['clinicaId'] ?? null,
                    $item['afiliadoId'] ?? null,
                    $item['nombre'] ?? ($item['pacienteNombre'] ?? null),
                    $item['cedula'] ?? null,
                    $item['codigoSeguro'] ?? null,
                    $item['estadoSeguro'] ?? null,
                    ars_stringify_json($item, '{}'),
                ];
            },
            'fromRow' => function (array $row): array {
                $payload = ars_parse_json((string) ($row['payload_json'] ?? '{}'), []);
                if (!is_array($payload)) {
                    $payload = [];
                }
                $payload['id'] = $payload['id'] ?? $row['id'];
                $payload['clinicaId'] = $payload['clinicaId'] ?? $row['clinica_id'];
                $payload['afiliadoId'] = $payload['afiliadoId'] ?? $row['afiliado_id'];
                $payload['nombre'] = $payload['nombre'] ?? $row['nombre'];
                $payload['cedula'] = $payload['cedula'] ?? $row['cedula'];
                $payload['codigoSeguro'] = $payload['codigoSeguro'] ?? $row['codigo_seguro'];
                $payload['estadoSeguro'] = $payload['estadoSeguro'] ?? $row['estado_seguro'];
                return $payload;
            },
        ],
        'ars_pagos_mensuales' => [
            'tableName' => 'ars_pagos_mensuales',
            'columns' => ['id', 'reporte_id', 'clinica_id', 'clinica_nombre', 'periodo', 'monto', 'estado', 'fecha_envio', 'fecha_aceptacion', 'payload_json'],
            'toRow' => function (array $item, int $index = 0): array {
                $id = $item['id'] ?? ('PAG-' . ($index + 1));
                return [
                    $id,
                    $item['reporteId'] ?? null,
                    $item['clinicaId'] ?? null,
                    $item['clinicaNombre'] ?? null,
                    $item['periodo'] ?? null,
                    (float) ($item['monto'] ?? 0),
                    $item['estado'] ?? null,
                    $item['fechaEnvio'] ?? null,
                    $item['fechaAceptacion'] ?? null,
                    ars_stringify_json($item, '{}'),
                ];
            },
            'fromRow' => function (array $row): array {
                $payload = ars_parse_json((string) ($row['payload_json'] ?? '{}'), []);
                if (!is_array($payload)) {
                    $payload = [];
                }
                $payload['id'] = $payload['id'] ?? $row['id'];
                $payload['reporteId'] = $payload['reporteId'] ?? $row['reporte_id'];
                $payload['clinicaId'] = $payload['clinicaId'] ?? $row['clinica_id'];
                $payload['clinicaNombre'] = $payload['clinicaNombre'] ?? $row['clinica_nombre'];
                $payload['periodo'] = $payload['periodo'] ?? $row['periodo'];
                $payload['monto'] = $payload['monto'] ?? (float) ($row['monto'] ?? 0);
                $payload['estado'] = $payload['estado'] ?? $row['estado'];
                $payload['fechaEnvio'] = $payload['fechaEnvio'] ?? $row['fecha_envio'];
                $payload['fechaAceptacion'] = $payload['fechaAceptacion'] ?? $row['fecha_aceptacion'];
                return $payload;
            },
        ],
        'ars_reportes_clinica' => [
            'tableName' => 'ars_reportes_clinica',
            'columns' => ['id', 'clinica_id', 'clinica_nombre', 'periodo', 'estado_pago', 'total_seguro', 'total_paciente', 'monto_pagado', 'fecha_actualizacion', 'payload_json'],
            'toRow' => function (array $item, int $index = 0): array {
                $id = $item['id'] ?? ('REP-' . ($index + 1));
                return [
                    $id,
                    $item['clinicaId'] ?? null,
                    $item['clinicaNombre'] ?? null,
                    $item['periodo'] ?? null,
                    $item['estadoPago'] ?? null,
                    (float) ($item['totalSeguro'] ?? 0),
                    (float) ($item['totalPaciente'] ?? 0),
                    (float) ($item['montoPagado'] ?? 0),
                    $item['fechaActualizacion'] ?? null,
                    ars_stringify_json($item, '{}'),
                ];
            },
            'fromRow' => function (array $row): array {
                $payload = ars_parse_json((string) ($row['payload_json'] ?? '{}'), []);
                if (!is_array($payload)) {
                    $payload = [];
                }
                $payload['id'] = $payload['id'] ?? $row['id'];
                $payload['clinicaId'] = $payload['clinicaId'] ?? $row['clinica_id'];
                $payload['clinicaNombre'] = $payload['clinicaNombre'] ?? $row['clinica_nombre'];
                $payload['periodo'] = $payload['periodo'] ?? $row['periodo'];
                $payload['estadoPago'] = $payload['estadoPago'] ?? $row['estado_pago'];
                $payload['totalSeguro'] = $payload['totalSeguro'] ?? (float) ($row['total_seguro'] ?? 0);
                $payload['totalPaciente'] = $payload['totalPaciente'] ?? (float) ($row['total_paciente'] ?? 0);
                $payload['montoPagado'] = $payload['montoPagado'] ?? (float) ($row['monto_pagado'] ?? 0);
                $payload['fechaActualizacion'] = $payload['fechaActualizacion'] ?? $row['fecha_actualizacion'];
                return $payload;
            },
        ],
        'ars_facturas' => [
            'tableName' => 'ars_facturas',
            'columns' => ['id', 'clinica_id', 'clinica_nombre', 'afiliado_id', 'afiliado_nombre', 'cedula', 'autorizacion_id', 'servicio_id', 'descripcion', 'monto', 'estado', 'fecha', 'extra_json'],
            'toRow' => function (array $item): array {
                $extra = $item;
                unset($extra['id'], $extra['clinicaId'], $extra['clinicaNombre'], $extra['afiliadoId'], $extra['afiliadoNombre'], $extra['cedula'], $extra['autorizacionId'], $extra['servicioId'], $extra['descripcion'], $extra['monto'], $extra['estado'], $extra['fecha']);
                return [
                    $item['id'] ?? null,
                    $item['clinicaId'] ?? null,
                    $item['clinicaNombre'] ?? null,
                    $item['afiliadoId'] ?? null,
                    $item['afiliadoNombre'] ?? null,
                    $item['cedula'] ?? null,
                    $item['autorizacionId'] ?? null,
                    $item['servicioId'] ?? null,
                    $item['descripcion'] ?? null,
                    (float) ($item['monto'] ?? 0),
                    $item['estado'] ?? null,
                    $item['fecha'] ?? null,
                    ars_stringify_json($extra),
                ];
            },
            'fromRow' => function (array $row): array {
                return array_merge([
                    'id' => $row['id'],
                    'clinicaId' => $row['clinica_id'],
                    'clinicaNombre' => $row['clinica_nombre'],
                    'afiliadoId' => $row['afiliado_id'],
                    'afiliadoNombre' => $row['afiliado_nombre'],
                    'cedula' => $row['cedula'],
                    'autorizacionId' => $row['autorizacion_id'],
                    'servicioId' => $row['servicio_id'],
                    'descripcion' => $row['descripcion'],
                    'monto' => (float) ($row['monto'] ?? 0),
                    'estado' => $row['estado'],
                    'fecha' => $row['fecha'],
                ], ars_parse_json((string) ($row['extra_json'] ?? '{}'), []));
            },
        ],
        'ars_auditoria' => [
            'tableName' => 'ars_auditoria',
            'columns' => ['id', 'fecha', 'accion', 'usuario', 'detalle', 'extra_json'],
            'toRow' => function (array $item, int $index = 0): array {
                $extra = $item;
                unset($extra['id'], $extra['fecha'], $extra['accion'], $extra['usuario'], $extra['detalle']);
                return [
                    $item['id'] ?? ('AUD-' . ($index + 1)),
                    $item['fecha'] ?? null,
                    $item['accion'] ?? null,
                    $item['usuario'] ?? null,
                    $item['detalle'] ?? null,
                    ars_stringify_json($extra),
                ];
            },
            'fromRow' => function (array $row): array {
                return array_merge([
                    'id' => $row['id'],
                    'fecha' => $row['fecha'],
                    'accion' => $row['accion'],
                    'usuario' => $row['usuario'],
                    'detalle' => $row['detalle'],
                ], ars_parse_json((string) ($row['extra_json'] ?? '{}'), []));
            },
        ],
        'reclamaciones' => [
            'tableName' => 'reclamaciones',
            'columns' => ['id', 'afiliado_id', 'afiliado', 'cedula', 'motivo', 'detalle', 'estado', 'fecha_creacion', 'fecha_iso', 'revisado_por', 'extra_json'],
            'toRow' => function (array $item, int $index = 0): array {
                $extra = $item;
                unset($extra['id'], $extra['afiliadoId'], $extra['afiliado'], $extra['cedula'], $extra['motivo'], $extra['detalle'], $extra['estado'], $extra['fechaCreacion'], $extra['fechaISO'], $extra['revisadoPor']);
                return [
                    $item['id'] ?? ('REC-' . ($index + 1)),
                    $item['afiliadoId'] ?? null,
                    $item['afiliado'] ?? null,
                    $item['cedula'] ?? null,
                    $item['motivo'] ?? null,
                    $item['detalle'] ?? null,
                    $item['estado'] ?? null,
                    $item['fechaCreacion'] ?? null,
                    $item['fechaISO'] ?? null,
                    $item['revisadoPor'] ?? null,
                    ars_stringify_json($extra),
                ];
            },
            'fromRow' => function (array $row): array {
                return array_merge([
                    'id' => $row['id'],
                    'afiliadoId' => $row['afiliado_id'],
                    'afiliado' => $row['afiliado'],
                    'cedula' => $row['cedula'],
                    'motivo' => $row['motivo'],
                    'detalle' => $row['detalle'],
                    'estado' => $row['estado'],
                    'fechaCreacion' => $row['fecha_creacion'],
                    'fechaISO' => $row['fecha_iso'],
                    'revisadoPor' => $row['revisado_por'],
                ], ars_parse_json((string) ($row['extra_json'] ?? '{}'), []));
            },
        ],
    ];

    return $defs;
}

function ars_singleton_defs(): array
{
    static $defs = null;
    if ($defs !== null) {
        return $defs;
    }

    $defs = [
        'ars_current_user' => ['tableName' => 'ars_current_user', 'columnName' => 'payload_json'],
        'ars_cita_para_proceso' => ['tableName' => 'ars_cita_para_proceso', 'columnName' => 'payload_json'],
        'token' => ['tableName' => 'token_storage', 'columnName' => 'storage_value'],
        'usuario' => ['tableName' => 'usuario_storage', 'columnName' => 'storage_value'],
        'nombre' => ['tableName' => 'nombre_storage', 'columnName' => 'storage_value'],
    ];

    return $defs;
}

function ars_ensure_schema(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_storage (
            storage_key VARCHAR(120) NOT NULL PRIMARY KEY,
            storage_value LONGTEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS ars_citas_clinica (
            id VARCHAR(120) NOT NULL PRIMARY KEY,
            clinica_id VARCHAR(120) NULL,
            clinica_nombre VARCHAR(150) NULL,
            afiliado_id VARCHAR(120) NULL,
            paciente_nombre VARCHAR(150) NULL,
            cedula VARCHAR(20) NULL,
            codigo_seguro VARCHAR(120) NULL,
            fecha_cita VARCHAR(50) NULL,
            hora_cita VARCHAR(20) NULL,
            doctor VARCHAR(150) NULL,
            estado_seguro VARCHAR(50) NULL,
            payload_json LONGTEXT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS ars_pacientes_clinica (
            id VARCHAR(120) NOT NULL PRIMARY KEY,
            clinica_id VARCHAR(120) NULL,
            afiliado_id VARCHAR(120) NULL,
            nombre VARCHAR(150) NULL,
            cedula VARCHAR(20) NULL,
            codigo_seguro VARCHAR(120) NULL,
            estado_seguro VARCHAR(50) NULL,
            payload_json LONGTEXT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS ars_pagos_mensuales (
            id VARCHAR(120) NOT NULL PRIMARY KEY,
            reporte_id VARCHAR(120) NULL,
            clinica_id VARCHAR(120) NULL,
            clinica_nombre VARCHAR(150) NULL,
            periodo VARCHAR(20) NULL,
            monto DECIMAL(12,2) NULL,
            estado VARCHAR(50) NULL,
            fecha_envio VARCHAR(50) NULL,
            fecha_aceptacion VARCHAR(50) NULL,
            payload_json LONGTEXT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS ars_reportes_clinica (
            id VARCHAR(120) NOT NULL PRIMARY KEY,
            clinica_id VARCHAR(120) NULL,
            clinica_nombre VARCHAR(150) NULL,
            periodo VARCHAR(20) NULL,
            estado_pago VARCHAR(50) NULL,
            total_seguro DECIMAL(12,2) NULL,
            total_paciente DECIMAL(12,2) NULL,
            monto_pagado DECIMAL(12,2) NULL,
            fecha_actualizacion VARCHAR(50) NULL,
            payload_json LONGTEXT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );

    $ready = true;
}

function ars_table_exists(PDO $pdo, string $tableName): bool
{
    static $cache = [];
    if (array_key_exists($tableName, $cache)) {
        return $cache[$tableName];
    }

    $stmt = $pdo->prepare('SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?');
    $stmt->execute([$tableName]);
    $cache[$tableName] = ((int) $stmt->fetchColumn()) > 0;
    return $cache[$tableName];
}

function ars_read_array_key(PDO $pdo, string $key): ?array
{
    $defs = ars_array_defs();
    if (!isset($defs[$key])) {
        return null;
    }

    $def = $defs[$key];
    if (!ars_table_exists($pdo, $def['tableName'])) {
        return null;
    }

    $stmt = $pdo->query(sprintf('SELECT * FROM %s ORDER BY updated_at DESC', $def['tableName']));
    $rows = $stmt->fetchAll();
    $items = [];
    foreach ($rows as $row) {
        $items[] = $def['fromRow']($row);
    }

    return [
        'value' => ars_stringify_json($items, '[]'),
        'updatedAt' => $rows[0]['updated_at'] ?? null,
    ];
}

function ars_write_array_key(PDO $pdo, string $key, string $rawValue): void
{
    $defs = ars_array_defs();
    if (!isset($defs[$key])) {
        throw new RuntimeException(sprintf('La clave %s no tiene tabla SQL asignada', $key));
    }

    $def = $defs[$key];
    if (!ars_table_exists($pdo, $def['tableName'])) {
        throw new RuntimeException(sprintf('La tabla %s no existe para la clave %s', $def['tableName'], $key));
    }

    $items = ars_parse_json($rawValue, []);
    if (!is_array($items)) {
        throw new RuntimeException(sprintf('La clave %s debe contener un arreglo JSON', $key));
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec(sprintf('DELETE FROM %s', $def['tableName']));
        $insertSql = ars_build_insert_sql($def['tableName'], $def['columns']);
        $stmt = $pdo->prepare($insertSql);

        foreach (array_values($items) as $index => $item) {
            if (!is_array($item)) {
                continue;
            }
            $stmt->execute($def['toRow']($item, $index));
        }

        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        throw $error;
    }
}

function ars_clear_array_key(PDO $pdo, string $key): bool
{
    $defs = ars_array_defs();
    if (!isset($defs[$key])) {
        return false;
    }

    $def = $defs[$key];
    if (!ars_table_exists($pdo, $def['tableName'])) {
        return false;
    }

    $pdo->exec(sprintf('DELETE FROM %s', $def['tableName']));
    return true;
}

function ars_read_singleton_key(PDO $pdo, string $key): ?array
{
    $defs = ars_singleton_defs();
    if (!isset($defs[$key])) {
        return null;
    }

    $def = $defs[$key];
    if (!ars_table_exists($pdo, $def['tableName'])) {
        return null;
    }

    $stmt = $pdo->query(sprintf("SELECT * FROM %s WHERE singleton_key = 'current' LIMIT 1", $def['tableName']));
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }

    return [
        'value' => (string) $row[$def['columnName']],
        'updatedAt' => $row['updated_at'],
    ];
}

function ars_write_singleton_key(PDO $pdo, string $key, string $value): void
{
    $defs = ars_singleton_defs();
    if (!isset($defs[$key])) {
        throw new RuntimeException(sprintf('La clave %s no tiene tabla SQL asignada', $key));
    }

    $def = $defs[$key];
    if (!ars_table_exists($pdo, $def['tableName'])) {
        throw new RuntimeException(sprintf('La tabla %s no existe para la clave %s', $def['tableName'], $key));
    }

    $stmt = $pdo->prepare(sprintf(
        "INSERT INTO %s (singleton_key, %s) VALUES ('current', ?) ON DUPLICATE KEY UPDATE %s = VALUES(%s)",
        $def['tableName'],
        $def['columnName'],
        $def['columnName'],
        $def['columnName']
    ));
    $stmt->execute([$value]);
}

function ars_clear_singleton_key(PDO $pdo, string $key): bool
{
    $defs = ars_singleton_defs();
    if (!isset($defs[$key])) {
        return false;
    }

    $def = $defs[$key];
    if (!ars_table_exists($pdo, $def['tableName'])) {
        return false;
    }

    $stmt = $pdo->prepare(sprintf("DELETE FROM %s WHERE singleton_key = 'current'", $def['tableName']));
    $stmt->execute();
    return true;
}

function ars_read_key(PDO $pdo, string $key): ?array
{
    $key = ars_normalize_key($key);
    return ars_read_array_key($pdo, $key)
        ?? ars_read_singleton_key($pdo, $key);
}

function ars_write_key(PDO $pdo, string $key, string $value): void
{
    $key = ars_normalize_key($key);
    if (isset(ars_array_defs()[$key])) {
        ars_write_array_key($pdo, $key, $value);
        return;
    }

    if (isset(ars_singleton_defs()[$key])) {
        ars_write_singleton_key($pdo, $key, $value);
        return;
    }
}

function ars_clear_key(PDO $pdo, string $key): void
{
    $key = ars_normalize_key($key);
    if (ars_clear_array_key($pdo, $key)) {
        return;
    }

    if (ars_clear_singleton_key($pdo, $key)) {
        return;
    }
}

function ars_storage_snapshot(PDO $pdo, array $keys = []): array
{
    $data = [];

    if ($keys === []) {
        $keys = array_merge(array_keys(ars_array_defs()), array_keys(ars_singleton_defs()));
        $keys = array_values(array_unique($keys));
    }

    foreach ($keys as $key) {
        $payload = ars_read_key($pdo, $key);
        if ($payload !== null) {
            $data[$key] = $payload;
        }
    }

    return $data;
}
