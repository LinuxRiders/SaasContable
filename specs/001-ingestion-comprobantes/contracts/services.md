# Contrato: Servicios Mock de Ingestión

Es la "API" que consume la UI (constitución I). Todas las operaciones son asíncronas: devuelven
una Promise, aplican la latencia simulada (R-14) y reflejan los contratos abstractos del SDD §12.
Cambiar a un backend real significa reimplementar estas operaciones con el mismo contrato.

## Convenciones

- **Contexto obligatorio**: el primer argumento de toda operación es
  `ctx = { tenantId, userId, role, activePeriod: { ejercicio, nombrePeriodo } }`. Lo arma el hook
  `useIngestionContext()` a partir de la sesión del login y de la empresa y el periodo activos
  (R-13). Si falta, o el `tenantId` no es una empresa conocida, la operación responde
  `VALIDATION_ERROR`.
- **Datos existentes**: el catálogo de cuentas, los periodos y las plantillas activas se leen del
  repositorio en cada operación, nunca del `ctx` (R-10, R-15).
- **Éxito**: la Promise se resuelve con `{ ok: true, data }`.
- **Error**: la Promise se resuelve (no se rechaza) con `{ ok: false, error: { code, message, details } }`.
  `message` está en español y es apto para mostrar al usuario (RNF-05).
- **Autorización**: cada operación valida el rol en el servicio, aunque la UI oculte el botón.
  Una denegación responde `FORBIDDEN` y registra el evento `ACTION_DENIED` (RF-15, RNF-04).
- **Aislamiento**: una operación solo lee y escribe datos del `ctx.tenantId`. Si un id pertenece
  a otra empresa, responde `NOT_FOUND`, nunca `FORBIDDEN`, para no revelar su existencia (RF-16).

## Códigos de error

| Código | Cuándo |
|---|---|
| `VALIDATION_ERROR` | Entrada inválida (falta la plantilla, lote vacío, justificación corta, contexto inválido) |
| `BATCH_TOO_LARGE` | Más de 50 comprobantes (CA-01.5) |
| `TEMPLATE_NOT_ACTIVE` | La plantilla no está activada para la empresa o no tiene versión `ACTIVE` (CA-01.2c, CA-23.1) |
| `PERIOD_READ_ONLY` | El periodo activo del usuario está CERRADO; no se permiten escrituras (CA-09.5) |
| `TEMPLATE_INVALID` | Plantilla, regla o caso de prueba incompleto o inválido; `details` lista cada error con su ruta (CA-19.5) |
| `TEMPLATE_NOT_EDITABLE` | Se intenta modificar o eliminar una versión que no es `DRAFT` (CA-22.1) |
| `TEMPLATE_NOT_READY` | Activación sin pruebas vigentes en verde, con reglas sin cubrir o con cuentas inválidas en el PCGE; `details` indica qué falta (CA-21.3) |
| `FORBIDDEN` | El rol no puede ejecutar la acción (RF-15) |
| `NOT_FOUND` | El id no existe en la empresa activa |
| `CONFLICT` | `expectedVersion` desactualizado (CA-11.6) |
| `INVALID_TRANSITION` | Transición de estado no permitida (RF-14, CA-12.2, CA-12.3) |
| `ACTION_NOT_ALLOWED_FOR_REASON` | La acción no está permitida por los motivos del asiento (por ejemplo, completar con `INCONSISTENT_AMOUNTS`) |
| `STORAGE_FULL` | El almacenamiento del navegador está lleno (R-07) |

## Matriz de permisos · RF-15

Roles según el mapeo de R-13 (`Maker`→MAKER, `Checker`→CHECKER, `Auditor`→AUDITOR,
`Admin`→ADMIN, otro→UNKNOWN).

