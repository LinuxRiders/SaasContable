# 006 Reversiones Formales - Contratos de Servicios

## `ReversalService`

### `requestReversal(context, request)`
- **Propósito**: Generar un asiento de reversión en DRAFT.
- **Input**:
  - `context`: `{ tenantId, userId, role }`
  - `request`: `{ originalJournalEntryId, reason }`
- **Output Exitoso**:
  - `{ ok: true, data: { newJournalEntryId: "je_new123" } }`
- **Output Error**:
  - `{ ok: false, error: { code: "INVALID_STATUS", message: "Sólo se pueden revertir asientos POSTED." } }`
  - `{ ok: false, error: { code: "PERIOD_CLOSED", message: "Periodo cerrado." } }`

### `getReversalsForEntry(context, originalJournalEntryId)`
- **Propósito**: Obtener la lista de asientos de reversión asociados a un asiento original (para trazabilidad).
- **Input**:
  - `context`: `{ tenantId, userId, role }`
  - `originalJournalEntryId`: `String`
- **Output Exitoso**:
  - `{ ok: true, data: [ { JournalEntry } ] }`
