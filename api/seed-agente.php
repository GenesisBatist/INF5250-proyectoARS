<?php
// Uso (una sola vez, desde la terminal):  php api\seed-agente.php <usuario> <contraseña> "<nombre>"
// Crea o actualiza un agente con la contraseña guardada como hash. No deja contraseñas escritas en el código.
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require_once __DIR__ . '/bootstrap.php';

[$script, $usuario, $clave, $nombre] = array_pad($argv, 4, '');
if ($usuario === '' || strlen($clave) < 8) {
    fwrite(STDERR, "Uso: php api\\seed-agente.php <usuario> <contraseña de 8+ caracteres> \"<nombre>\"\n");
    exit(1);
}

$pdo = ars_pdo();
$hash = password_hash($clave, PASSWORD_DEFAULT);
$existe = $pdo->prepare("SELECT id FROM ars_users WHERE username = ? AND rol = 'agente'");
$existe->execute([$usuario]);
$id = $existe->fetchColumn();

if ($id) {
    $pdo->prepare('UPDATE ars_users SET password = ?, activo = 1 WHERE id = ?')->execute([$hash, $id]);
    echo "Agente actualizado: $usuario\n";
} else {
    $pdo->prepare("INSERT INTO ars_users (id, username, password, rol, nombre, activo, extra_json) VALUES (?, ?, ?, 'agente', ?, 1, '{}')")
        ->execute(['USR-' . time(), $usuario, $hash, $nombre !== '' ? $nombre : $usuario]);
    echo "Agente creado: $usuario\n";
}
