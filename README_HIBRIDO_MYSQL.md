# Modo híbrido `localStorage` + MySQL

Este proyecto ahora puede trabajar en modo híbrido:

- La interfaz sigue leyendo y escribiendo en `localStorage`.
- Cada cambio importante también se sincroniza hacia MySQL.
- Cuando la aplicación inicia, intenta hidratar `localStorage` con lo que exista en MySQL.
- Si el backend no está disponible, la app sigue funcionando en modo local.

## 1. Crear la base de datos

Ejecuta el script:

```sql
SOURCE backend/schema.sql;
```

O crea manualmente la tabla `app_storage`.

## 2. Configurar el backend

En la carpeta [backend/.env.example](G:/Mi unidad/UASD/ingenieria de software/AdminLTE-4.0.0-rc7/proyectoS/backend/.env.example) crea un archivo `.env` con tus credenciales de MySQL.

## 3. Instalar dependencias

```bash
cd backend
npm install
```

## 4. Ejecutar el backend

```bash
cd backend
npm start
```

El backend quedará en `http://localhost:5000`.

## 5. Qué datos se sincronizan

Se replican estas claves:

- `ars_users`
- `ars_afiliados`
- `ars_clinicas`
- `ars_polizas`
- `ars_autorizaciones`
- `ars_servicios_realizados`
- `ars_servicios_clinica`
- `ars_facturas`
- `ars_auditoria`
- `ars_current_user`
- `ars_cita_para_proceso`
- `reclamaciones`
- `token`
- `usuario`
- `nombre`

## Observación

En esta primera fase, MySQL funciona como persistencia central tipo snapshot por clave. Eso permite migrar sin romper el código existente. Luego podemos hacer una segunda fase y pasar esas estructuras a tablas relacionales reales como `afiliados`, `clinicas`, `polizas`, `facturas` y `autorizaciones`.
