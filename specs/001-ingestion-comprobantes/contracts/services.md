# Contrato: Servicios Mock de Ingestión

Es la "API" que consume la UI (constitución I). Todas las operaciones son asíncronas: devuelven
una Promise, aplican la latencia simulada (R-14) y reflejan los contratos abstractos del SDD §12.
Cambiar a un backend real significa reimplementar estas operaciones con el mismo contrato.

## Convenciones

- **Contexto obligatorio**: el primer argumento de toda operación es
  `ctx = { tenantId, userId, role }`. Si falta, o el `tenantId` no es una empresa conocida, la
  operación responde `VALIDATION_ERROR`.
- **Éxito**: la Promise se resuelve con `{ ok: true, data }`.
- **Error**: la Promise se resuelve (no se rechaza) con `{ ok: false, error: { code, message, details } }`.
  `message` está en español y es apto para mostrar al usuario (RNF-05).
- **Autorización**: cada operación valida el rol en el servicio, aunque la UI oculte el botón.
  Una denegación responde `FORBIDDEN` y registra el evento `ACTION_DENIED` (RF-15, RNF-04).
- **Aislamiento**: una operación solo lee y escribe datos del `ctx.tenantId`. Si un id pertenece
  a otra empresa, responde `NOT_FOUND`, nunca `FORBIDDEN`, para no revelar su existencia (RF-16).

## Códigos de error

| Código | Cuándo |
|---|---|
| `VALIDATION_ERROR` | Entrada inválida (falta la plantilla, lote vacío, justificación corta, contexto inválido) |
| `BATCH_TOO_LARGE` | Más de 50 comprobantes (CA-01.5) |
| `FORBIDDEN` | El rol no puede ejecutar la acción (RF-15) |
| `NOT_FOUND` | El id no existe en la empresa activa |
| `CONFLICT` | `expectedVersion` desactualizado (CA-11.6) |
| `INVALID_TRANSITION` | Transición de estado no permitida (RF-14, CA-12.2, CA-12.3) |
| `ACTION_NOT_ALLOWED_FOR_REASON` | La acción no está permitida por los motivos del asiento (por ejemplo, completar con `INCONSISTENT_AMOUNTS`) |
| `STORAGE_FULL` | El almacenamiento del navegador está lleno (R-07) |

## Matriz de permisos · RF-15

| Operación | MAKER | CHECKER | AUDITOR | ADMIN_PLANTILLAS / SOPORTE |
|---|:-:|:-:|:-:|:-:|
| `listTemplates`, `listSampleCatalog` | ✔ | — | ✔ | — |
| `ingestBatch` | ✔ | — | — | — |
| `getBatch`, `listBatches`, `queryIntakeResults` | ✔ | — | ✔ | — |
| `queryStaging`, `getJournalEntry` | ✔ | — | ✔ | — |
| `updateStagingEntries`, `revalidateEntries`, `cancelEntry` | ✔ | — | — | — |
| `queryPendingApproval` | ✔ | ✔ | ✔ | — |
| `getTraceability`, `getRawPayload` | ✔ | ✔¹ | ✔ | — |
| `getDemoSettings`, `setFxServiceDown`, `resetDemoData`, `setSessionUser` | ✔ | ✔ | ✔ | ✔ |

¹ El Checker solo puede consultar la trazabilidad de asientos en `PENDING_APPROVAL`.
Los controles de demostración no son acciones de negocio; los puede usar cualquier rol.

---

## Operaciones

### Catálogos

**`listTemplates(ctx)`** · RF-08
→ `data: TemplateVersion[]` (las plantillas activas de la empresa).

