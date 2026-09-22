# Modelo de Datos — 001 Ingestión de Comprobantes

**Fase 1 del plan.** Define las entidades persistidas, sus campos, validaciones, relaciones y
transiciones de estado. Los nombres de campo siguen el SDD §13 (en inglés) cuando la entidad
existe allí, según la constitución III y VII. Un ejemplo completo en JSON está en
[plan.md](plan.md#modelo-de-datos-json).

**Convenciones**:

- Montos: enteros en céntimos (`…Cents`). Tasas: enteros en milésimas (`rateMilli`). Ver R-01.
- Fechas de negocio: `YYYY-MM-DD`. Marcas de tiempo: ISO 8601 UTC.
- IDs: UUID v4. Código de seguimiento (`traceId`): UUID v4, compartido por toda la cadena de un
  comprobante (RNF-03 del SDD).
- Toda entidad por empresa lleva `tenantId` y se guarda bajo la clave
  `contableos:v1:<tenantId>:<colección>` (R-07).

---

## 1. RawPayload — Evidencia original · RF-02

Colección `rawPayloads`. **Append-only**: el repositorio no expone operaciones para actualizar
ni borrar esta colección.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `tenantId` | string | Obligatorio (RD-08) |
| `traceId` | UUID | Obligatorio, único |
| `batchId` | UUID | Lote al que llegó |
| `receivedAt` | ISO datetime | Obligatorio |
| `source` | `"UPLOAD"` \| `"SAMPLE_CATALOG"` | Origen (CA-01.3) |
| `fileName` | string | Nombre del archivo o del ejemplo |
| `contentType` | `"xml"` \| `"json"` \| `"unknown"` | Detectado por extensión y contenido |
| `sizeBytes` | int | Ver CA-01.6 |
| `content` | string | Contenido íntegro. Vacío solo si el archivo excede 1 MB (no se guarda el contenido, pero sí el registro) |
| `contentSha256` | hex | Hash del contenido, para verificar integridad |
| `outcome` | enum | `ACCEPTED` \| `DUPLICATE` \| `DUPLICATE_WITH_DIFF` \| `FAILED` \| `REJECTED_NOT_TENANT`. Se fija una sola vez al terminar de procesarlo |
| `outcomeReason` | string \| null | Motivo legible (RF-05, RF-06) |
| `duplicateOfDocumentId` | UUID \| null | Solo para duplicados (CA-03.2) |

> El resultado (`outcome`) se decide en memoria antes de la primera escritura (R-08), así que la
> evidencia se escribe **una sola vez**, completa, y nunca se modifica.

## 2. CanonicalDocument — Documento estándar · RF-03, RF-04, RF-06

Colección `documents`. Solo existe para comprobantes **aceptados**: interpretados, de la empresa
y no duplicados. En los duplicados, la comparación de totales con el original se hace en memoria;
el resultado queda en `RawPayload.outcomeReason` (por ejemplo, "Total USD 1,500.00 difiere del
original USD 1,180.00").

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `tenantId`, `traceId` | | Iguales a los de la evidencia |
| `rawPayloadRef` | UUID | FK → RawPayload |
| `deduplicationHash` | hex | SHA-256 de la clave (R-04); único por empresa en `dedupIndex` |
| `type` | `"01"` | Solo factura (fuera de alcance: 03, 07, 08) |
| `documentNumber` | string | `SERIE-NÚMERO`, normalizado |
| `issueDate` | date | Obligatorio |
| `currency` | `"PEN"` \| `"USD"` | Otras → fallido |
| `issuer` | `{ fiscalId, name }` | RUC de 11 dígitos, obligatorio |
| `receiver` | `{ fiscalId, name }` | RUC de 11 dígitos, obligatorio |
| `operationType` | `"COMPRA"` \| `"VENTA"` | Derivado (RF-06) |
| `lines` | `FinancialLine[]` | Al menos 1 |
| `taxableBaseCents` | int | Base gravada (IGV `1000`) |
| `exemptBaseCents` | int | Exonerada + inafecta (`9997`, `9998`) |
| `igvCents` | int | ≥ 0 |
| `totalCents` | int | > 0 |
| `receivedAt` | ISO datetime | |

**FinancialLine**: `{ lineNo, description, amountCents, taxCode: "IGV"|"EXO"|"INA" }`.

**Validaciones al interpretar**, en orden; la primera que falla define el motivo (RF-05):

1. Formato legible (XML bien formado o JSON válido) → si no, "El archivo está dañado o no es XML/JSON válido".
2. Tipo soportado (`Invoice` con código `01`) → "Tipo de documento no soportado en esta versión".
3. Campos obligatorios de CA-04.2 → "Falta el dato obligatorio: <campo>".
4. RUC con 11 dígitos numéricos → "RUC del <emisor|receptor> inválido".
5. Moneda PEN o USD → "Moneda no soportada: <código>".
6. Total > 0 → "Total inválido".
7. Emisor ≠ receptor → "Emisor y receptor no pueden ser la misma empresa".

## 3. JournalEntry — Asiento · RF-07 a RF-14

Colección `journalEntries`.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `tenantId`, `traceId` | | |
| `canonicalDocRef` | UUID | FK → CanonicalDocument |
| `batchId` | UUID | |
| `state` | enum | `DRAFT` \| `PENDING_INPUT` \| `PENDING_APPROVAL` \| `CANCELLED` (ver §8) |
| `operationType` | `"COMPRA"` \| `"VENTA"` | |
| `templateId` / `templateVersion` | string / int | Versión exacta usada (RD-10) |
| `issueDate` | date | Copiada del documento |
| `accountingPeriod` | `"YYYY-MM"` | Derivado de `issueDate` |
| `currency` | `"PEN"` \| `"USD"` | Moneda original |
| `fx` | `{ rateMilli, rateDate, provisional } \| null` | `null` si es PEN o no hay tasa (CA-07.5) |
| `provisionalFxRate` | bool | Igual a `fx.provisional` (nombre del SDD) |
| `lines` | `EntryLine[]` | Vacío si no se pudo construir (por ejemplo, sin tasa) |
| `pendingReasons` | `PendingReason[]` | Vacío salvo en `PENDING_INPUT` |
| `analyticTags` | `Record<string,string>` | Etiquetas del Maker (por ejemplo, `proyecto`) |
| `stagedAt` | ISO datetime \| null | Última entrada a la bandeja (antigüedad, CA-10.4) |
| `cancellation` | `{ reason, by, at } \| null` | RF-12 |
| `entityVersion` | int | Empieza en 1 y sube en cada escritura (R-09) |
| `createdBy` | userId | Maker que subió el lote |
| `createdAt` / `updatedAt` | ISO datetime | |

El SDD separa `debits` y `credits`. Aquí se usa una lista única `lines` con `side` para
conservar el orden de presentación; `debits` y `credits` se obtienen filtrando.

**EntryLine**:

| Campo | Tipo | Regla |
|---|---|---|
| `lineNo` | int | Orden |
| `side` | `"D"` \| `"H"` | Debe / Haber |
| `accountCode` | string | Debe existir en el plan contable (motivo `ACCOUNT_NOT_FOUND`) |
| `description` | string | |
| `costCenter` | string \| null | Obligatorio en las líneas de gasto y destino si la plantilla lo exige |
| `originalAmountCents` | int \| null | Monto en la moneda original (null si es PEN) |
| `functionalAmountCents` | int | Monto en PEN, > 0 |
| `role` | enum | `BASE` \| `TAX` \| `COUNTERPART` \| `DEST_DEBIT` \| `DEST_CREDIT` |

**PendingReason**: códigos estables con texto en español (RF-09):

| Código | Texto | Acciones permitidas del Maker |
|---|---|---|
| `UNBALANCED` | Descuadre | cambiar plantilla, cancelar |
| `INCONSISTENT_AMOUNTS` | Montos inconsistentes | cancelar |
| `PERIOD_CLOSED` | Periodo cerrado o no abierto | revalidar, cancelar |
| `TEMPLATE_MISMATCH` | Plantilla no corresponde | cambiar plantilla, cancelar |
| `MISSING_COST_CENTER` | Falta centro de costo | completar, cancelar |
| `ACCOUNT_NOT_FOUND` | Cuenta inexistente | cambiar plantilla, cancelar |
| `NO_FX_RATE` | Sin tipo de cambio | revalidar, cancelar |

Las acciones permitidas sobre un asiento son la **intersección** de las acciones de todos sus
motivos, más "cancelar", que siempre está disponible. Por ejemplo, un asiento con
`INCONSISTENT_AMOUNTS` solo puede cancelarse, aunque tenga otros motivos.

## 4. TemplateVersion — Plantilla contable · RF-08

Colección `templates` (por empresa). Sembrada y de solo lectura en esta funcionalidad (R-11).

| Campo | Tipo | Regla |
|---|---|---|
| `templateId` | string | Por ejemplo, `PL-02` |
| `version` | int | `1` |
| `code`, `name` | string | |
| `operationType` | `"COMPRA"` \| `"VENTA"` | Para detectar `TEMPLATE_MISMATCH` |
| `baseAccount`, `taxAccount`, `counterpartAccount` | string | Cuentas de la plantilla |
| `appliesIgv` | bool | |
| `requiresCostCenter` | bool | |
| `defaultCostCenter` | string \| null | |
| `isActive` | bool | |
| `usageCount` | int | Asientos generados con esta versión (SDD §13.3) |

Unicidad: `(tenantId, templateId, version)`.

## 5. FxRate — Tipo de cambio · RF-07

Colección global `fxRates`: `{ currency: "USD", date, rateMilli, kind: "VENTA" }`. Solo lectura.
Las reglas de resolución están en R-12.

## 6. AccountingPeriod — Periodo · RF-09

Colección `periods` (por empresa): `{ period: "YYYY-MM", status: "OPEN"|"CLOSED" }`. Todo
periodo que no esté en la colección cuenta como "no abierto". Semilla: todos los meses hasta
2026-08 `CLOSED`, 2026-09 `OPEN`.

## 7. Otras entidades

### IngestionBatch — Lote de carga · RF-01

Colección `batches`.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | |
| `tenantId` | string | Fijado al inicio del lote; no cambia si el usuario cambia de empresa |
| `createdBy` / `createdAt` | | |
| `templateId` / `templateVersion` | | Obligatorio (CA-01.2) |
| `itemCount` | int | 1 a 50 (CA-01.5) |
| `summary` | object | `{ received, accepted, duplicates, failed, rejected, pendingInput, pendingApproval }` (CA-01.4) |
| `items` | array | `{ rawPayloadId, fileName, outcome, journalEntryId? }` |

### AuditEvent — Evento de auditoría · RF-17

Colección `auditLog`. **Append-only.**

| Campo | Tipo |
|---|---|
| `id` | UUID |
| `tenantId`, `traceId` | |
| `at` | ISO datetime |
| `userId`, `role` | Actor. `SYSTEM` para los pasos automáticos del pipeline |
| `action` | enum: `RAW_RECEIVED`, `DUPLICATE_DETECTED`, `PARSE_FAILED`, `REJECTED_NOT_TENANT`, `DOCUMENT_CANONICALIZED`, `DRAFT_CREATED`, `SENT_TO_STAGING`, `STAGING_UPDATED`, `TEMPLATE_CHANGED`, `REVALIDATED`, `MOVED_TO_PENDING_APPROVAL`, `ENTRY_CANCELLED`, `ACTION_DENIED`, `INVALID_TRANSITION`, `CONFLICT`, `DEMO_RESET` |
| `entityType` / `entityId` | Objeto afectado |
| `detail` | object | Datos relevantes: motivos, antes y después, justificación |

### DemoSettings (global) · RF-18

`{ fxServiceDown: bool, latencyMs: int, perItemLatencyMs: int, session: { userId } }`.

### Meta (global)

`{ schemaVersion: 1, seededAt }`. Si falta, o el esquema no coincide, se vuelve a sembrar.

## 8. Transiciones de estado · RF-14

**Asiento (JournalEntry)**:

```
            ┌──────────── (validación OK) ───────────► PENDING_APPROVAL  (fin en esta feature)
 DRAFT ─────┤
            └──── (algún motivo) ──► PENDING_INPUT ──(cancelar)──► CANCELLED  (final)
                                         │
                                         └──(completar / cambiar plantilla / revalidar)──► DRAFT
```

- Permitidas: `DRAFT→PENDING_INPUT`, `DRAFT→PENDING_APPROVAL`, `PENDING_INPUT→DRAFT`,
  `PENDING_INPUT→CANCELLED`.
- Cualquier otra transición → error `INVALID_TRANSITION` y evento de auditoría. `DRAFT` es
  transitorio: dentro de una misma operación se valida y se resuelve, así que nunca queda
  guardado en `DRAFT`.

**Evidencia (RawPayload.outcome)**: se asigna una sola vez; no tiene transiciones.

## 9. Relaciones

```
IngestionBatch 1 ── * RawPayload 1 ── 0..1 CanonicalDocument 1 ── 0..1 JournalEntry
                                     (duplicado) ──► CanonicalDocument original
JournalEntry * ── 1 TemplateVersion
JournalEntry * ── 1 AccountingPeriod (por accountingPeriod)
AuditEvent * ── 1 traceId (agrupa toda la cadena)
```
