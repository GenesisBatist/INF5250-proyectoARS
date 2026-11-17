<?php
// Pruebas de las utilidades de sesión (sin navegador y sin MySQL: usa una base SQLite en memoria).
//   php api\probar-sesion.php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }

ob_start(); // retiene la salida para que la sesión pueda iniciarse en la terminal
ini_set('error_log', sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sesion-pruebas.log');
ini_set('session.use_cookies', '0');
ini_set('session.save_path', sys_get_temp_dir());
require_once __DIR__ . '/sesion-segura.php';

$ok = 0; $fallos = 0;
function verificar(string $n, bool $c): void { global $ok, $fallos; echo ($c ? '[OK]    ' : '[FALLO] ') . $n . "\n"; $c ? $ok++ : $fallos++; }

$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);

ars_registrar_evento_sesion($pdo, 'login', 'USR-1', 'agente');
ars_registrar_evento_sesion($pdo, 'logout', 'USR-1', 'agente');
$filas = $pdo->query('SELECT * FROM ars_sesiones_log ORDER BY id')->fetchAll();
verificar('Se registran el inicio y el cierre de sesión con usuario y rol', count($filas) === 2 && $filas[0]['evento'] === 'login' && $filas[1]['evento'] === 'logout' && $filas[0]['usuario_id'] === 'USR-1' && $filas[0]['rol'] === 'agente');
verificar('Cada evento guarda la fecha y hora', preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $filas[0]['fecha']) === 1);

ars_sesion_iniciar();
verificar('Sin sesión iniciada no hay usuario', ars_sesion_validar($pdo) === null);

$t0 = 1_800_000_000;
$_SESSION = ['usuario_id' => 'USR-1', 'rol' => 'agente', 'inicio' => $t0, 'ultima_actividad' => $t0];
$r = ars_sesion_validar($pdo, $t0 + 600);
verificar('Una sesión con 10 minutos de inactividad sigue vigente', $r !== null && $r['usuario_id'] === 'USR-1' && $r['rol'] === 'agente');
verificar('Consultar la sesión renueva el tiempo de actividad', ($_SESSION['ultima_actividad'] ?? 0) === $t0 + 600);

$_SESSION = ['usuario_id' => 'USR-1', 'rol' => 'agente', 'inicio' => $t0, 'ultima_actividad' => $t0];
$r = ars_sesion_validar($pdo, $t0 + 1801);
verificar('Una sesión con más de 30 minutos de inactividad expira', $r === null);
verificar('La sesión expirada queda vacía (invalidada)', empty($_SESSION['usuario_id']));
$ev = $pdo->query("SELECT COUNT(*) FROM ars_sesiones_log WHERE evento = 'sesion_expirada'")->fetchColumn();
verificar('La expiración queda registrada', (int) $ev === 1);

ob_end_flush();
echo "\nResultado: $ok correctas, $fallos con fallo.\n";
exit($fallos === 0 ? 0 : 1);
