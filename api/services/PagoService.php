<?php
// Servicio de integración con Stripe (modo de prueba). RF-16: la ARS solicita el pago mensual a la clínica.
// La clave secreta se lee de la variable de entorno STRIPE_SECRET_KEY; nunca se escribe en el código ni en el repositorio.
declare(strict_types=1);

final class PagoService
{
    private const ENDPOINT = 'https://api.stripe.com/v1/payment_intents';
    private const MONEDA = 'usd';
    private const MONTO_MINIMO_CENTAVOS = 50;          // mínimo aceptado por Stripe
    private const MONTO_MAXIMO_CENTAVOS = 99999999;

    /** @var callable(string, array<int,string>, string): array{status:int, body:string} */
    private $http;
    private ?string $clave;

    /**
     * @param callable|null $http  Cliente HTTP inyectable (para pruebas sin red). Si es null se usa cURL.
     * @param string|null   $clave Clave secreta; si es null se toma de STRIPE_SECRET_KEY.
     */
    public function __construct(?callable $http = null, ?string $clave = null)
    {
        $this->http = $http ?? [self::class, 'enviarConCurl'];
        $this->clave = $clave ?? (getenv('STRIPE_SECRET_KEY') ?: null);
    }

    /**
     * Solicita a Stripe la creación de un pago de prueba.
     *
     * @return array{estado:string, referencia?:string, estadoProveedor?:string, motivo?:string}
     */
    public function solicitarPago(int $montoCentavos, string $clinicaId, string $periodo): array
    {
        $clinicaId = trim($clinicaId);
        $periodo = trim($periodo);

        if ($montoCentavos < self::MONTO_MINIMO_CENTAVOS || $montoCentavos > self::MONTO_MAXIMO_CENTAVOS
            || $clinicaId === '' || strlen($clinicaId) > 120
            || preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $periodo) !== 1) {
            return ['estado' => 'invalido', 'motivo' => 'Datos del pago no válidos.'];
        }

        if ($this->clave === null || $this->clave === '') {
            return ['estado' => 'fallido', 'motivo' => 'Servicio de pagos no configurado.'];
        }

        $datos = http_build_query([
            'amount' => $montoCentavos,
            'currency' => self::MONEDA,
            'automatic_payment_methods' => ['enabled' => 'true'],
            'metadata' => ['clinica' => $clinicaId, 'periodo' => $periodo],
        ]);

        try {
            $resp = ($this->http)(self::ENDPOINT, ['Authorization: Bearer ' . $this->clave], $datos);
        } catch (Throwable $e) {
            error_log('PagoService: error de comunicación con el proveedor.');
            return ['estado' => 'fallido', 'motivo' => 'No fue posible comunicarse con el proveedor de pagos.'];
        }

        $pago = json_decode($resp['body'], true);
        if ($resp['status'] !== 200 || !is_array($pago) || !isset($pago['id'])) {
            error_log('PagoService: respuesta no exitosa del proveedor (HTTP ' . $resp['status'] . ').');
            return ['estado' => 'fallido', 'motivo' => 'El proveedor de pagos rechazó la solicitud.'];
        }

        return [
            'estado' => 'creado',
            'referencia' => is_scalar($pago['id']) ? (string) $pago['id'] : '',
            'estadoProveedor' => is_scalar($pago['status'] ?? null) ? (string) $pago['status'] : '',
        ];
    }

    /**
     * @param array<int,string> $cabeceras
     * @return array{status:int, body:string}
     */
    private static function enviarConCurl(string $url, array $cabeceras, string $cuerpo): array
    {
        if (!function_exists('curl_init')) {
            throw new RuntimeException('La extensión cURL no está habilitada.');
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => $cabeceras,
            CURLOPT_POSTFIELDS => $cuerpo,
        ]);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body === false) {
            throw new RuntimeException('Fallo de red.');
        }
        return ['status' => $status, 'body' => (string) $body];
    }
}
