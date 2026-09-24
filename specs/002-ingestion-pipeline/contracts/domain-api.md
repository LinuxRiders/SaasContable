# Contrato: API de Dominio de la Ingestión

**Feature**: 002-ingestion-pipeline · **Implementación**: `src/domain/ingestion/intake/` y `src/domain/shared/`

Funciones **puras**. Reciben por argumento el paquete, los perfiles, el catálogo de documentos de prueba, el reloj, el generador de IDs, el índice de huellas y el `DOMParser`. No leen almacenamiento. Ninguna contiene reglas de un país: todo eso viene de los perfiles del paquete.

## 1. Utilidades compartidas — `src/domain/shared/`

| Función | Descripción |
|---|---|
| `parseDecimalToMinor(text, minorUnits)` → `number` | `"1180.00"`, 2 → `118000`; lanza `code: 'INVALID_AMOUNT'` si hay más decimales que `minorUnits`, signo o caracteres no numéricos |
| `validateFiscalId(value, fiscalIdTypeDef)` → `{ ok, reason? }` | patrón y, si existe `checkDigit.algorithm === 'MOD11'`, dígito verificador con los pesos y el mapa del paquete |

## 2. Detección y registro — `formatDetection.js`, `readerRegistry.js`

| Función | Descripción |
|---|---|
| `detectFormat({ mimeType, fileName, headBytes, text })` → `'XML'\|'JSON'\|'CSV'\|'PDF'\|'IMAGE'\|'UNKNOWN'` | firma de bytes > MIME > extensión > primer carácter del texto (research R-02) |
| `createReaderRegistry(readers)` → `{ select(meta) }` | devuelve el primer lector cuyo `canHandle(meta)` es verdadero, o `null` |

## 3. Lectores — `readers/*.js`

Todos implementan `read(input, context)` → `{ ok: true, drafts: CanonicalDraft[], rowErrors?: RowError[] }` o `{ ok: false, errorType, errorMessage, errorDetail }`.

- `input`: `{ text?, sha256, sourceFormat, formValues? }`.
- `context`: `{ pack, profiles, tenant: { fiscalIdType, fiscalId, name }, domParser?, fixtures?, toggles?, csvProfileIds? }`.
- `CanonicalDraft`: todos los campos de `CanonicalDocument` (spec 001 §4) **excepto** `id`, `tenantId`, `rawPayloadRef`, `revision`, `deduplicationHash`, `receivedAt` y `traceId`, que agrega `buildCanonical`.

| Lector | `canHandle` | Notas |
|---|---|---|
| `ublReader` | formato `XML` | Perfil `profiles.ubl`; raíz `Invoice`/`CreditNote`/`DebitNote`; `DOMParser` inyectado; `parsererror` → `MALFORMED`; código de tipo sin mapeo → `UNKNOWN_DOCUMENT_TYPE` |
| `jsonDocumentReader` | formato `JSON` y `schema === 'contableos.document.v1'` | [document-json-v1.md](document-json-v1.md) |
| `csvReader` | formato `CSV` y cabecera igual a la de algún perfil de `csvProfileIds` | un borrador por fila; filas inválidas en `rowErrors` con `rowNumber`; cabecera sin perfil → `CSV_PROFILE_MISMATCH` con `missingColumns` |
| `formReader` | `sourceFormat === 'FORM'` | valores ya validados por el formulario; `verifiedByHuman: true` |
| `simulatedExtractor` | formato `PDF` o `IMAGE` | research R-06; huella desconocida o `forceUnreadable` → `UNREADABLE` |

## 4. Construcción y decisión — `canonicalBuilder.js`, `dedup.js`, `intakeDecision.js`

| Función | Descripción |
|---|---|
| `buildCanonical(draft, { rawPayload, rowNumber, tenantId, jurisdictionCode, documentTypeVersion, idGenerator })` → `CanonicalDocument` | completa identidad, trazabilidad y revisión 1 |
| `annotateFiscalIds(canonical, { pack })` → `{ canonical, warnings }` | valida cada parte; las inválidas quedan con `confidence: 0` en su `fieldProvenance` y la advertencia `INVALID_FISCAL_ID` |
| `buildDedupKey(tenantId, canonical)` → `string` | research R-08 |
| `decideIntake(canonical, { documentType, tenantFiscalId, dedupIndex, dedupHash, threshold, today })` → `{ status, duplicateOfIntakeRecordId, lowConfidenceFields, warnings }` | research R-09 |

## 5. Orquestación — `runIntake.js`

```text
runIntake(input, deps) → {
  rawPayload, intakeRecords[], canonicalDocuments[], dlqEntries[], dedupIndexAdditions{}, events[]
}
input = { channel, fileName, mimeType, sizeBytes, sha256, contentRef, text?, headBytes?, formValues?, sampleId? }
deps  = { tenant, empresa, pack, profiles, registry, fixtures, toggles, domParser, dedupIndex, sha256Of (async), idGenerator, clock, actor }
```

`runIntake` es `async` solo porque calcula huellas de deduplicación con `sha256Of`. No escribe nada: devuelve lo que el servicio debe persistir, en el orden en que debe hacerlo.
