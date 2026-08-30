-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         5.7.9 - MySQL Community Server (GPL)
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.1.0.6537
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para proyecto_s_hibrido
DROP DATABASE IF EXISTS `proyecto_s_hibrido`;
CREATE DATABASE IF NOT EXISTS `proyecto_s_hibrido` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `proyecto_s_hibrido`;

-- Volcando estructura para tabla proyecto_s_hibrido.ars_afiliados
DROP TABLE IF EXISTS `ars_afiliados`;
CREATE TABLE IF NOT EXISTS `ars_afiliados` (
  `id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afiliado` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cedula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `poliza_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `poliza` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_registro` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_creacion` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_estado` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_afiliados: ~1 rows (aproximadamente)
DELETE FROM `ars_afiliados`;
INSERT INTO `ars_afiliados` (`id`, `nombre`, `afiliado`, `cedula`, `telefono`, `correo`, `direccion`, `poliza_id`, `poliza`, `estado`, `usuario`, `password`, `fecha_registro`, `fecha_creacion`, `fecha_nacimiento`, `fecha_estado`, `extra_json`, `updated_at`) VALUES
	('AFI-001', 'Mario Alberto c', 'Mario Alberto c', '22400401950', '1234534534', NULL, NULL, 'POL-001', 'POL-001', 'activo', NULL, '123456', '2026-04-06T19:28:35.799Z', '2026-04-06T19:28:35.799Z', '2026-04-06', '2026-04-06', '{}', '2026-04-15 21:38:46');

-- Volcando estructura para tabla proyecto_s_hibrido.ars_auditoria
DROP TABLE IF EXISTS `ars_auditoria`;
CREATE TABLE IF NOT EXISTS `ars_auditoria` (
  `id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accion` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detalle` text COLLATE utf8mb4_unicode_ci,
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_auditoria: ~13 rows (aproximadamente)
DELETE FROM `ars_auditoria`;
INSERT INTO `ars_auditoria` (`id`, `fecha`, `accion`, `usuario`, `detalle`, `extra_json`, `updated_at`) VALUES
	('AUD-1', '6/4/2026, 15:29:34', 'Registrar clínica', 'Administrador ARS', 'Clínica kk', '{}', '2026-04-15 21:36:37'),
	('AUD-1775503715800', '6/4/2026, 3:28:35 p. m.', 'Crear afiliado', 'Administrador ARS', 'Se registró el afiliado Mario Alberto (22400401950)', '{}', '2026-04-15 21:36:37'),
	('AUD-1775503811314', '6/4/2026, 3:30:11 p. m.', 'Editar afiliado', 'Administrador ARS', 'Se actualizó el afiliado Mario Alberto c (22400401950)', '{}', '2026-04-15 21:36:37'),
	('AUD-1775504141670', '6/4/2026, 3:35:41 p. m.', 'Agendar paciente clínica', 'creal', 'Se agendó a Mario Alberto c (AFI-001) para 2026-04-06 15:35', '{}', '2026-04-15 21:36:57'),
	('AUD-1775504183723', '6/4/2026, 3:36:23 p. m.', 'Registrar proceso clínico', 'creal', 'Consulta general / Mario Alberto c / modalidad seguro', '{}', '2026-04-15 21:37:01'),
	('AUD-1776274951122', '15/4/2026, 1:42:31 p. m.', 'Editar afiliado', 'Administrador ARS', 'Se actualizó el afiliado Mario Alberto (22400401950)', '{}', '2026-04-15 21:36:37'),
	('AUD-1776279676795', '15/4/2026, 3:01:16 p. m.', 'Agendar paciente clínica', 'clinica real', 'Se agendó a Mario Alberto (AFI-001) para 2026-04-15 14:00', '{}', '2026-04-15 21:36:37'),
	('AUD-1776279745738', '15/4/2026, 3:02:25 p. m.', 'Enviar pago a clínica', 'Administrador ARS', 'Pago PAG-001 enviado a clinica real por RD$ 30,000.00', '{}', '2026-04-15 21:36:37'),
	('AUD-1776279774482', '15/4/2026, 3:02:54 p. m.', 'Aceptar pago de clínica', 'clinica real', 'La clínica aceptó el pago PAG-001 por RD$ 30,000.00', '{}', '2026-04-15 21:36:37'),
	('AUD-1776279881237', '15/4/2026, 3:04:41 p. m.', 'Editar afiliado', 'Administrador ARS', 'Se actualizó el afiliado Mario Alberto c (22400401950)', '{}', '2026-04-15 21:36:37'),
	('AUD-1776288973071', '15/4/2026, 5:36:13 p. m.', 'Editar afiliado', 'Administrador ARS', 'Se actualizó el afiliado Mario Alberto 1 (22400401950)', '{}', '2026-04-15 21:36:37'),
	('AUD-1776288996022', '15/4/2026, 5:36:36 p. m.', 'Editar afiliado', 'Administrador ARS', 'Se actualizó el afiliado Mario Alberto c (22400401950)', '{}', '2026-04-15 21:36:37'),
	('AUD-2', '6/4/2026, 15:36:23', 'Crear autorización', 'creal', 'AUTORIZACION-001 para Mario Alberto c - Consulta general', '{}', '2026-04-15 21:37:05');

-- Volcando estructura para tabla proyecto_s_hibrido.ars_autorizaciones
DROP TABLE IF EXISTS `ars_autorizaciones`;
CREATE TABLE IF NOT EXISTS `ars_autorizaciones` (
  `id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `afiliado_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afiliado_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cedula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `poliza_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clinica_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clinica_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `servicio` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doctor` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `especialidad` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prioridad` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_servicio` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `diagnostico` text COLLATE utf8mb4_unicode_ci,
  `observacion_medica` text COLLATE utf8mb4_unicode_ci,
  `monto_estimado` decimal(12,2) DEFAULT NULL,
  `monto_cubierto` decimal(12,2) DEFAULT NULL,
  `porcentaje_cobertura` decimal(6,2) DEFAULT NULL,
  `creado_por_rol` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modalidad_pago` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auto_generada` tinyint(1) NOT NULL DEFAULT '0',
  `afiliado_activo` tinyint(1) NOT NULL DEFAULT '0',
  `cobertura_disponible` tinyint(1) NOT NULL DEFAULT '0',
  `estado` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comentario_agente` text COLLATE utf8mb4_unicode_ci,
  `fecha_solicitud` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_decision` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_creacion` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_autorizaciones: ~3 rows (aproximadamente)
DELETE FROM `ars_autorizaciones`;
INSERT INTO `ars_autorizaciones` (`id`, `afiliado_id`, `afiliado_nombre`, `cedula`, `poliza_id`, `clinica_id`, `clinica_nombre`, `servicio`, `doctor`, `especialidad`, `prioridad`, `fecha_servicio`, `diagnostico`, `observacion_medica`, `monto_estimado`, `monto_cubierto`, `porcentaje_cobertura`, `creado_por_rol`, `modalidad_pago`, `auto_generada`, `afiliado_activo`, `cobertura_disponible`, `estado`, `comentario_agente`, `fecha_solicitud`, `fecha_decision`, `fecha_creacion`, `extra_json`, `updated_at`) VALUES
	('AUTORIZACION-001', 'AFI-001', 'Mario Alberto c', '22400401950', 'POL-001', 'CLI-001', 'clinica real', 'Consulta general', 'sdasdad', NULL, NULL, '2026-04-06', 'asasdas', 'asasdas', 15000.00, 15000.00, 100.00, 'clinica', 'seguro', 1, 1, 1, 'aprobada', 'Autorización generada automáticamente por la clínica con cobertura válida.', '6/4/2026, 15:36:23', '6/4/2026, 15:36:23', '2026-04-06T19:36:23.296Z', '{}', '2026-04-15 21:37:36'),
	('AUTORIZACION-002', 'AFI-001', 'Mario Alberto', '22400401950', 'POL-001', 'CLI-001', 'clinica real', 'Consulta general', 'mariana', NULL, NULL, '2026-04-15', 'nistido', 'nistido', 15000.00, 15000.00, 100.00, 'clinica', 'seguro', 1, 1, 1, 'aprobada', 'Autorización generada automáticamente por la clínica con cobertura válida.', '15/4/2026, 3:01:59 p. m.', '15/4/2026, 3:01:59 p. m.', '2026-04-15T19:01:59.643Z', '{}', '2026-04-15 19:04:08'),
	('AUTORIZACION-003', 'AFI-001', 'Mario Alberto', '22400401950', 'POL-001', 'CLI-001', 'clinica real', 'Consulta general', 'mariana', NULL, NULL, '2026-04-15', 'nisitod', 'nisitod', 50000.00, 15000.00, 100.00, 'clinica', 'seguro', 1, 1, 1, 'aprobada', 'Autorización generada automáticamente por la clínica con cobertura válida.', '15/4/2026, 3:04:05 p. m.', '15/4/2026, 3:04:05 p. m.', '2026-04-15T19:04:05.923Z', '{}', '2026-04-15 19:04:08');

-- Volcando estructura para tabla proyecto_s_hibrido.ars_cita_para_proceso
DROP TABLE IF EXISTS `ars_cita_para_proceso`;
CREATE TABLE IF NOT EXISTS `ars_cita_para_proceso` (
  `singleton_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`singleton_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_cita_para_proceso: ~0 rows (aproximadamente)
DELETE FROM `ars_cita_para_proceso`;

-- Volcando estructura para tabla proyecto_s_hibrido.ars_clinicas
DROP TABLE IF EXISTS `ars_clinicas`;
CREATE TABLE IF NOT EXISTS `ars_clinicas` (
  `id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rnc` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_registro` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_clinicas: ~1 rows (aproximadamente)
DELETE FROM `ars_clinicas`;
INSERT INTO `ars_clinicas` (`id`, `nombre`, `rnc`, `telefono`, `direccion`, `usuario`, `password`, `estado`, `fecha_registro`, `extra_json`, `updated_at`) VALUES
	('CLI-001', 'clinica real', '65756756756', '5675675675', 'romulo betancourt', 'creal', '123456', 'activa', '2026-04-06T19:29:34.834Z', '{}', '2026-04-15 21:38:46');

-- Volcando estructura para tabla proyecto_s_hibrido.ars_current_user
DROP TABLE IF EXISTS `ars_current_user`;
CREATE TABLE IF NOT EXISTS `ars_current_user` (
  `singleton_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`singleton_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_current_user: ~0 rows (aproximadamente)
DELETE FROM `ars_current_user`;
INSERT INTO `ars_current_user` (`singleton_key`, `payload_json`, `updated_at`) VALUES
	('current', '{"id":"USR-ADMIN","username":"admin","password":"admin123","rol":"agente","nombre":"Administrador ARS","referenciaId":null,"activo":true,"codigoSeguro":null,"cedula":null}', '2026-04-15 17:49:02');

-- Volcando estructura para tabla proyecto_s_hibrido.ars_facturas
DROP TABLE IF EXISTS `ars_facturas`;
CREATE TABLE IF NOT EXISTS `ars_facturas` (
  `id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clinica_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clinica_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afiliado_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afiliado_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cedula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `autorizacion_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `servicio_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `monto` decimal(12,2) DEFAULT NULL,
  `estado` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_facturas: ~0 rows (aproximadamente)
DELETE FROM `ars_facturas`;

-- Volcando estructura para tabla proyecto_s_hibrido.ars_polizas
DROP TABLE IF EXISTS `ars_polizas`;
CREATE TABLE IF NOT EXISTS `ars_polizas` (
  `id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_plan` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre_plan` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto_maximo` decimal(12,2) DEFAULT NULL,
  `maximo_anual` decimal(12,2) DEFAULT NULL,
  `consumido_anual` decimal(12,2) DEFAULT NULL,
  `estado` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cobertura_json` longtext COLLATE utf8mb4_unicode_ci,
  `coberturas_json` longtext COLLATE utf8mb4_unicode_ci,
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_polizas: ~2 rows (aproximadamente)
DELETE FROM `ars_polizas`;
INSERT INTO `ars_polizas` (`id`, `tipo_plan`, `nombre_plan`, `monto_maximo`, `maximo_anual`, `consumido_anual`, `estado`, `cobertura_json`, `coberturas_json`, `extra_json`, `updated_at`) VALUES
	('POL-001', 'basico', 'Plan Basico Familiar', 15000.00, 0.00, 0.00, 'activa', '["Consulta general","Emergencia","Laboratorio"]', '[{"servicio":"Consulta general","porcentaje":100,"tope":0},{"servicio":"Emergencia","porcentaje":100,"tope":0},{"servicio":"Laboratorio","porcentaje":100,"tope":0}]', '{}', '2026-04-06 19:27:31'),
	('POL-002', 'premium', 'Plan Premium Integral', 75000.00, 0.00, 0.00, 'activa', '["Consulta general","Emergencia","Laboratorio","Cirugia ambulatoria","Rayos X","Sonografia","Internamiento"]', '[{"servicio":"Consulta general","porcentaje":100,"tope":0},{"servicio":"Emergencia","porcentaje":100,"tope":0},{"servicio":"Laboratorio","porcentaje":100,"tope":0},{"servicio":"Cirugia ambulatoria","porcentaje":100,"tope":0},{"servicio":"Rayos X","porcentaje":100,"tope":0},{"servicio":"Sonografia","porcentaje":100,"tope":0},{"servicio":"Internamiento","porcentaje":100,"tope":0}]', '{}', '2026-04-06 19:27:31');

-- Volcando estructura para tabla proyecto_s_hibrido.ars_servicios_clinica
DROP TABLE IF EXISTS `ars_servicios_clinica`;
CREATE TABLE IF NOT EXISTS `ars_servicios_clinica` (
  `id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `autorizacion_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clinica_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clinica_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afiliado_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afiliado_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cedula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo_seguro` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `servicio` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modalidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_realizada` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `costo_final` decimal(12,2) DEFAULT NULL,
  `monto_seguro` decimal(12,2) DEFAULT NULL,
  `diferencia` decimal(12,2) DEFAULT NULL,
  `doctor` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observacion` text COLLATE utf8mb4_unicode_ci,
  `estado_autorizacion` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comentario_autorizacion` text COLLATE utf8mb4_unicode_ci,
  `facturable` tinyint(1) NOT NULL DEFAULT '1',
  `fecha_creacion` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_servicios_clinica: ~3 rows (aproximadamente)
DELETE FROM `ars_servicios_clinica`;
INSERT INTO `ars_servicios_clinica` (`id`, `autorizacion_id`, `clinica_id`, `clinica_nombre`, `afiliado_id`, `afiliado_nombre`, `cedula`, `codigo_seguro`, `servicio`, `modalidad`, `fecha_realizada`, `costo_final`, `monto_seguro`, `diferencia`, `doctor`, `observacion`, `estado_autorizacion`, `comentario_autorizacion`, `facturable`, `fecha_creacion`, `extra_json`, `updated_at`) VALUES
	('SER-1775504183723', 'AUTORIZACION-001', 'CLI-001', 'creal', 'AFI-001', 'Mario Alberto c', '22400401950', 'AFI-001', 'Consulta general', 'seguro', '2026-04-06', 15000.00, 15000.00, 0.00, 'sdasdad', 'asasdas', 'aprobada', 'Autorización generada automáticamente por la clínica con cobertura válida.', 1, '2026-04-06T19:36:23.723Z', '{}', '2026-04-15 19:04:08'),
	('SER-1776279719645', 'AUTORIZACION-002', 'CLI-001', 'clinica real', 'AFI-001', 'Mario Alberto', '22400401950', 'AFI-001', 'Consulta general', 'seguro', '2026-04-15', 15000.00, 15000.00, 0.00, 'mariana', 'nistido', 'aprobada', 'Autorización generada automáticamente por la clínica con cobertura válida.', 1, '2026-04-15T19:01:59.645Z', '{}', '2026-04-15 19:04:08'),
	('SER-1776279845924', 'AUTORIZACION-003', 'CLI-001', 'clinica real', 'AFI-001', 'Mario Alberto', '22400401950', 'AFI-001', 'Consulta general', 'seguro', '2026-04-15', 50000.00, 15000.00, 35000.00, 'mariana', 'nisitod', 'aprobada', 'Autorización generada automáticamente por la clínica con cobertura válida.', 1, '2026-04-15T19:04:05.924Z', '{}', '2026-04-15 19:04:08');

-- Volcando estructura para tabla proyecto_s_hibrido.ars_servicios_realizados
DROP TABLE IF EXISTS `ars_servicios_realizados`;
CREATE TABLE IF NOT EXISTS `ars_servicios_realizados` (
  `id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `autorizacion_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clinica_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clinica_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afiliado_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afiliado_nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cedula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `servicio` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doctor` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `fecha_servicio` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_servicios_realizados: ~0 rows (aproximadamente)
DELETE FROM `ars_servicios_realizados`;

-- Volcando estructura para tabla proyecto_s_hibrido.ars_users
DROP TABLE IF EXISTS `ars_users`;
CREATE TABLE IF NOT EXISTS `ars_users` (
  `id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rol` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `codigo_seguro` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cedula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.ars_users: ~4 rows (aproximadamente)
DELETE FROM `ars_users`;
INSERT INTO `ars_users` (`id`, `username`, `password`, `rol`, `nombre`, `referencia_id`, `activo`, `codigo_seguro`, `cedula`, `extra_json`, `updated_at`) VALUES
	('USR-1775503715800', 'AFI-001', '123456', 'afiliado', 'Mario Alberto c', 'AFI-001', 1, NULL, '22400401950', '{"afiliado":"Mario Alberto c","telefono":"1234534534","fechaNacimiento":"2026-04-06"}', '2026-04-15 21:38:46'),
	('USR-1775503774834-963', 'creal', '123456', 'clinica', 'clinica real', 'CLI-001', 1, NULL, NULL, '{}', '2026-04-15 21:38:46'),
	('USR-ADMIN', 'admin', 'admin123', 'agente', 'Administrador ARS', NULL, 1, NULL, NULL, '{}', '2026-04-15 21:38:46'),
	('USR-AGENTE-001', 'agente1', '1234', 'agente', 'Ana Rodriguez', NULL, 1, NULL, NULL, '{}', '2026-04-15 21:38:46');

-- Volcando estructura para tabla proyecto_s_hibrido.nombre_storage
DROP TABLE IF EXISTS `nombre_storage`;
CREATE TABLE IF NOT EXISTS `nombre_storage` (
  `singleton_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_value` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`singleton_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.nombre_storage: ~0 rows (aproximadamente)
DELETE FROM `nombre_storage`;

-- Volcando estructura para tabla proyecto_s_hibrido.reclamaciones
DROP TABLE IF EXISTS `reclamaciones`;
CREATE TABLE IF NOT EXISTS `reclamaciones` (
  `id` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `afiliado_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `afiliado` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cedula` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motivo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detalle` text COLLATE utf8mb4_unicode_ci,
  `estado` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_creacion` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_iso` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revisado_por` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_json` longtext COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.reclamaciones: ~1 rows (aproximadamente)
DELETE FROM `reclamaciones`;
INSERT INTO `reclamaciones` (`id`, `afiliado_id`, `afiliado`, `cedula`, `motivo`, `detalle`, `estado`, `fecha_creacion`, `fecha_iso`, `revisado_por`, `extra_json`, `updated_at`) VALUES
	('REC-001', 'AFI-001', 'Mario Alberto', '22400401950', 'Cobertura', 'quiero una explicacion', 'aprobada', '15/4/2026, 3:00:04 p. m.', '2026-04-15T19:00:04.929Z', 'Administrador ARS', '{"fechaRevision":"15/4/2026, 3:05:21 p. m."}', '2026-04-15 19:05:21');

-- Volcando estructura para tabla proyecto_s_hibrido.token_storage
DROP TABLE IF EXISTS `token_storage`;
CREATE TABLE IF NOT EXISTS `token_storage` (
  `singleton_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_value` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`singleton_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.token_storage: ~0 rows (aproximadamente)
DELETE FROM `token_storage`;

-- Volcando estructura para tabla proyecto_s_hibrido.usuario_storage
DROP TABLE IF EXISTS `usuario_storage`;
CREATE TABLE IF NOT EXISTS `usuario_storage` (
  `singleton_key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_value` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`singleton_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla proyecto_s_hibrido.usuario_storage: ~0 rows (aproximadamente)
DELETE FROM `usuario_storage`;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
