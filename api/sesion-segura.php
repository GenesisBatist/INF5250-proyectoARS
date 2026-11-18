<?php
// Utilidades de sesión del servidor: expiración por inactividad, cierre de sesión y registro de eventos.
declare(strict_types=1);

const ARS_SESION_INACTIVIDAD_MAX = 1800; // 30 minutos sin actividad: la sesión expira

/** Lee un dato de texto de la sesión; devuelve '' si no existe o no es un valor simple. */
function ars_sesion_texto(string $clave): string
{
    $v = $_SESSION[$clave] ?? '';
    return is_scalar($v) ? (string) $v : '';
}

function ars_sesion_iniciar(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

/**
 * Registra un evento de sesión (login, logout, login_fallido, sesion_expirada) con usuario, rol, IP y fecha.
 * Usa una tabla propia para que el almacenamiento híbrido del navegador no la sobrescriba.
 * Nunca guarda contraseñas y nunca interrumpe el flujo si el registro falla.
 */
function ars_registrar_evento_sesion(PDO $pdo, string $evento, string $usuarioId, string $rol): void
{
    try {
        $autoinc = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite'
            ? 'INTEGER PRIMARY KEY AUTOINCREMENT'
            : 'BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY';
        $pdo->exec("CREATE TABLE IF NOT EXISTS ars_sesiones_log (
            id {$autoinc},
            fecha VARCHAR(19) NOT NULL,
            evento VARCHAR(30) NOT NULL,
            usuario_id VARCHAR(120) NULL,
            rol VARCHAR(20) NULL,
            ip VARCHAR(45) NULL
        )");
        $stmt = $pdo->prepare('INSERT INTO ars_sesiones_log (fecha, evento, usuario_id, rol, ip) VALUES (?, ?, ?, ?, ?)');
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $stmt->execute([
            date('Y-m-d H:i:s'),
            $evento,
            substr($usuarioId, 0, 120),
            substr($rol, 0, 20),
            substr(is_string($ip) ? $ip : '', 0, 45),
        ]);
    } catch (Throwable $e) {
        error_log('ars_registrar_evento_sesion: ' . $e->getMessage());
    }
}

/** Cierra la sesión del servidor y borra su cookie. */
function ars_sesion_destruir(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies') && !headers_sent()) {
        $p = session_get_cookie_params();
        $nombre = session_name();
        if ($nombre !== false) {
            setcookie($nombre, '', time() - 3600, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
    }
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
}

/**
 * Devuelve ['usuario_id' => ..., 'rol' => ...] si hay una sesión vigente; si no, null.
 *
 * @return array{usuario_id:string, rol:string}|null
 * Si la sesión llevaba más de 30 minutos sin actividad, la invalida y registra la expiración.
 */
function ars_sesion_validar(?PDO $pdo = null, ?int $ahora = null): ?array
{
    ars_sesion_iniciar();
    $ahora = $ahora ?? time();

    if (empty($_SESSION['usuario_id']) || empty($_SESSION['rol'])) {
        return null;
    }

    $ultima = (int) ars_sesion_texto('ultima_actividad') ?: (int) ars_sesion_texto('inicio');
    if ($ultima === 0 || ($ahora - $ultima) > ARS_SESION_INACTIVIDAD_MAX) {
        if ($pdo !== null) {
            ars_registrar_evento_sesion($pdo, 'sesion_expirada', ars_sesion_texto('usuario_id'), ars_sesion_texto('rol'));
        }
        ars_sesion_destruir();
        return null;
    }

    $_SESSION['ultima_actividad'] = $ahora;
    return ['usuario_id' => ars_sesion_texto('usuario_id'), 'rol' => ars_sesion_texto('rol')];
}
