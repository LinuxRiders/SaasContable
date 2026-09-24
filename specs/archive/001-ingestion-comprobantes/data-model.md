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
| `templateId` / `templateVersion` | string / int | Versión exacta usada (RD-10). Al recalcular se actualiza a la versión activa vigente (R-24) |
| `appliedRules` | `{ scope: "DOCUMENT"\|"LINE", ruleId, ruleName, lineNo? }[]` | Reglas que aplicaron (CA-20.4) |
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
| `accountCode` | string | Debe existir en el catálogo de la empresa (`ACCOUNT_NOT_FOUND`) y ser de uso (`ACCOUNT_NOT_POSTABLE`) |
| `description` | string | |
| `costCenter` | string \| null | Obligatorio si la cuenta de la línea lo exige, o si la plantilla lo exige y la línea es de gasto o destino (`MISSING_COST_CENTER`). Prioridad: el de la regla que aplicó, el por defecto de la plantilla y luego el `amarre3` de la cuenta base (CA-08.4, R-16) |
| `originalAmountCents` | int \| null | Monto en la moneda original (null si es PEN) |
| `functionalAmountCents` | int | Monto en PEN, > 0 |
| `role` | enum | `BASE` \| `TAX` \| `COUNTERPART` \| `DEST_DEBIT` \| `DEST_CREDIT` |
| `ruleId` | string \| null | Regla que decidió la línea; `null` si se usó el valor por defecto (CA-20.4) |
| `sourceLineNos` | int[] | Líneas del documento que originaron la línea del asiento (después de agrupar, CA-20.3) |

**PendingReason**: códigos estables con texto en español (RF-09):

| Código | Texto | Acciones permitidas del Maker |
|---|---|---|
| `UNBALANCED` | Descuadre | cambiar plantilla, cancelar |
| `INCONSISTENT_AMOUNTS` | Montos inconsistentes | cancelar |
| `PERIOD_CLOSED` | Periodo cerrado o no abierto | revalidar, cancelar |
| `TEMPLATE_MISMATCH` | Plantilla no corresponde | cambiar plantilla, cancelar |
| `MISSING_COST_CENTER` | Falta centro de costo | completar, cancelar |
| `ACCOUNT_NOT_FOUND` | Cuenta inexistente en el catálogo de la empresa | cambiar plantilla, cancelar |
| `ACCOUNT_NOT_POSTABLE` | Cuenta no imputable (no es de uso U) | cambiar plantilla, cancelar |
| `NO_FX_RATE` | Sin tipo de cambio | revalidar, cancelar |
| `TEMPLATE_INACTIVE` | Plantilla no activa (sin versión activa o desactivada para la empresa) | cambiar plantilla, cancelar |

Las acciones permitidas sobre un asiento son la **intersección** de las acciones de todos sus
motivos, más "cancelar", que siempre está disponible. Por ejemplo, un asiento con
`INCONSISTENT_AMOUNTS` solo puede cancelarse, aunque tenga otros motivos.

## 4. Plantillas con reglas · RF-08, RF-19 a RF-23, RD-10

Diseño en research R-20 a R-24. Colección **global** `templates` (banco de plantillas) y
colección **por empresa** `templateActivations`.

### 4.1 Template

| Campo | Tipo | Regla |
|---|---|---|
| `templateId` | string | PK estable, por ejemplo `PL-02`; las plantillas nuevas usan `PL-` y un correlativo |
| `code` | string | Único en el banco, mayúsculas y guion bajo |
| `name` | string | Obligatorio |
| `operationType` | `"COMPRA"` \| `"VENTA"` | No cambia entre versiones; se usa para `TEMPLATE_MISMATCH` |
| `createdBy` / `createdAt` | | Admin que la creó |
| `retiredAt` | ISO datetime \| null | Retirada sin reemplazo (CA-22.5) |
| `versions` | `TemplateVersion[]` | Al menos 1 |

### 4.2 TemplateVersion

| Campo | Tipo | Regla |
|---|---|---|
| `version` | int | 1, 2, 3…; único dentro de la plantilla |
| `status` | `"DRAFT"` \| `"ACTIVE"` \| `"RETIRED"` | Como máximo una `ACTIVE` y un `DRAFT` por plantilla (CA-21.4) |
| `basedOnVersion` | int \| null | Versión de la que se copió (CA-22.2) |
| `defaults` | object | `{ baseAccount, taxAccount, counterpartAccount, appliesIgv, requiresCostCenter, defaultCostCenter }`; cuentas obligatorias |
| `documentRules` | `Rule[]` | Se evalúan una vez por comprobante (CA-19.2) |
| `lineRules` | `Rule[]` | Se evalúan por línea |
| `testCases` | `TestCase[]` | Al menos 1 para activar (CA-21.3) |
| `lastTestRun` | object \| null | `{ at, by, allPassed, uncoveredRuleIds[], results: { caseId, passed, balanced, accountErrors[], appliedRuleIds[], actualLines[] }[] }` |
| `createdBy` / `createdAt` / `updatedAt` | | |
| `activatedBy` / `activatedAt` | | Solo `ACTIVE` y `RETIRED` |
| `diffFromPrevious` | string[] \| null | Resumen legible calculado al activar (CA-22.3) |
| `usageCount` | int | Asientos generados con esta versión |

