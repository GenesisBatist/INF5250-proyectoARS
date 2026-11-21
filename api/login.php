<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/sesion-segura.php';

ars_handle_cors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    ars_send_json(['success' => false, 'message' => 'Método no permitido'], 405);
}

$body = ars_read_json_body();
$rol = is_string($body['rol'] ?? null) ? $body['rol'] : '';
$usuario = is_string($body['username'] ?? null) ? trim($body['username']) : '';
$password = is_string($body['password'] ?? null) ? $body['password'] : '';

// Mensaje general: nunca revela si falló el usuario, la contraseña o el rol.
function ars_login_fail(): never
{
    global $usuario, $rol;
    try {
        ars_registrar_evento_sesion(ars_pdo(), 'login_fallido', $usuario, $rol); // solo usuario y rol; jamás la contraseña
    } catch (Throwable $e) {
        error_log('login.php: ' . $e->getMessage());
    }
    usleep(300000); // pequeña espera para frenar intentos repetidos
    ars_send_json(['success' => false, 'message' => 'Credenciales inválidas'], 401);
}

if (!in_array($rol, ['agente', 'afiliado', 'clinica', 'proveedor'], true) || $usuario === '' || $password === '') {
    ars_login_fail();
}

try {
    $pdo = ars_pdo();
    $defs = ars_array_defs();

    if ($rol === 'agente') {
        $stmt = $pdo->prepare("SELECT * FROM ars_users WHERE rol = 'agente' AND username = ? AND activo = 1 LIMIT 1");
        $stmt->execute([$usuario]);
        $tabla = 'ars_users';
    } elseif ($rol === 'clinica') {
        $stmt = $pdo->prepare("SELECT * FROM ars_clinicas WHERE LOWER(usuario) = LOWER(?) AND LOWER(estado) IN ('activa', 'activo') LIMIT 1");
        $stmt->execute([$usuario]);
        $tabla = 'ars_clinicas';
    } elseif ($rol === 'proveedor') {
        ars_ensure_tablas_proveedores($pdo);
        $stmt = $pdo->prepare("SELECT * FROM ars_proveedores WHERE LOWER(usuario) = LOWER(?) AND LOWER(estado) IN ('activa', 'activo') LIMIT 1");
        $stmt->execute([$usuario]);
        $tabla = 'ars_proveedores';
    } else {
        $digitos = preg_replace('/\D/', '', $usuario) ?? '';
        $stmt = $pdo->prepare("SELECT * FROM ars_afiliados WHERE (UPPER(id) = UPPER(?) OR (? <> '' AND REPLACE(cedula, '-', '') = ?)) AND LOWER(estado) = 'activo' LIMIT 1");
        $stmt->execute([$usuario, $digitos, $digitos]);
        $tabla = 'ars_afiliados';
    }

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!is_array($row)) {
        ars_login_fail();
    }

    $guardada = is_string($row['password'] ?? null) ? $row['password'] : '';
    $esHash = $guardada !== '' && password_get_info($guardada)['algo'] !== null;

    if ($esHash) {
        $ok = password_verify($password, $guardada);
        $rehacer = $ok && password_needs_rehash($guardada, PASSWORD_DEFAULT);
    } else {
        // Contraseña antigua en texto plano: se acepta una sola vez y se convierte en hash.
        $ok = $guardada !== '' && hash_equals($guardada, $password);
        $rehacer = $ok;
    }

    if (!$ok) {
        ars_login_fail();
    }

    if ($rehacer) {
        $upd = $pdo->prepare("UPDATE {$tabla} SET password = ? WHERE id = ?");
        $upd->execute([password_hash($password, PASSWORD_DEFAULT), $row['id']]);
    }

    $registro = $defs[$tabla]['fromRow']($row);
    unset($registro['password']);

    ars_sesion_iniciar();
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = $registro['id'];
    $_SESSION['rol'] = $rol;
    $_SESSION['inicio'] = time();
    $_SESSION['ultima_actividad'] = time();
    ars_registrar_evento_sesion($pdo, 'login', (string) $registro['id'], $rol);

    ars_send_json(['success' => true, 'rol' => $rol, 'registro' => $registro]);
} catch (Throwable $e) {
    error_log('login.php: ' . $e->getMessage()); // el detalle queda en el log, no en la respuesta
    ars_send_json(['success' => false, 'message' => 'No se pudo iniciar sesión. Intente de nuevo.'], 500);
}
