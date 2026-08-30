# Backend SQL normalizado

El backend activo ahora es [backend/server-normalized.js](G:/Mi%20unidad/UASD/ingenieria%20de%20software/AdminLTE-4.0.0-rc7/proyectoS/backend/server-normalized.js).

## Qué hace

- Guarda cada clave principal en su propia tabla SQL.
- Usa columnas reales para los campos frecuentes.
- Conserva `extra_json` para compatibilidad con propiedades no modeladas todavía.
- Reconstruye el `localStorage` desde MySQL para no romper el frontend actual.

## Esquema

Ejecuta [backend/schema-normalized.sql](G:/Mi%20unidad/UASD/ingenieria%20de%20software/AdminLTE-4.0.0-rc7/proyectoS/backend/schema-normalized.sql).

## Tablas principales

- `ars_users`
- `ars_afiliados`
- `ars_clinicas`
- `ars_polizas`
- `ars_autorizaciones`
- `ars_servicios_realizados`
- `ars_servicios_clinica`
- `ars_facturas`
- `ars_auditoria`
- `reclamaciones`
- `ars_current_user`
- `ars_cita_para_proceso`
- `token_storage`
- `usuario_storage`
- `nombre_storage`