**Reglas de estado**:
- Solo un `DRAFT` se edita o elimina (CA-22.1).
- "Editar" una versión `ACTIVE` o `RETIRED` crea un `DRAFT` con `version = max + 1` (CA-22.2).
- Activar un `DRAFT` exige que `lastTestRun` sea posterior a `updatedAt`, con `allPassed`,
  `uncoveredRuleIds` vacío, al menos un caso y todas las cuentas válidas en el PCGE semilla.
  Si falta algo → `TEMPLATE_NOT_READY`. Al activar, la versión `ACTIVE` anterior pasa a
  `RETIRED` (CA-21.3, CA-22.3).

### 4.3 Rule, Condition y Action

| Elemento | Forma | Regla de validación (CA-19.5) |
|---|---|---|
| `Rule` | `{ ruleId, name, priority, when, then }` | `name` obligatorio; `priority` entero ≥ 1 y único dentro de su grupo |
| `Condition` (grupo) | `{ op: "and"\|"or", args: Condition[] }` | Al menos 2 `args` |
| `Condition` (negación) | `{ op: "not", arg: Condition }` | |
| `Condition` (comparación) | `{ op, field, value }` | `op` ∈ `contains`, `startsWith`, `equals`, `gt`, `gte`, `lt`, `lte`, `between`, `in`; `field` ∈ la lista de R-20; `value` no vacío y del tipo del campo; `between` = `[min, max]` con min ≤ max; las reglas de comprobante no admiten campos `line.*` |
| `Action` de comprobante | `{ taxAccount?, counterpartAccount?, defaultCostCenter?, tags? }` | Al menos un campo |
| `Action` de línea | `{ baseAccount?, costCenter?, tags? }` o `{ split: SplitPart[] }` | Al menos un campo; `split` excluye `baseAccount` y `costCenter` |
| `SplitPart` | `{ account, costCenter?, basisPoints }` | Al menos 2 partes; `basisPoints` enteros > 0 que suman exactamente 10000 |
| `tags` | `Record<string,string>` | Claves y valores no vacíos |

### 4.4 TestCase

| Campo | Tipo | Regla |
|---|---|---|
| `caseId` / `name` | string | |
| `document` | object | Documento estándar en PEN: `{ issuer, receiver, issueDate, lines[{ description, amountCents, taxCode }], taxableBaseCents, exemptBaseCents, igvCents, totalCents }`; `operationType` = el de la plantilla |
| `expectedLines` | `{ side, accountCode, costCenter, functionalAmountCents }[]` | Se comparan sin importar el orden; incluye los destinos (amarres) del PCGE |

### 4.5 TemplateActivation (por empresa) · RF-23

Colección `contableos:v1:<empresaId>:templateActivations`:

| Campo | Tipo | Regla |
|---|---|---|
| `templateId` | string | FK → Template |
| `active` | bool | |
| `activatedBy` / `activatedAt` | | Último cambio |
| `accountWarnings` | `{ accountCode, problem: "NOT_FOUND"\|"NOT_POSTABLE" }[]` | Calculadas contra el catálogo de la empresa al activar (CA-23.2); se recalculan al listar |

- **Migración perezosa** (CA-23.3): si la colección no existe, se crea desde
  `empresa.plantillasActivasIds` con el mapeo de research R-11.
- **Plantillas ofrecidas al Maker** (CA-01.2b): las de `active = true` cuya plantilla tiene una
  versión `ACTIVE` y no está retirada.

### 4.6 Semilla (research R-11)

PL-01 a PL-06 como versión 1 `ACTIVE`, sin reglas, con un caso cada una. PL-07 "Servicios
varios con reglas" como versión 1 `ACTIVE`, con 3 reglas de línea ("FLETE", "LUZ o AGUA" y
prorrateo "SEGURO") y un caso por regla.

## 5. FxRate — Tipo de cambio · RF-07

Colección global `fxRates`: `{ currency: "USD", date, rateMilli, kind: "VENTA" }`. Solo lectura.
Las reglas de resolución están en R-12.

## 6. Datos existentes que la ingestión lee (y ahora se persisten)

### 6.1 Empresa y PeriodoContable · RF-09, CA-09.4, CA-09.5

Colección global `empresas`, que antes vivía solo en memoria en el `AccountingContext` (R-15).
Conserva la forma existente (`src/types/accounting.d.ts`). Campos que usa la ingestión:

