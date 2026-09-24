# Modelo de Datos

## EventStore Collection (Append-only)
Almacena eventos inmutables.
```json
{
  "eventId": "evt-0012-abc",
  "eventType": "JournalEntryPosted",
  "aggregateId": "je-567-xyz",
  "tenantId": "tnt-01",
  "timestamp": "2026-09-22T08:30:00Z",
  "payload": {
    "journalEntryId": "je-567-xyz",
    "debits": 250000, 
    "credits": 250000,
    "signature": "usr-99",
    "fxRate": 375,
    "isReversal": false,
    "reversalOfId": null
  },
  "previousHash": "a1b2c3d4e5f6...",
  "hash": "f6e5d4c3b2a1..."
}
```

## Outbox Item
Representa un evento encolado por enviar al Event Bus.
```json
{
  "outboxId": "obx-105",
  "tenantId": "tnt-01",
  "entityId": "je-567-xyz",
  "entityType": "JournalEntry",
  "eventType": "JournalEntryPosted",
  "payload": { /* ... */ },
  "status": "PENDING", 
  "retryCount": 0,
  "createdAt": "2026-09-22T08:30:00Z"
}
```

## CQRS Balance Projection
Ejemplo de modelo de lectura desnormalizado, siempre en centavos de sol peruano.
```json
{
  "accountId": "acc-104",
  "tenantId": "tnt-01",
  "periodId": "per-2026-09",
  "balanceCents": 1500000,
  "totalDebitsCents": 500000,
  "totalCreditsCents": 100000,
  "lastEventProcessed": "evt-0012-abc",
  "updatedAt": "2026-09-22T08:30:05Z"
}
```
