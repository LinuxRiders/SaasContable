# Modelo de Datos: Journal Entry y Staging

## Enum: JournalState
```javascript
const JournalState = {
  CANONICAL_EXTRACTED: 'CANONICAL_EXTRACTED', // From SDD 10.2
  DRAFT: 'DRAFT', // Transitorio durante evaluación
  PENDING_INPUT: 'PENDING_INPUT', // Staging: Requiere Maker
  PENDING_APPROVAL: 'PENDING_APPROVAL', // Listo para Checker
  POSTED: 'POSTED',
  POSTED_PENDING_PUBLISH: 'POSTED_PENDING_PUBLISH',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};
```

## Entidad: JournalEntry
Ubicación: `src/domain/ingestion/journalEntry.js`

```javascript
{
  id: "uuid",
  tenantId: "uuid",
  canonicalDocRef: "uuid",
  state: "PENDING_INPUT", // JournalState
  templateVersionRef: "uuid", // Versión de AST usada
  debits: [ EntryLine ],
  credits: [ EntryLine ],
  reversalOfId: "uuid | null",
  provisionalFxRate: 3.75, // Decimal, si aplica
  issueDate: "2026-09-22",
  accountingPeriod: "2026-09",
  entityVersion: 1, // Concurrencia optimista
  createdBy: "system | userId",
  approvedBy: "userId | null",
  signatureRef: "string | null",
  signedAt: "iso-date | null",
  createdAt: "iso-date",
  updatedAt: "iso-date",
  traceId: "uuid"
}
```

## Value Object: EntryLine
```javascript
{
  accountCode: "10111",
  amount: 10000, // En CENTAVOS (ej. 100.00)
  currency: "PEN",
  fxRate: 1.0, // Tasa usada para esta línea específica
  functionalAmount: 10000, // En CENTAVOS (moneda funcional)
  costCenter: "CC-01 | null",
  analyticTags: {
    "project": "PRJ-X"
  } // object | null
}
```