| Campo | Uso |
|---|---|
| `id` | `tenantId` |
| `ruc` | Pertenencia del comprobante (RF-06) |
| `periodos[]` | `{ ejercicio: "2026", mes: 9, nombrePeriodo: "SETIEMBRE_2026", estado: "ABIERTO"\|"CERRADO" }` |
| `plantillasActivasIds[]` | Fuente de las activaciones iniciales de plantillas (CA-23.3, §4.5) |

- **Periodo de un asiento**: `accountingPeriod = "YYYY-MM"` de `issueDate`. Se busca
  `periodos[]` con `ejercicio = YYYY` y `mes = MM`. Si falta o está `CERRADO` →
  `PERIOD_CLOSED`.
- **Periodo activo**: `ctx.activePeriod = { ejercicio, nombrePeriodo }`. Si está `CERRADO` →
  toda escritura responde `PERIOD_READ_ONLY` (CA-09.5).
- Semilla: `mockEmpresas` (por ejemplo, empresa 01: 2026-08 `CERRADO` y 2026-09 `ABIERTO`).

### 6.2 Cuenta del catálogo · CA-08.5, RF-09

Colección `contableos:v1:<empresaId>:chartOfAccounts` (antes `planesPorEmpresa[empresaId]` en
memoria; R-10). Conserva la forma `CuentaContable` existente. La ingestión la lee a través del
adaptador de R-16:

| Campo del dominio | Origen |
|---|---|
| `code` | `codigo` |
| `isPostable` | `esCuentaU` |
| `requiresCostCenter` | `requiereCC` o `requiereCentroCostos` |
| `defaultCostCenter` | `amarre3` (si no está vacío) |
| `destDebit` / `destCredit` | `amarre1` / `amarre2` (solo si existen ambos) |

Semilla: `mockPlanContable` por empresa, que ahora incluye `659` y `6591101` (R-11) y `61`, `611` y `6111101` (R-19).

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

### AuditEvent — Evento de auditoría · RF-17, CA-23.4

Colección `auditLog` por empresa y `contableos:v1:global:auditLog` para las operaciones del
banco de plantillas (`tenantId = "global"`). **Append-only.**

| Campo | Tipo |
|---|---|
| `id` | UUID |
| `tenantId`, `traceId` | |
| `at` | ISO datetime |
| `userId`, `role` | Actor, tomado de la sesión del login (R-13). `SYSTEM` para los pasos automáticos del pipeline |
| `action` | enum: `RAW_RECEIVED`, `DUPLICATE_DETECTED`, `PARSE_FAILED`, `REJECTED_NOT_TENANT`, `DOCUMENT_CANONICALIZED`, `DRAFT_CREATED`, `SENT_TO_STAGING`, `STAGING_UPDATED`, `TEMPLATE_CHANGED`, `REVALIDATED`, `MOVED_TO_PENDING_APPROVAL`, `ENTRY_CANCELLED`, `ACTION_DENIED`, `INVALID_TRANSITION`, `CONFLICT`, `DEMO_RESET`, `TEMPLATE_VERSION_CHANGED`; y del banco de plantillas: `TEMPLATE_CREATED`, `TEMPLATE_DRAFT_CREATED`, `TEMPLATE_DRAFT_UPDATED`, `TEMPLATE_DRAFT_DELETED`, `TEMPLATE_TESTS_RUN`, `TEMPLATE_VERSION_ACTIVATED`, `TEMPLATE_RETIRED`, `TEMPLATE_COMPANY_ACTIVATED`, `TEMPLATE_COMPANY_DEACTIVATED` |
| `entityType` / `entityId` | Objeto afectado |
| `detail` | object | Datos relevantes: motivos, antes y después, justificación |

### DemoSettings (global) · RF-18

`{ fxServiceDown: bool, latencyMs: int, perItemLatencyMs: int }`.

### Session (global) · R-13

La sesión existente del login (`SesionEstudio`: `usuarioId`, `nombre`, `rol`, `codigoEstudio`,
`autenticado`, `fechaAcceso`), movida de la clave suelta `sesionUsuario` a
`contableos:v1:global:session`.

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
JournalEntry * ── 1 TemplateVersion (global, por templateId + templateVersion)
Template 1 ── * TemplateVersion 1 ── * Rule, * TestCase
Empresa 1 ── * TemplateActivation * ── 1 Template
JournalEntry * ── 1 Empresa.periodos[] (por accountingPeriod)
EntryLine.accountCode ──► Cuenta del catálogo de la empresa (chartOfAccounts)
Empresa.plantillasActivasIds ──► activaciones iniciales (migración perezosa, §4.5)
AuditEvent * ── 1 traceId (agrupa toda la cadena)
```
