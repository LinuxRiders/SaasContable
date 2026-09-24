# Research: Ingestión Multiformato

**Feature**: 002-ingestion-pipeline · **Fecha**: 2026-09-22

## R-01 · Dominio puro y efectos en el servicio

- **Decisión**: la ingestión se divide en funciones puras en `src/domain/ingestion/intake/` (detectar formato, leer, construir canónico, validar identificador fiscal, calcular clave de deduplicación, decidir resultado) y un servicio (`intakeService`) que lee bytes, calcula SHA-256, persiste y publica eventos. El orquestador puro `runIntake(input, deps)` devuelve **qué** persistir (original, canónicos, registros de recepción, entradas de DLQ, eventos); el servicio lo escribe.
- **Justificación**: constitución III; permite probar el flujo completo sin navegador.
- **Alternativas**: servicio monolítico que lee y escribe mientras procesa (descartado: no probable, mezcla dominio e infraestructura).

## R-02 · Registro de lectores (Strategy)

- **Decisión**: `createReaderRegistry(readers)` con lectores `{ id, sourceFormat, canHandle(meta), read(input, context) }`. El orden de registro define la prioridad. La detección usa, en orden: firma de bytes (`%PDF`, JPEG `FF D8 FF`, PNG `89 50 4E 47`), luego el tipo MIME y luego la extensión; los textos se distinguen por su primer carácter no blanco (`<` → XML, `{` → JSON) o por la cabecera CSV del perfil. Lectores iniciales: `ublReader`, `jsonDocumentReader`, `csvReader`, `formReader` y `simulatedExtractor` (PDF e imagen).
- **Justificación**: RF-02 y FR-004; agregar un lector no toca los demás.

## R-03 · Perfiles de lectura del paquete

- **Decisión**: todo lo específico de un país para leer formatos vive en `src/data/jurisdictions/pe/readingProfiles.js` y se inyecta en los lectores:
  - `ubl`: raíces admitidas (`Invoice`, `CreditNote`, `DebitNote`), `documentTypeByOfficialCode` (`01`→`INVOICE`, `03`→`SALES_RECEIPT`, `07`→`CREDIT_NOTE`, `08`→`DEBIT_NOTE`), `fiscalIdTypeBySchemeId` (`6`→`RUC`, `1`→`DNI`, `4`→`CE`), `taxCodeBySchemeId` (`1000`→`VAT`, `2000`→`EXCISE`, `7152`→`BAG_TAX`), y el campo donde va el código de motivo de la nota (`creditNoteReason`).
  - `csv`: perfiles por id (p. ej. `PE_BOLETAS_VENTA_V1`), con columnas → rutas del canónico, tablas de códigos, parte que representa al tenant (`issuerIsTenant: true`) y separador.
  - `fiscalIdTypes` del paquete (spec 001) se amplía con `checkDigit`: `{ algorithm: 'MOD11', weights: [5,4,3,2,7,6,5,4,3,2], map: { 10: 0, 11: 1 } }` para RUC.
- **Justificación**: FR-006 y RD-14; el lector UBL es genérico (UBL 2.1), el perfil lo hace peruano.

## R-04 · Lectura de XML

- **Decisión**: el lector UBL recibe un `DOMParser` inyectado (el del navegador; en pruebas, el de `happy-dom`). Usa `getElementsByTagNameNS` con los espacios de nombres `cbc` y `cac` de UBL 2.1. Un documento con `parsererror`, o sin los elementos mínimos (ID, IssueDate, moneda, emisor), se trata como `MALFORMED`.
- **Justificación**: API nativa (constitución VI) y sin dependencias nuevas.

## R-05 · Importes

- **Decisión**: los importes externos (strings decimales en XML y CSV) se convierten a unidades mínimas con un helper genérico `parseDecimalToMinor(value, minorUnits)` en `src/domain/shared/money.js`: rechaza más decimales que los de la moneda y no usa flotantes (divide la cadena por el punto). El JSON v1 ya trae enteros en unidades mínimas. La tasa del impuesto se toma de `cbc:Percent` → `rateBp = percent × 100` (entero).
- **Justificación**: constitución II. El helper existente `parseDecimalToCents` asume 2 decimales, y este se generaliza.

## R-06 · Extractor simulado

- **Decisión**: `simulatedExtractor.read({ sha256, sourceFormat }, { fixtures, toggles, pack })` busca la huella en `DOCUMENT_FIXTURES` (`src/data/fixtures/documentFixtures.js`, generado). Si no la encuentra, o si `toggles.forceUnreadable` está activo, devuelve `UNREADABLE`. Si `toggles.forceLowConfidence` está activo, baja a 0.4 la confianza de todos los campos de importe. El resultado precalculado ya trae `document`, `fieldProvenance`, `documentTypeCode` y `documentTypeConfidence`. PDF con texto y PDF escaneado se distinguen por el `sourceFormat` del catálogo.
- **Justificación**: determinismo (constitución, "interruptores explícitos") y sustituible por un OCR real sin cambiar el resto (FR-009).

