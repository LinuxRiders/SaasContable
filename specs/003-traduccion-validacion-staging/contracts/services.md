# Contrato: Servicios de Interpretación y Bandeja

**Feature**: 003-traduccion-validacion-staging · **Implementación**: `src/services/journal/` · **Entrada**: `src/services/journal/index.js`

Reglas comunes del spec 001 (async, `ctx`, `ok`/`fail`, `authorize`, auditoría, aislamiento). Errores nuevos: `NOT_INTERPRETABLE`, `INVALID_TRANSITION`, `CONFLICT`, `OPERATION_NOT_ALLOWED`, `REASON_REQUIRED`.

## 1. `interpretationService`

| Operación | Permiso | Descripción |
|---|---|---|
| `onDocumentReceived(event)` | (interno) | suscrito a `DocumentReceived`; llama a `interpretIntakeRecord` con el `ctx` del actor del evento |
| `interpretIntakeRecord(ctx, { intakeRecordId })` | `ACT_ON_STAGING` o interno | crea o actualiza el `JournalEntry` con `interpretForEntry`; registra el uso de plantilla si llega a `PENDING_APPROVAL` (`accountingEngine.recordTemplateUsage`); publica eventos; audita `INTERPRETATION_RUN` y `MOVED_TO_PENDING_APPROVAL` o `SENT_TO_STAGING`. Registros `DUPLICATE`, `NOT_FOR_TENANT` o `FAILED` → `NOT_INTERPRETABLE`. Tipo que no genera asiento → `IntakeRecord.processingStatus = 'ARCHIVED_REFERENCE'`, sin asiento |
| `retryEntry(ctx, { journalEntryId, entityVersion })` | `RETRY_INTERPRETATION` | vuelve a interpretar la revisión vigente |

## 2. `stagingService`

| Operación | Permiso | Entrada | Salida |
|---|---|---|---|
| `queryStaging(ctx, { reason?, documentTypeCode?, sourceFormat?, from?, to?, olderThanHours?, page?, pageSize? })` | `VIEW_STAGING` | | `{ items: [resumen: id, documento, emisor, total, motivos, antigüedad, entityVersion], total, countsByReason }` |
| `getJournalEntry(ctx, { journalEntryId })` | `VIEW_JOURNAL` | | `{ entry, document (revisión vigente), revisions: [{ revision, revisedBy, revisedAt, reason, changes }], intakeRecord, rawPayload }` |
| `listJournalEntries(ctx, { state?, from?, to?, page? })` | `VIEW_JOURNAL` | | asientos por estado (vista "Asientos") |
| `applyMakerAction(ctx, { journalEntryId, entityVersion, action })` | `ACT_ON_STAGING` (`CANCEL`: `CANCEL_ENTRY`; `proposeRule`: además `PROPOSE_CLASSIFICATION_RULE`) | acción del data-model §2 | `{ entry }` tras re-interpretar; `CONFLICT` si la versión no coincide |
| `batchApply(ctx, { items: [{ journalEntryId, entityVersion }], action })` | igual | | `{ results: [{ journalEntryId, status: 'OK' \| 'CONFLICT' \| 'ERROR', state, pendingReasons, error? }] }` |

Auditoría: `DOCUMENT_REVISED` (con `changes`), `DOCUMENT_CLASSIFIED_MANUALLY`, `LATE_REGISTRATION_CONFIRMED`, `STAGING_UPDATED`, `REVALIDATED`, `ENTRY_CANCELLED`, `CONFLICT` e `INVALID_TRANSITION`.

## 3. Permisos

| Operación | ADMIN | MAKER | CHECKER | AUDITOR |
|---|---|---|---|---|
| `VIEW_STAGING`, `VIEW_JOURNAL` | ✔ | ✔ | ✔ | ✔ |
| `ACT_ON_STAGING`, `RETRY_INTERPRETATION`, `CANCEL_ENTRY`, `PROPOSE_CLASSIFICATION_RULE` | | ✔ | | |
