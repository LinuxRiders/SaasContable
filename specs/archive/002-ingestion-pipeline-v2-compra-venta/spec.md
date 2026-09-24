# 002-ingestion-pipeline: Capa Anti-Corrupción e Ingestión

> [!WARNING]
> **PENDIENTE DE REALINEAR CON SDD v3.0.** Este spec se escribió sobre el modelo anterior (compra/venta). No implementar hasta rehacerlo con `/speckit-specify` tomando como base el SDD v3.0 (§5, §20, §21) y el contrato del spec 001 (`specs/001-motor-plantillas-contables/contracts/`). Solo contempla XML/JSON y un `CanonicalDocument` con RUC y `FinancialLine`. Debe rehacerse con la ingestión multiformato y la extracción con confianza (RF-20, SDD §20.9), el documento canónico genérico (§13.1) y la deduplicación después del parseo (§5.3).

## Resumen
Esta especificación define la Capa Anti-Corrupción (ACL) y el Pipeline de Ingestión (Subsistema S1) para la plataforma ContableOS. Es el punto de entrada para todos los documentos transaccionales externos. La meta principal es procesar documentos de diversas fuentes (UBL/XML, JSON de APIs, Scrapers) y estandarizarlos en una representación única (`CanonicalDocument`) que el core del sistema pueda entender, manteniendo inmutabilidad estricta de la data origen.

## Requerimientos y Alineación SDD
- [RD-01] [RF-01] **Inmutabilidad del Origen:** Todo `RawPayload` ingresado se guarda en un append-only store antes de cualquier procesamiento y nunca se modifica.
- [RD-02] **Aislamiento Estructural Absoluto:** El core contable solo interactúa con `CanonicalDocument`, nunca con los formatos originales.
- [RD-04] [RF-06] **Idempotencia en Ingestión:** Cálculo de un `deduplicationHash` basado en `tenantId`, `fiscalIdEmitter`, `type`, `documentNumber` y `issueDate`.
- [RD-08] **Aislamiento Multi-Tenant:** Todos los documentos y operaciones validan y particionan por `tenantId`.
- [RD-09] [RF-12] **Consistencia de Moneda:** Resolución de tipo de cambio al momento de la fecha de emisión del documento.
- [RF-02] **Procesamiento de Documentos:** Parseo y extracción de datos del payload original.

## Eventos Emitidos [§11]
- `RawPayloadStored`: emitido cuando se guarda el payload crudo en el repositorio (trigger: paso 2 de la ingestión). Payload incluye `traceId`, `tenantId`, y `id` del raw payload.
- `DocumentDuplicated`: emitido cuando se detecta un documento duplicado (trigger: filtro de deduplicación). Payload incluye `tenantId`, `deduplicationHash`, y el ID existente.
- `DocumentParsingFailed`: emitido cuando el parser falla después de reintentos (trigger: error en parser). Payload incluye `traceId`, `tenantId`, `errorDetails` y va a DLQ.

## Historias de Usuario

### [US1] [CU-01] Subir y Estandarizar Documento (P1)
**Como** Auxiliar Contable
**Quiero** subir un documento electrónico (XML/JSON)
**Para que** el sistema lo procese y lo traduzca a un formato contable estándar.
**Criterios de Aceptación:**
- El sistema guarda el payload original sin alterar.
- El sistema detecta el tipo de documento y usa el parser adecuado (Strategy).
- Se genera un `CanonicalDocument` con los datos clave y líneas (`FinancialLine`).
- Los montos se manejan internamente en CENTAVOS.

### [US2] [CU-02] Prevención de Duplicados (P1)
**Como** Sistema de Ingestión
**Quiero** calcular un hash único de deduplicación para cada documento
**Para que** si el mismo documento es subido múltiples veces, se rechace o enlace al original sin duplicar contabilidad.
**Criterios de Aceptación:**
- El hash usa: TenantId + FiscalID (RUC emisor) + Tipo + Número + Fecha.
- Si el hash ya existe, se genera un log y se devuelve el ID del documento existente.

### [US3] [CU-04] Resolución de Tipo de Cambio (P2)
**Como** Analista Contable
**Quiero** que los documentos en moneda extranjera (ej. USD) se conviertan o tengan referencia a PEN
**Para que** los reportes contables sean consistentes.
**Criterios de Aceptación:**
- Se consulta un `IFxResolver` con la fecha de emisión del documento.
- Si el tipo de cambio no está disponible en la API/mock, se marca como `isProvisional`.

### [US4] [CU-06] Extensibilidad de Parsers (P2)
**Como** Desarrollador
**Quiero** poder registrar nuevos parsers en el `IParserRegistry`
**Para que** pueda soportar nuevos formatos (ej. Tickets de peaje) sin modificar el flujo core.
**Criterios de Aceptación:**
- Se usa el patrón Strategy y Registry.
- Agregar un parser no afecta a los demás.

### [US5] Importación Masiva (P3)
**Como** Administrador
**Quiero** subir un archivo ZIP o múltples archivos a la vez
**Para que** pueda procesar la carga inicial de meses anteriores rápidamente.
**Criterios de Aceptación:**
- La interfaz permite selección múltiple.
- Cada archivo sigue el mismo flujo de ingestión de manera independiente.
- Se muestran indicadores de éxito/fallo por archivo.

## Escenarios Especiales / Casos Límite
- **Fallo de Parseo:** Si un documento no es reconocido o está mal formado, se envía a una Dead Letter Queue (DLQ) para revisión manual.
- **Fechas Futuras:** Documentos con fechas de emisión en el futuro generan un warning, pero se ingieren.
- **Falta de Tipo de Cambio:** Si no hay tipo de cambio oficial para la fecha (ej. fines de semana o feriados), se toma el último día hábil anterior.
