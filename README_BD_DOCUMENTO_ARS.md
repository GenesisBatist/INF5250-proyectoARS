# Base de datos normalizada segun el documento

Se agrego el esquema [`backend/schema-doc-normalized.sql`](G:/Mi%20unidad/UASD/ingenieria%20de%20software/AdminLTE-4.0.0-rc7/proyectoS/backend/schema-doc-normalized.sql) tomando como base el modelo del documento entregado.

## Entidades principales

- `Usuario`
- `Clinica`
- `Plan`
- `Cobertura`
- `Afiliado`
- `Afiliado_Plan_Historial`
- `Cita_Clinica`
- `Autorizacion`
- `Servicio_Clinico`
- `Factura_Clinica`
- `Reclamacion`
- `Pago_Mensual_Clinica`
- `Reporte`
- `Cierre_Clinica`
- `Auditoria_Sistema`

## Relaciones incluidas

- `Plan 1:N Afiliado`
- `Plan 1:N Cobertura`
- `Afiliado 1:N Autorizacion`
- `Afiliado 1:N Reclamacion`
- `Afiliado 1:N Cita_Clinica`
- `Clinica 1:N Cita_Clinica`
- `Clinica 1:N Autorizacion`
- `Clinica 1:N Servicio_Clinico`
- `Clinica 1:N Factura_Clinica`
- `Clinica 1:N Pago_Mensual_Clinica`
- `Clinica 1:N Reporte`
- `Autorizacion 1:N Servicio_Clinico`
- `Factura_Clinica 1:N Reclamacion`
- `Reporte 1:N Pago_Mensual_Clinica`
- `Usuario 1:N Autorizacion`
- `Usuario 1:N Reclamacion`
- `Usuario 1:N Pago_Mensual_Clinica`
- `Usuario 1:N Reporte`
- `Usuario 1:N Auditoria_Sistema`

## Cambios de compatibilidad

- Se ampliaron las claves sincronizadas en [`dist/js/hybrid-storage.js`](G:/Mi%20unidad/UASD/ingenieria%20de%20software/AdminLTE-4.0.0-rc7/proyectoS/dist/js/hybrid-storage.js) para incluir:
  - `ars_citas_clinica`
  - `ars_pagos_mensuales`
  - `ars_reportes_clinica`

## Siguiente paso recomendado

1. Ejecutar `backend/schema-doc-normalized.sql` en MySQL.
2. Completar el mapper del backend para que cada clave de `localStorage` escriba directamente en estas tablas nuevas.
3. Migrar los datos actuales desde las tablas `ars_*` viejas hacia las tablas normalizadas del documento.



