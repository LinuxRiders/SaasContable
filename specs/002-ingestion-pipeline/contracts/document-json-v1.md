# Contrato: Documento JSON `contableos.document.v1`

**Feature**: 002-ingestion-pipeline · **Lector**: `jsonDocumentReader`

Contrato público, **independiente del país**, para que un sistema externo envíe un documento ya estructurado. Los importes son **enteros en unidades mínimas** de la moneda (p. ej. céntimos) y las tasas van en puntos básicos. Ejemplos reales: `public/fixtures/documents/06-recibo-honorarios.json`, `07-resumen-planilla.json` y `15-nota-credito-sin-referencia.json`.

```json
{
  "schema": "contableos.document.v1",
  "jurisdiction": "PE",
  "documentType": "PROFESSIONAL_FEE_RECEIPT",
  "officialCode": null,
  "operationTypeCode": null,
  "series": "E001",
  "number": "45",
  "issueDate": "2026-09-20",
  "dueDate": null,
  "currency": "PEN",
  "parties": [
    { "role": "ISSUER", "fiscalIdType": "RUC", "fiscalId": "10400000005", "name": "PÉREZ QUISPE JUAN (DEMO)", "countryCode": "PE" },
    { "role": "RECEIVER", "fiscalIdType": "RUC", "fiscalId": "20450656934", "name": "PACHATUSANTREK SAC", "countryCode": "PE" }
  ],
  "fields": { "serviceDescription": "Asesoría contable", "grossAmountMinor": 150000, "costCenter": "CC-ADMIN" },
  "lines": [],
  "taxes": [],
  "withholdings": [ { "withholdingCode": "INCOME_TAX_FEES", "baseMinor": 150000, "rateBp": 800, "amountMinor": 12000 } ],
  "references": [],
  "totals": { "netMinor": 150000, "taxMinor": 0, "withheldMinor": 12000, "totalMinor": 150000, "payableMinor": 138000 }
}
```

## Reglas de lectura

| Regla | Resultado si falla |
|---|---|
| `schema` = `contableos.document.v1` | `UNSUPPORTED_FORMAT` (otro lector podría aceptarlo) |
| `jurisdiction` = jurisdicción de la empresa | `UNKNOWN_DOCUMENT_TYPE` |
| `documentType` (código genérico del catálogo) **o** `officialCode` (se traduce con el perfil) existe y está vigente | `UNKNOWN_DOCUMENT_TYPE` |
| `currency` existe en `currencies.js` | `UNKNOWN_CURRENCY` |
| JSON válido y con `series`/`number`/`issueDate`/`parties` presentes | `MALFORMED` |
| Importes enteros ≥ 0 | `MALFORMED` |

- Los campos faltantes **no** se inventan. Un campo obligatorio del esquema ausente lo detecta la validación del spec 003 (`SCHEMA_INVALID`).
- `operationTypeCode` explícito se conserva como "valor del origen" (SDD §20.4).
- `fieldProvenance` = un registro por campo presente, con `confidence: 1`.