**`listSampleCatalog(ctx)`** · RF-01, CA-18.4
→ `data: { sampleId, title, expectedOutcome, fileName, contentType }[]`
`expectedOutcome` describe el resultado esperado para la demo (por ejemplo, "Duplicado con
diferencias").

### Ingestión · RF-01 a RF-09, RF-16, RF-17

**`ingestBatch(ctx, { templateId, items })`**

- `items`: 1 a 50 elementos, cada uno
  `{ source: "UPLOAD", fileName, sizeBytes, content } | { source: "SAMPLE_CATALOG", sampleId }`.
- Errores de lote, que no procesan nada: sin `templateId` o plantilla inexistente →
  `VALIDATION_ERROR`; `items` vacío → `VALIDATION_ERROR`; más de 50 → `BATCH_TOO_LARGE`; rol
  distinto de MAKER → `FORBIDDEN`.
- Los comprobantes se procesan en orden. Un fallo individual no detiene el lote (RNF-03). Si un
  mismo lote trae dos comprobantes con la misma clave, el segundo queda como duplicado
  (CA-03.5).
- El `ctx.tenantId` se toma al inicio y se usa para todo el lote.
- → `data: IngestionBatch`, con `summary` e `items[]`. Cada item incluye `{ fileName, outcome,
  outcomeReason, traceId, journalEntryId?, entryState?, pendingReasons? }`.

**`getBatch(ctx, { batchId })`** / **`listBatches(ctx, { limit })`** → `IngestionBatch` / `IngestionBatch[]`.

**`queryIntakeResults(ctx, { outcome?, from?, to?, page, pageSize })`** · RF-03, RF-05, RF-06
Lista la evidencia recibida, filtrable por resultado (`FAILED`, `DUPLICATE`,
`DUPLICATE_WITH_DIFF`, `REJECTED_NOT_TENANT`, `ACCEPTED`).
→ `data: { items: { rawPayloadId, traceId, receivedAt, fileName, outcome, outcomeReason, duplicateOfDocumentId }[], total }`.

**`getRawPayload(ctx, { rawPayloadId })`** · CA-02.4 → `RawPayload` con el contenido íntegro.

### Bandeja · RF-10, RF-11, RF-12

**`queryStaging(ctx, { reason?, operationType?, from?, to?, currency?, overdueOnly?, page, pageSize })`**
→ `data: { items: StagingRow[], total }`. Cada `StagingRow` tiene:
`{ id, traceId, operationType, counterpartyName, documentNumber, issueDate, totalCents, currency, pendingReasons, stagedAt, ageHours, overdue, allowedActions, entityVersion }`.
`overdue` es verdadero si `ageHours > 48` (CA-10.4).

**`getJournalEntry(ctx, { id })`** · CA-10.3
→ `{ entry: JournalEntry, document: CanonicalDocument, rawPayloadId }`.

**`updateStagingEntries(ctx, { updates })`** · CA-11.1 a CA-11.6

- `updates`: `{ id, expectedVersion, costCenter?, analyticTags?, templateId? }[]`.
- Campos prohibidos (montos, cuentas, fecha, datos del comprobante) → `VALIDATION_ERROR`
  (CA-11.4).
- Por cada asiento: se verifica el estado `PENDING_INPUT`, la versión y que la acción esté
  permitida por sus motivos. Luego se regenera el asiento con la plantilla vigente (o la nueva),
  se aplican centro de costo y etiquetas, y se valida (RF-09).
- → `data: { results: { id, status: "ADVANCED"|"STILL_PENDING"|"CONFLICT"|"ERROR", entryState, pendingReasons, error? }[] }` (CA-11.5).
  El resultado de cada asiento es independiente.

**`revalidateEntries(ctx, { items: { id, expectedVersion }[] })`** · CA-11.7
Igual que la operación anterior, sin cambios de datos. Vuelve a resolver el tipo de cambio y el
periodo.

**`cancelEntry(ctx, { id, expectedVersion, reason })`** · RF-12

- `reason` de menos de 10 caracteres (sin contar espacios al inicio y al final) →
  `VALIDATION_ERROR`.
- Asiento que no está en `PENDING_INPUT` → `INVALID_TRANSITION`.
- → `data: JournalEntry` en `CANCELLED`.

### Pendientes de aprobación · RF-13

**`queryPendingApproval(ctx, { provisionalOnly?, page, pageSize })`**
→ `data: { items: { id, traceId, operationType, counterpartyName, documentNumber, issueDate, totalCents, functionalTotalCents, currency, provisionalFxRate, requiresHumanReview }[], total }`.
`requiresHumanReview` es igual a `provisionalFxRate` (CA-13.2). Esta funcionalidad no expone
ninguna operación que pase un asiento al Libro Diario (CA-13.3).

### Trazabilidad · RF-17

**`getTraceability(ctx, { traceId })`**
→ `data: { rawPayload, document?, entry?, template?, events: AuditEvent[] }`, con los eventos
ordenados por fecha ascendente (CA-17.2).

### Demo · RF-18

- **`getDemoSettings(ctx)`** → `DemoSettings` más `storageUsageBytes`.
- **`setFxServiceDown(ctx, { down })`** (CA-18.3).
- **`setSessionUser(ctx, { userId })`**: cambia el usuario simulado.
- **`resetDemoData(ctx)`** (CA-18.2): borra **todas** las colecciones `contableos:v1:*` y vuelve
  a sembrar. Es la única excepción a la regla append-only, porque reinicia la demo completa, no
  modifica registros. Deja un evento `DEMO_RESET` en el log nuevo.
