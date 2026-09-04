<?php

declare(strict_types=1);

/**
 * ============================================================
 *  Capa orientada a objetos - proyectoS (ARS/Clínicas)
 * ------------------------------------------------------------
 *  Introducida para la Actividad 1 del Entregable 1
 *  (INF-5250 Ingeniería de Software II).
 *
 *  Contiene 3 clases con relación directa entre ellas
 *  (composición vía inyección de dependencia por constructor),
 *  necesarias para poder calcular las métricas orientadas a
 *  objetos (número de clases y grado de acoplamiento) exigidas
 *  en la guía del profesor.
 *
 *  Esta capa CONVIVE con las funciones procedurales existentes
 *  en bootstrap.php (ars_pdo, ars_read_key, ars_write_key,
 *  ars_clear_key). No las reemplaza todavía: la migración
 *  completa de la lógica procedural hacia esta capa se plantea
 *  como trabajo pendiente para los incrementos de E3/E4.
 * ============================================================
 */

require_once __DIR__ . '/bootstrap.php';

/**
 * Database
 * ------------------------------------------------------------
 * Responsabilidad única: abrir y devolver la conexión PDO.
 * No depende de ninguna otra clase del proyecto (acoplamiento = 0).
 */
class Database
{
    private ?PDO $connection = null;

    public function __construct(
        private string $host,
        private string $port,
        private string $name,
        private string $user,
        private string $password
    ) {
    }

    /**
     * Crea la instancia a partir de las mismas variables de entorno
     * que ya usa ars_pdo() en bootstrap.php, para no duplicar
     * configuración.
     */
    public static function fromEnv(): self
    {
        ars_load_env_files([
            __DIR__ . '/.env',
            dirname(__DIR__) . '/.env',
        ]);

        return new self(
            ars_env('MYSQL_HOST', 'localhost'),
            ars_env('MYSQL_PORT', '3306'),
            ars_env('MYSQL_DATABASE', 'proyecto_s_hibrido'),
            ars_env('MYSQL_USER', 'root'),
            ars_env('MYSQL_PASSWORD', '')
        );
    }

    public function getConnection(): PDO
    {
        if ($this->connection instanceof PDO) {
            return $this->connection;
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $this->host,
            $this->port,
            $this->name
        );

        $this->connection = new PDO($dsn, $this->user, $this->password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        return $this->connection;
    }
}

/**
 * StorageRepository
 * ------------------------------------------------------------
 * Depende de Database (inyección de dependencia por constructor).
 * Acoplamiento = 1 (una sola clase de la que depende: Database).
 *
 * Encapsula la lectura/escritura de claves de almacenamiento,
 * reutilizando las funciones ya existentes en bootstrap.php
 * para no duplicar lógica de mapeo a tablas.
 */
class StorageRepository
{
    public function __construct(private Database $database)
    {
    }

    public function read(string $key): ?array
    {
        $pdo = $this->database->getConnection();
        return ars_read_key($pdo, $key);
    }

    public function write(string $key, string $value): void
    {
        $pdo = $this->database->getConnection();
        ars_write_key($pdo, $key, $value);
    }

    public function clear(string $key): void
    {
        $pdo = $this->database->getConnection();
        ars_clear_key($pdo, $key);
    }

    public function snapshot(array $keys = []): array
    {
        $pdo = $this->database->getConnection();
        return ars_storage_snapshot($pdo, $keys);
    }
}

/**
 * StorageController
 * ------------------------------------------------------------
 * Depende de StorageRepository (inyección de dependencia por
 * constructor). Acoplamiento = 1 (una sola clase de la que
 * depende: StorageRepository).
 *
 * Traduce una petición HTTP (ya parseada) a una operación del
 * repositorio y devuelve un arreglo listo para responder en JSON.
 * No conoce detalles de PDO ni de SQL: solo habla con el
 * repositorio.
 */
class StorageController
{
    public function __construct(private StorageRepository $repository)
    {
    }

    public function handlePost(array $body): array
    {
        $key = trim((string) ($body['key'] ?? ''));
        $value = (string) ($body['value'] ?? '');

        if ($key === '') {
            return ['ok' => false, 'message' => 'La clave es obligatoria'];
        }

        $this->repository->write($key, $value);

        return ['ok' => true, 'key' => $key];
    }

    public function handleDelete(string $key): array
    {
        $key = trim($key);

        if ($key === '') {
            return ['ok' => false, 'message' => 'La clave es obligatoria'];
        }

        $this->repository->clear($key);

        return ['ok' => true, 'key' => $key];
    }

    public function handleSnapshot(array $keys = []): array
    {
        return $this->repository->snapshot($keys);
    }
}

/*
 * ------------------------------------------------------------
 * Resumen de acoplamiento para el informe E1-A1
 * ------------------------------------------------------------
 * Clase               | Depende de           | Acoplamiento (CBO)
 * --------------------|----------------------|--------------------
 * Database            | (ninguna clase propia)|         0
 * StorageRepository    | Database             |         1
 * StorageController    | StorageRepository    |         1
 * ------------------------------------------------------------
 * Número total de clases propias introducidas: 3
 * Acoplamiento promedio = (0 + 1 + 1) / 3 = 0.67
 * ------------------------------------------------------------
 */
