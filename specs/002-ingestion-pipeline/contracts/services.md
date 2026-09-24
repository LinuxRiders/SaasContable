# Contrato: Servicios Mock de Ingestión

**Feature**: 002-ingestion-pipeline · **Implementación**: `src/services/ingestion/intakeService.js` y `src/services/events/eventBus.js` · **Entrada**: `src/services/ingestion/index.js`

Reglas comunes: iguales a las del [spec 001](../001-motor-plantillas-contables/contracts/services.md) (`async`, `ctx` primero, `ok`/`fail`, `authorize`, auditoría por escritura, aislamiento por tenant). Códigos de error nuevos: `PAYLOAD_TOO_LARGE`, `EMPTY_FILE`, `STORAGE_FULL`.

## 1. `intakeService`

| Operación | Permiso | Entrada | Salida |
|---|---|---|---|
| `ingestFiles(ctx, { files })` | `INGEST_DOCUMENTS` | `files: [{ name, type, size, arrayBuffer: () => Promise<ArrayBuffer> }]` (los `File` del navegador cumplen esta forma) | `{ batchId, results: [{ fileName, rawPayloadId, records: IntakeRecord[], dlqEntryIds }], summary: { received, needsReview, duplicates, notForTenant, failed } }` |
| `ingestSample(ctx, { sampleId })` | `INGEST_DOCUMENTS` | `DOC-01` … `DOC-15` | igual que un archivo (descarga la URL pública y sigue el mismo camino; `contentRef` = `FIXTURE`) |
| `registerManualDocument(ctx, { documentTypeCode, operationTypeCode?, values, attachment? })` | `REGISTER_MANUAL_DOCUMENT` | valores del formulario (importes como decimales en texto) | `IntakeRecord` |
| `listReceivedDocuments(ctx, { status?, sourceFormat?, documentTypeCode?, from?, to?, page?, pageSize? })` | `VIEW_RECEIVED_DOCUMENTS` | | `{ items: [IntakeRecord + resumen del canónico (emisor, serie-número, total)], total }` |
| `getReceivedDocument(ctx, { intakeRecordId })` | `VIEW_RECEIVED_DOCUMENTS` | | `{ intakeRecord, canonical, rawPayload (sin contenido), duplicateOf? }` |
| `getOriginalContent(ctx, { rawPayloadId })` | `VIEW_RECEIVED_DOCUMENTS` | | `{ kind: 'URL', url }`, `{ kind: 'TEXT', text, mimeType }` o `{ kind: 'DATA_URL', dataUrl }` |
| `listSampleCatalog(ctx)` | `VIEW_RECEIVED_DOCUMENTS` | | `DOCUMENT_FIXTURES` sin `simulatedExtraction` (id, título, formato, url, `expected`) |
| `listDlqEntries(ctx, { status? })` | `VIEW_RECEIVED_DOCUMENTS` | | `DlqEntry[]` (lectura básica; la gestión es del spec 007) |
| `getExtractionToggles(ctx)` / `setExtractionToggles(ctx, { forceLowConfidence, forceUnreadable })` | `VIEW_RECEIVED_DOCUMENTS` / `SET_DEMO_TOGGLES` | | toggles en `demoSettings.extraction` |

Comportamiento:

1. Valida tamaño (`EMPTY_FILE`, `PAYLOAD_TOO_LARGE` > 300 KB) **antes** de guardar.
2. Calcula el SHA-256 del contenido (`serviceKit.sha256` sobre los bytes).
3. Guarda el `RawPayload` con `appendOnly` y publica `RawPayloadStored`.
4. Ejecuta `runIntake` y persiste en este orden: canónicos, registros de recepción, entradas de DLQ, adiciones al índice de huellas y eventos.
5. Registra en la bitácora: `RAW_RECEIVED`, `DOCUMENT_CANONICALIZED`, `DUPLICATE_DETECTED`, `REJECTED_NOT_TENANT`, `PARSE_FAILED` y `MANUAL_DOCUMENT_REGISTERED`.
6. En un lote, procesa los archivos en orden; el error de uno no detiene a los demás.

## 2. `eventBus` (`src/services/events/eventBus.js`)

| Función | Descripción |
|---|---|
| `publish(ctx, type, payload, { traceId })` | agrega a `<tenantId>:events` y notifica a los suscriptores de `type` (en microtarea; los errores de un suscriptor se registran y no afectan al publicador) |
| `subscribe(type, handler)` → `unsubscribe` | handler `(event) => void \| Promise<void>` |
| `listEvents(ctx, { type?, limit? })` | lectura del log (permiso `VIEW_RECEIVED_DOCUMENTS`) |

## 3. Permisos

| Operación | ADMIN | MAKER | CHECKER | AUDITOR |
|---|---|---|---|---|
| `INGEST_DOCUMENTS`, `REGISTER_MANUAL_DOCUMENT` | | ✔ | | |
| `VIEW_RECEIVED_DOCUMENTS` | ✔ | ✔ | ✔ | ✔ |
| `SET_DEMO_TOGGLES` | ✔ | ✔ | ✔ | |
