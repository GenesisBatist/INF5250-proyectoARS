<?php
// Pruebas de PagoService desde la terminal.
//   php api\pagos\probar-servicio.php           -> pruebas sin red (cliente HTTP simulado)
//   php api\pagos\probar-servicio.php --real    -> crea un pago de prueba en Stripe (requiere STRIPE_SECRET_KEY en api\.env)
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }

ini_set('error_log', sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pagoservice-pruebas.log'); // el detalle de errores va a un archivo, no a la pantalla
require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../services/PagoService.php';

if (in_array('--real', $argv, true)) {
    ars_load_env_files([__DIR__ . '/../.env', dirname(__DIR__, 2) . '/.env']);
    $r = (new PagoService())->solicitarPago(5000, 'CLI-001', '2026-11');
    echo "Prueba real con Stripe (modo de prueba):\n";
    echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), "\n";
    exit($r['estado'] === 'creado' ? 0 : 1);
}

$ok = 0; $fallos = 0;
function verificar(string $nombre, bool $condicion): void {
    global $ok, $fallos;
    echo ($condicion ? '[OK]    ' : '[FALLO] ') . $nombre . "\n";
    $condicion ? $ok++ : $fallos++;
}

$exito = fn() => ['status' => 200, 'body' => json_encode(['id' => 'pi_prueba123', 'status' => 'requires_payment_method'])];
$rechazo = fn() => ['status' => 400, 'body' => json_encode(['error' => ['message' => 'detalle interno']])];
$caido = function () { throw new RuntimeException('sin red'); };

$r = (new PagoService($exito, 'sk_test_simulada'))->solicitarPago(5000, 'CLI-001', '2026-11');
verificar('Pago válido devuelve estado "creado" y la referencia pi_', $r['estado'] === 'creado' && $r['referencia'] === 'pi_prueba123');

$r = (new PagoService($exito, 'sk_test_simulada'))->solicitarPago(0, 'CLI-001', '2026-11');
verificar('Monto cero es rechazado como inválido', $r['estado'] === 'invalido');

$r = (new PagoService($exito, 'sk_test_simulada'))->solicitarPago(5000, '', '2026-11');
verificar('Clínica vacía es rechazada como inválida', $r['estado'] === 'invalido');

$r = (new PagoService($exito, 'sk_test_simulada'))->solicitarPago(5000, 'CLI-001', '11/2026');
verificar('Período con formato incorrecto es rechazado', $r['estado'] === 'invalido');

$r = (new PagoService($exito, ''))->solicitarPago(5000, 'CLI-001', '2026-11');
verificar('Sin clave configurada devuelve "fallido"', $r['estado'] === 'fallido');

$r = (new PagoService($rechazo, 'sk_test_simulada'))->solicitarPago(5000, 'CLI-001', '2026-11');
verificar('Rechazo del proveedor devuelve "fallido" sin exponer detalles internos', $r['estado'] === 'fallido' && !str_contains(json_encode($r), 'detalle interno'));

$r = (new PagoService($caido, 'sk_test_simulada'))->solicitarPago(5000, 'CLI-001', '2026-11');
verificar('Falla de red devuelve "fallido" sin lanzar excepción', $r['estado'] === 'fallido');

$visto = '';
$espia = function (string $url, array $cab, string $cuerpo) use (&$visto) { $visto = $url . "\n" . implode("\n", $cab) . "\n" . $cuerpo; return ['status' => 200, 'body' => json_encode(['id' => 'pi_x'])]; };
(new PagoService($espia, 'sk_test_simulada'))->solicitarPago(5000, 'CLI-001', '2026-11');
verificar('La solicitud usa HTTPS, Bearer y envía monto, moneda y referencia', str_starts_with($visto, 'https://api.stripe.com/v1/payment_intents') && str_contains($visto, 'Bearer ') && str_contains($visto, 'amount=5000') && str_contains($visto, 'currency=usd') && str_contains($visto, 'metadata%5Bclinica%5D=CLI-001'));

echo "\nResultado: $ok correctas, $fallos con fallo.\n";
exit($fallos === 0 ? 0 : 1);
