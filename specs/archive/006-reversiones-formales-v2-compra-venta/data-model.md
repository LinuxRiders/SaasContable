# 006 Reversiones Formales - Modelo de Datos

## Entidad Principal Actualizada: `JournalEntry`

Añadimos nuevos campos a la estructura existente de `JournalEntry`.

```json
{
  "id": "je_123456",
  "status": "POSTED",
  "reversalOfId": "je_098765", 
  "reversalReason": "Error en digitación de importe (Factura F001-23)",
  "metadata": {
    "type": "REVERSAL",
    "originalEntryDate": "2026-09-21T10:00:00Z"
  }
}
```

- `reversalOfId`: String. Apunta al ID del asiento original. Null si es un asiento normal.
- `metadata.type`: String. "NORMAL" o "REVERSAL".

## Entidad Evento: `JournalEntryPosted`
Cuando se publica un asiento, el evento ahora incluye indicadores de reversión:

```json
{
  "eventId": "evt_xyz",
  "type": "JournalEntryPosted",
  "payload": {
    "journalEntryId": "je_123456",
    "isReversal": true,
    "reversalOfId": "je_098765"
  }
}
```
