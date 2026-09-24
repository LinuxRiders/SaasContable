# Contrato: Dominio y Servicios de Aprobación

**Feature**: 004-doa-aprobacion-checker

## 1. Dominio — `src/domain/approval/` (puro)

| Función | Descripción |
|---|---|
| `buildApprovalContext(entry, { document, periods })` | objeto `approval.*` de research R-01 |
| `decideApproval(entry, { matrix, document, periods, now })` → `ApprovalDecision` | matriz → nivel máximo → piso del sistema (R-02) |
| `compareLevels(a, b)` → `-1 \| 0 \| 1` | orden de R-03 |
| `canApprove(entry, { approverId, matrix, uploaderIds, now })` → `{ ok, reason: 'INSUFFICIENT_LEVEL' \| 'SEGREGATION_OF_DUTIES' \| null, exceptionId }` | nivel + SoD (R-04) |
| `contentForSignature(entry)` → `string` · `buildSignature({ entry, signerId, role, level, signedAt, sha256 })` → `Promise<Signature>` · `verifySignature(entry, signature, sha256)` → `Promise<boolean>` | R-05 |
| `diffMatrix(prev, next)` → `string[]` | reglas agregadas, quitadas o cambiadas; cambios de niveles y excepciones |

Extensión del spec 001: `evaluateExpression(node, { document, line, extra })` admite rutas `approval.*` leídas de `extra.approval`; `validateExpression` acepta `approval.*` cuando `allowApprovalContext: true`.

## 2. Servicios — `src/services/approval/` y `src/services/posting/`

| Operación | Permiso | Descripción |
|---|---|---|
| `onReadyForApproval(event)` | interno | suscrito a `JournalEntryDrafted`: decide, guarda y, si es STP, firma y llama a `postEntry` (R-06) |
| `queryPendingApproval(ctx, { level?, canApprove?, page? })` | `VIEW_APPROVALS` | asientos `PENDING_APPROVAL` con decisión, total, marcas y `canApprove` para el usuario |
| `approveEntry(ctx, { journalEntryId, entityVersion })` | `APPROVE` | valida versión, período (RD-12), nivel y SoD → firma → `postEntry`; errores `CONFLICT`, `PERIOD_CLOSED`, `INSUFFICIENT_LEVEL`, `SEGREGATION_OF_DUTIES` (todos auditados) |
| `rejectEntry(ctx, { journalEntryId, entityVersion, reason })` | `REJECT` | `REASON_REQUIRED` sin motivo; `REJECTED` + `JournalEntryRejected` |
| `retryBlockedStp(ctx)` | interno / `SET_DEMO_TOGGLES` | firma los bloqueados por `SIGNING_SERVICE_DOWN` |
| `getDoaMatrix(ctx)` / `listDoaMatrixVersions(ctx)` | `VIEW_DOA_MATRIX` | |
| `saveDoaMatrix(ctx, { expectedVersion, matrix })` | `EDIT_DOA_MATRIX` | valida expresiones (`BOOL`, contexto de aprobación) y niveles; nueva versión con diff; auditoría `DOA_MATRIX_SAVED` |
| `setSigningServiceDown(ctx, { down })` | `SET_DEMO_TOGGLES` | al pasar a `false`, ejecuta `retryBlockedStp` |
| `postEntry(ctx, { entry, signature })` (`postingService`) | interno | R-07: `PENDING_APPROVAL → POSTED` + `JournalEntryPosted` |
| `reinterpretRejected(ctx, { journalEntryId })` (`stagingService`) | `REINTERPRET_REJECTED` | R-08 |

Auditoría nueva: `APPROVAL_DECIDED`, `ENTRY_SIGNED`, `ENTRY_REJECTED`, `APPROVAL_DENIED` (con motivo), `DOA_MATRIX_SAVED`, `STP_BLOCKED` y `ENTRY_POSTED`.