| Operación | MAKER | CHECKER | AUDITOR | ADMIN | UNKNOWN |
|---|:-:|:-:|:-:|:-:|:-:|
| `listTemplates`, `listSampleCatalog` | ✔ | — | ✔ | ✔ | — |
| `ingestBatch`² | ✔ | — | — | — | — |
| `getBatch`, `listBatches`, `queryIntakeResults` | ✔ | — | ✔ | ✔ | — |
| `queryStaging`, `getJournalEntry` | ✔ | — | ✔ | ✔ | — |
| `updateStagingEntries`, `revalidateEntries`, `cancelEntry`² | ✔ | — | — | — | — |
| `queryPendingApproval` | ✔ | ✔ | ✔ | ✔ | — |
| `getTraceability`, `getRawPayload` | ✔ | ✔¹ | ✔ | ✔ | — |
| `getDemoSettings`, `setFxServiceDown`, `resetDemoData` | ✔ | ✔ | ✔ | ✔ | — |
| `listTemplateBank`, `getTemplate`, `listCompanyTemplateActivations` | — | — | ✔ | ✔ | — |
| `createTemplate`, `saveTemplateDraft`, `editTemplate`, `deleteTemplateDraft`, `runTemplateTests`, `activateTemplateVersion`, `retireTemplate` | — | — | — | ✔ | — |
| `setCompanyTemplateActivation` | — | — | — | ✔ | — |

¹ El Checker solo puede consultar la trazabilidad de asientos en `PENDING_APPROVAL`.
² Además exige que el periodo activo esté ABIERTO; si no, `PERIOD_READ_ONLY` (CA-09.5).
Los controles de demostración no son acciones de negocio; los puede usar cualquier rol
reconocido.

---

## Operaciones

### Catálogos

**`listTemplates(ctx)`** · RF-08, CA-01.2b
→ `data: { templates: { templateId, code, name, operationType, version, hasRules }[], companyHasActivations: bool }`.
Devuelve las plantillas **activadas para la empresa** que tienen versión `ACTIVE` y no están
retiradas (data-model §4.5). Si la empresa no tiene ninguna activada, `templates` va vacío y
`companyHasActivations` es `false`, para que la UI muestre el aviso de CA-01.2b. Si la colección
`templateActivations` no existe, la crea con la migración perezosa (CA-23.3).

