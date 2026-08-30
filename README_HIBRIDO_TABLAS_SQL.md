# Persistencia híbrida por tablas SQL

Esta versión del backend guarda cada clave del frontend en su propia tabla MySQL.

## Tablas usadas

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
- `token_storage`
- `usuario_storage`
- `nombre_storage`

## Cómo funciona

- Si el frontend guarda un arreglo como `ars_afiliados`, el backend borra y vuelve a insertar sus filas en la tabla `ars_afiliados`.
- Cada fila conserva el objeto original en `payload_json`.
- Si el frontend guarda un valor único como `token`, `usuario`, `nombre`, `ars_current_user` o `ars_cita_para_proceso`, se guarda una sola fila activa.
- El endpoint `/api/storage/snapshot` reconstruye el `localStorage` desde esas tablas.

## Archivos a usar

- Servidor: [backend/server-relational.js](G:/Mi%20unidad/UASD/ingenieria%20de%20software/AdminLTE-4.0.0-rc7/proyectoS/backend/server-relational.js)
- Esquema SQL: [backend/schema-relational.sql](G:/Mi%20unidad/UASD/ingenieria%20de%20software/AdminLTE-4.0.0-rc7/proyectoS/backend/schema-relational.sql)