## R-07 · Almacenamiento de originales

- **Decisión**: `<tenantId>:rawPayloads` es de solo agregado (`appendOnly`). El contenido se guarda según su origen:
  - `{ kind: 'FIXTURE', url }` para los documentos de ejemplo (no se duplican bytes);
  - `{ kind: 'TEXT', text }` para XML, JSON y CSV subidos;
  - `{ kind: 'BASE64', data }` para imágenes y PDF subidos.

  Límite: 300 KB por archivo. Si `localStorage` se llena, el servicio devuelve `STORAGE_FULL` y la bitácora lo registra; el reset libera el espacio.
- **Justificación**: RD-01 dentro de las limitaciones del prototipo.

## R-08 · Deduplicación agnóstica

- **Decisión**: clave `tenantId|fiscalIdType:fiscalId del ISSUER|documentTypeCode|SERIE-NUMERO|issueDate`, donde `SERIE` = `series.trim().toUpperCase()` (vacía si no hay serie) y `NUMERO` = número sin ceros a la izquierda. La huella es el SHA-256 de la clave (Web Crypto, inyectado). El índice `<tenantId>:dedupIndex` guarda `{ [hash]: intakeRecordId }`. Dentro de un mismo lote, los documentos se procesan en orden y el índice se actualiza entre uno y otro.
- **Justificación**: RD-04 sin reglas de país; resuelve `F001-00000123` = `F001-123`.

## R-09 · Resultado de recepción

- **Decisión**: el orden de decisión es: (1) no se pudo leer → `FAILED` + DLQ; (2) la empresa no figura (salvo los tipos con `fixedPerspective: INTERNAL` cuyo emisor es la empresa) → `NOT_FOR_TENANT`; (3) huella repetida → `DUPLICATE`; (4) algún campo obligatorio del esquema con confianza bajo el umbral → `RECEIVED_NEEDS_REVIEW`; (5) en otro caso → `RECEIVED`. Las advertencias no cambian el estado: fecha futura (según el reloj inyectado) e identificador fiscal inválido (queda con confianza 0, lo que también cuenta para el punto 4). Para el punto 4, cada ruta de `fieldProvenance` se compara con los campos obligatorios del esquema (partes exigidas, cabecera obligatoria, `totals.totalMinor`).
- **Justificación**: FR-013, FR-014 y FR-016.

## R-10 · Eventos

- **Decisión**: se crea `src/services/events/eventBus.js`: emisor en memoria (`subscribe(type, handler)`, `publish(ctx, type, payload)`) que además agrega cada evento a `<tenantId>:events` con `id`, `type`, `at`, `traceId` y `payload`. Esta feature publica `RawPayloadStored`, `DocumentReceived`, `DocumentDuplicated` y `DocumentParsingFailed`. El spec 003 se suscribe a `DocumentReceived`.
- **Justificación**: SDD §6 (bus simulado = emisor en memoria + log persistido); lo reutilizan los specs 003 a 007.

## R-11 · Visualización del original

- **Decisión**: `OriginalViewer` recibe el `contentRef`: imagen → `<img>` con zoom; PDF → `<iframe>` con un blob URL; XML y JSON → texto formateado con resaltado mínimo; CSV → tabla. Para los ejemplos se usa la URL pública `/fixtures/documents/...`. Las ubicaciones de `fieldProvenance` se muestran como texto ("recuadro", "tabla fila 1"), sin coordenadas.
- **Justificación**: suficiente para que el Maker verifique contra el original (RF-20) sin librerías.

## R-12 · Documentos de prueba

- **Decisión**: los 16 documentos ya existen en `public/fixtures/documents/`, generados por `scripts/fixtures/generate-document-fixtures.mjs` desde `document-fixtures.source.mjs`, junto con el catálogo `src/data/fixtures/documentFixtures.js` (huellas, `expected` y `simulatedExtraction`). **No se regeneran** durante la implementación: si se regeneran, cambian las huellas y el catálogo se actualiza solo. Las pruebas automáticas leen los archivos con `fs` (solo en tests).
- **Justificación**: FR-021, SC-001 y reproducibilidad.

## R-13 · Formulario de registro manual

- **Decisión**: `ManualDocumentForm` se genera desde `getDocumentTypeSchema` del spec 001: cabecera, partes exigidas (el tenant se completa solo según la perspectiva), líneas (grilla que agrega y quita filas) y, para tipos con varias operaciones admitidas, un selector opcional de tipo de operación (queda como valor explícito del origen, SDD §20.4). Los importes se escriben como decimales y se convierten con `parseDecimalToMinor`. El adjunto opcional se guarda como un original aparte y se enlaza en `extraction.attachments`.
- **Justificación**: RF-18 y FR-020.

## R-14 · Permisos

- **Decisión**: nuevas operaciones en `permissions.js`: `INGEST_DOCUMENTS` y `REGISTER_MANUAL_DOCUMENT` (solo `MAKER`), `VIEW_RECEIVED_DOCUMENTS` (todos) y `SET_DEMO_TOGGLES` (todos menos `AUDITOR`).