**`listSampleCatalog(ctx)`** · RF-01, CA-18.4
→ `data: { sampleId, title, expectedOutcome, fileName, contentType }[]`
`expectedOutcome` describe el resultado esperado para la demo (por ejemplo, "Duplicado con
diferencias").

### Ingestión · RF-01 a RF-09, RF-16, RF-17

**`ingestBatch(ctx, { templateId, items })`**

- `items`: 1 a 50 elementos, cada uno
  `{ source: "UPLOAD", fileName, sizeBytes, content } | { source: "SAMPLE_CATALOG", sampleId }`.
- Errores de lote, que no procesan nada: sin `templateId` o plantilla inexistente →
  `VALIDATION_ERROR`; plantilla no activada para la empresa o sin versión `ACTIVE` →
  `TEMPLATE_NOT_ACTIVE`; `items` vacío → `VALIDATION_ERROR`; más de 50 → `BATCH_TOO_LARGE`;
  rol distinto de MAKER → `FORBIDDEN`; periodo activo CERRADO → `PERIOD_READ_ONLY`.
- El catálogo de cuentas, los periodos, la empresa y la **versión activa** de la plantilla se
  leen una vez al inicio del lote y se usan para todos sus comprobantes. Cada asiento guarda
  `templateVersion`, `appliedRules` y el `ruleId` de cada línea; `usageCount` de la versión se
  incrementa (CA-20.4, CA-22.4).
- Los comprobantes se procesan en orden. Un fallo individual no detiene el lote (RNF-03). Si un
  mismo lote trae dos comprobantes con la misma clave, el segundo queda como duplicado
  (CA-03.5).
- El `ctx.tenantId` se toma al inicio y se usa para todo el lote.
- → `data: IngestionBatch`, con `summary` e `items[]`. Cada item incluye `{ fileName, outcome,
  outcomeReason, traceId, journalEntryId?, entryState?, pendingReasons? }`.

**`getBatch(ctx, { batchId })`** / **`listBatches(ctx, { limit })`** → `IngestionBatch` / `IngestionBatch[]`.

**`queryIntakeResults(ctx, { outcome?, from?, to?, page, pageSize })`** · RF-03, RF-05, RF-06
Lista la evidencia recibida, filtrable por resultado (`FAILED`, `DUPLICATE`,
`DUPLICATE_WITH_DIFF`, `REJECTED_NOT_TENANT`, `ACCEPTED`).
→ `data: { items: { rawPayloadId, traceId, receivedAt, fileName, outcome, outcomeReason, duplicateOfDocumentId }[], total }`.

**`getRawPayload(ctx, { rawPayloadId })`** · CA-02.4 → `RawPayload` con el contenido íntegro.

### Bandeja · RF-10, RF-11, RF-12

**`queryStaging(ctx, { reason?, operationType?, from?, to?, currency?, overdueOnly?, page, pageSize })`**
→ `data: { items: StagingRow[], total }`. Cada `StagingRow` tiene:
`{ id, traceId, operationType, counterpartyName, documentNumber, issueDate, totalCents, currency, pendingReasons, stagedAt, ageHours, overdue, allowedActions, entityVersion }`.
`overdue` es verdadero si `ageHours > 48` (CA-10.4).

**`getJournalEntry(ctx, { id })`** · CA-10.3
→ `{ entry: JournalEntry, document: CanonicalDocument, rawPayloadId }`.

**`updateStagingEntries(ctx, { updates })`** · CA-11.1 a CA-11.6

- `updates`: `{ id, expectedVersion, costCenter?, analyticTags?, templateId? }[]`.
- Campos prohibidos (montos, cuentas, fecha, datos del comprobante) → `VALIDATION_ERROR`
  (CA-11.4).
- Por cada asiento: se verifica el estado `PENDING_INPUT`, la versión y que la acción esté
  permitida por sus motivos. Luego se regenera el asiento con la plantilla vigente (o la nueva),
  se aplican centro de costo y etiquetas, y se valida (RF-09).
- → `data: { results: { id, status: "ADVANCED"|"STILL_PENDING"|"CONFLICT"|"ERROR", entryState, pendingReasons, error? }[] }` (CA-11.5).
  El resultado de cada asiento es independiente.

**`revalidateEntries(ctx, { items: { id, expectedVersion }[] })`** · CA-11.7
Igual que la operación anterior, sin cambios de datos. Vuelve a resolver el tipo de cambio, el
periodo (según los periodos vigentes de la empresa), las cuentas (según el catálogo vigente) y
la **versión activa vigente** de la plantilla (R-24). Si la plantilla ya no está activa para la
empresa → motivo `TEMPLATE_INACTIVE`; si la versión cambió → evento `TEMPLATE_VERSION_CHANGED`.

**`cancelEntry(ctx, { id, expectedVersion, reason })`** · RF-12

- `reason` de menos de 10 caracteres (sin contar espacios al inicio y al final) →
  `VALIDATION_ERROR`.
- Asiento que no está en `PENDING_INPUT` → `INVALID_TRANSITION`.
- → `data: JournalEntry` en `CANCELLED`.

### Pendientes de aprobación · RF-13

**`queryPendingApproval(ctx, { provisionalOnly?, page, pageSize })`**
→ `data: { items: { id, traceId, operationType, counterpartyName, documentNumber, issueDate, totalCents, functionalTotalCents, currency, provisionalFxRate, requiresHumanReview }[], total }`.
`requiresHumanReview` es igual a `provisionalFxRate` (CA-13.2). Esta funcionalidad no expone
ninguna operación que pase un asiento al Libro Diario (CA-13.3).

### Trazabilidad · RF-17

**`getTraceability(ctx, { traceId })`**
→ `data: { rawPayload, document?, entry?, template?, events: AuditEvent[] }`, con los eventos
ordenados por fecha ascendente (CA-17.2).

### Demo · RF-18

- **`getDemoSettings(ctx)`** → `DemoSettings` más `storageUsageBytes`.
- **`setFxServiceDown(ctx, { down })`** (CA-18.3).
- **`resetDemoData(ctx)`** (CA-18.2, R-17): borra **todas** las colecciones `contableos:v1:*`
  salvo la sesión, y vuelve a sembrar empresas con sus periodos, catálogos PCGE por empresa, el
  banco de plantillas (PL-01 a PL-07 con sus casos), tasas y la semilla de ingestión. Las
  activaciones por empresa se vuelven a crear con la migración perezosa. Es el mismo reinicio que usa "Reset a datos
  semilla" de Copias de Seguridad. Es la única excepción a la regla append-only, porque reinicia la
  demo completa, no modifica registros. Deja un evento `DEMO_RESET` en el log nuevo.

### Banco de plantillas y activación por empresa · RF-19 a RF-23 (R-20 a R-23)

Las operaciones del banco son globales: ignoran `ctx.tenantId` para leer y escribir `templates`
y auditan en `global:auditLog`. Las de activación usan `ctx.tenantId`.

**`listTemplateBank(ctx, { includeRetired? })`**
→ `data: { templateId, code, name, operationType, activeVersion|null, draftVersion|null, retired, versions: { version, status, activatedAt, usageCount }[] }[]`.

**`getTemplate(ctx, { templateId })`** → `Template` completo, con todas sus versiones.

**`createTemplate(ctx, { code, name, operationType, defaults })`** · CA-19.1
Crea una `Template` con `DRAFT v1` sin reglas ni casos. `code` repetido o datos inválidos →
`TEMPLATE_INVALID`. Evento `TEMPLATE_CREATED`.

**`saveTemplateDraft(ctx, { templateId, version, draft: { name?, defaults, documentRules, lineRules, testCases } })`** · CA-19.2 a CA-19.5, CA-21.1
Valida la estructura según data-model §4.3 y §4.4 (→ `TEMPLATE_INVALID` con la lista de
errores) y las cuentas contra el PCGE semilla (los errores se devuelven en
`data.accountErrors`, sin impedir guardar). Solo sobre un `DRAFT`; si no →
`TEMPLATE_NOT_EDITABLE`. Actualiza `updatedAt`, lo que invalida `lastTestRun`. Evento
`TEMPLATE_DRAFT_UPDATED`.

**`editTemplate(ctx, { templateId })`** · CA-22.2
Si ya existe un `DRAFT`, lo devuelve. Si no, copia la versión `ACTIVE` (o la última) a
`DRAFT v(max+1)` con `basedOnVersion`. Evento `TEMPLATE_DRAFT_CREATED`.

**`deleteTemplateDraft(ctx, { templateId, version })`** · CA-22.1
Solo `DRAFT`. Si es la única versión de la plantilla, la plantilla también se elimina.

**`runTemplateTests(ctx, { templateId, version })`** · CA-21.2
Evalúa cada caso con el evaluador, el PCGE semilla y R-02 sin conversión (casos en PEN). Guarda
y devuelve `lastTestRun`: por caso, `passed`, `balanced`, `accountErrors`, `appliedRuleIds` y
`actualLines`; en total, `allPassed` y `uncoveredRuleIds`. Evento `TEMPLATE_TESTS_RUN`.

**`activateTemplateVersion(ctx, { templateId, version })`** · CA-21.3, CA-22.3
Exige las condiciones de data-model §4.2 (si no → `TEMPLATE_NOT_READY` con `details`). La versión
pasa a `ACTIVE`, la `ACTIVE` anterior a `RETIRED`, se calcula `diffFromPrevious` y se quita
`retiredAt`. Evento `TEMPLATE_VERSION_ACTIVATED`.

**`retireTemplate(ctx, { templateId })`** · CA-22.5
La versión `ACTIVE` pasa a `RETIRED` y se fija `retiredAt`. La plantilla deja de ofrecerse en
todas las empresas. Evento `TEMPLATE_RETIRED`.

**`listCompanyTemplateActivations(ctx)`** · CA-23.1, CA-23.2
→ `data: { templateId, code, name, operationType, activeVersion|null, retired, active, activatedBy, activatedAt, accountWarnings }[]`
para todas las plantillas del banco, con las advertencias recalculadas contra el catálogo vigente
de `ctx.tenantId`.

**`setCompanyTemplateActivation(ctx, { templateId, active })`** · CA-23.1 a CA-23.4
Activar exige que la plantilla tenga versión `ACTIVE` (si no → `TEMPLATE_NOT_ACTIVE`). Calcula
`accountWarnings` contra el catálogo de la empresa y activa igual. No depende del periodo activo:
es configuración, no operación. Eventos `TEMPLATE_COMPANY_ACTIVATED` o
`TEMPLATE_COMPANY_DEACTIVATED` en el `auditLog` de la empresa.

## Adaptador síncrono para el `AccountingContext` (R-18)

No es parte de la API de ingestión: lo usa el contexto existente para persistir su estado por el
mismo repositorio. Todas sus operaciones son síncronas.

| Operación | Uso |
|---|---|
| `loadEmpresas()` / `saveEmpresas(empresas)` | Estado inicial y guardado de `empresas` (incluye periodos y plantillas activas) |
| `loadChartOfAccounts(empresaId)` / `saveChartOfAccounts(empresaId, cuentas)` | Catálogo por empresa (`planesPorEmpresa`) |
| `loadSession()` / `saveSession(sesion)` / `clearSession()` | Sesión del login |
