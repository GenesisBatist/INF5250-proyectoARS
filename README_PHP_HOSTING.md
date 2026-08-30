# Despliegue en hosting PHP

Este proyecto ya puede funcionar sin Node.js usando la API PHP dentro de la carpeta [api](</G:/Mi unidad/UASD/ingenieria de software/AdminLTE-4.0.0-rc7/proyectoS/api>).

## Qué subir

Sube todo el proyecto al hosting, incluyendo:

- `pages/`
- `dist/`
- `widgets/`
- `api/`

La carpeta `backend/` ya no es necesaria para ejecutar la app en producción con PHP.

## Configuración de base de datos

1. Crea una base de datos MySQL en tu hosting.
2. Copia [api/.env.example](</G:/Mi unidad/UASD/ingenieria de software/AdminLTE-4.0.0-rc7/proyectoS/api/.env.example>) como `api/.env`.
3. Coloca tus credenciales reales:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=tu_base_de_datos
MYSQL_USER=tu_usuario
MYSQL_PASSWORD=tu_password
```

## Tabla usada por la API

La API PHP crea automáticamente la tabla `app_storage` si no existe, así que no necesitas correr Node ni `npm install`.

## Verificación rápida

Después de subirlo, prueba esta URL:

- `tudominio.com/ruta-del-proyecto/api/health.php`

Si todo está bien, debe responder JSON con `ok: true`.

## Migración desde `app_storage`

Si tu base vieja todavía tiene datos en `app_storage`, ejecuta una vez:

- `tudominio.com/ruta-del-proyecto/api/migrate-app-storage.php`

Ese script copia los datos de `app_storage` hacia sus tablas reales cuando el destino todavía está vacío.

## Nota importante

La aplicación sigue usando JavaScript en el navegador para la lógica de pantallas, pero la persistencia ya no depende de Node.js. Ahora debe guardar y recuperar datos desde PHP + MySQL usando tablas SQL reales, lo que sí es compatible con hosting compartido tradicional.
