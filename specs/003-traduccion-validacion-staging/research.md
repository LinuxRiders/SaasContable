# Research: Interpretación Contable, Validación y Bandeja del Maker

**Feature**: 003-traduccion-validacion-staging · **Fecha**: 2026-09-22

## R-01 · Reutilizar el motor del spec 001, no duplicarlo

- **Decisión**: la interpretación usa `accountingEngine.interpret(ctx, { document, fxRateMilli })` del spec 001, que ya hace esquema, perspectiva, clasificación, selección y evaluación. Esta feature agrega, en `src/domain/journal/`, solo los pasos que dependen del estado del tenant o del tiempo: confianza de extracción y referencias (antes), tipo de cambio (antes de evaluar), y fecha contable, período y construcción del asiento (después).
- **Justificación**: una única implementación del razonamiento contable (constitución III).

## R-02 · "Re-ejecutar desde el paso N"

- **Decisión**: como la interpretación es pura y determinista, re-ejecutarla completa sobre la revisión corregida del documento produce el mismo resultado que re-ejecutarla desde el paso N. El sistema **siempre** re-ejecuta todo; la traza marca en qué paso cambió el resultado respecto a la ejecución anterior (`changedFromStep`). Las decisiones del Maker quedan en la revisión del documento: la clasificación como `operationTypeCode` explícito en el documento y en las líneas (valor del origen, SDD §20.4), las dimensiones en `fields` / `lines[i].fields`, y las verificaciones en `fieldProvenance.verifiedByHuman`.
- **Justificación**: más simple y sin estados intermedios. Cumple el SDD §5.6.

## R-03 · Asiento persistente desde el primer intento

- **Decisión**: cada documento interpretado tiene **un** `JournalEntry` en `<tenantId>:journalEntries`, creado en el primer intento. Si el intento se detiene antes de evaluar, el asiento queda `PENDING_INPUT` sin líneas. Los reintentos actualizan el mismo asiento (con `entityVersion` + 1), mientras esté en `DRAFT` o `PENDING_INPUT`. `IntakeRecord.processingStatus` pasa a `INTERPRETED` con `journalEntryId`.
- **Justificación**: la bandeja trabaja sobre un único objeto (SDD §12.3 usa `journalEntryId`).

## R-04 · Máquina de estados

- **Decisión**: `src/domain/ingestion/stateMachine.js` se completa con la tabla del SDD §10.2: `DRAFT → PENDING_INPUT | PENDING_APPROVAL`; `PENDING_INPUT → DRAFT | CANCELLED`; `PENDING_APPROVAL → POSTED | REJECTED`; `POSTED → POSTED_PENDING_PUBLISH`; `POSTED_PENDING_PUBLISH → POSTED`. Esta feature usa las cuatro primeras; los specs 004 y 005 usan las demás. Un reintento hace `PENDING_INPUT → DRAFT →` resultado. Cada transición registra `{ from, to, at, by, reason }` en `entry.stateHistory`.

## R-05 · Confianza y referencias (antes del esquema)

- **Decisión**:
  - `checkExtractionConfidence(document, { documentType, threshold })` devuelve `LOW_CONFIDENCE_EXTRACTION` con las rutas obligatorias bajo el umbral que no tienen `verifiedByHuman` (misma regla de rutas obligatorias que `decideIntake` del spec 002; se extrae a una función compartida `requiredPaths(documentType)` en `src/domain/ingestion/intake/intakeDecision.js`).
  - `resolveReferences(document, { canonicalIndex })` busca cada referencia por `tenantId + documentTypeCode + serie-número normalizado + issueDate` (la misma normalización de `dedup.js`) y devuelve `REFERENCE_NOT_FOUND` por referencia faltante, más `references[i].resolvedDocumentId` cuando la encuentra.
- **Justificación**: el SDD §5.4 ubica estas verificaciones en el paso 1.

## R-06 · Tipo de cambio

- **Decisión**: `resolveDocumentFx(document, { functionalCurrency, rates, serviceDown, rateType })` usa `resolveRate` de `fx.js`. Si la moneda es la funcional → `{ fxRateMilli: null }`. Si no hay tasa → `FX_RATE_UNAVAILABLE`. La tabla semilla (`global:fxRates`) es de venta USD→PEN y el paquete declara `fxRateType: 'SELL'`; con otra moneda sin tabla → `FX_RATE_UNAVAILABLE`. El interruptor existente `demoSettings.fxServiceDown` simula la caída.

## R-07 · Fecha contable y registro tardío

- **Decisión**: `resolveAccountingDate(issueDate, { periods, policy, lateRegistrationMonths })`, con `periods = empresa.periodos` (`{ ejercicio, mes, estado }`):
  1. Si el período del `issueDate` existe y está `ABIERTO` → `accountingDate = issueDate`.
  2. Si no, busca el primer período `ABIERTO` posterior al del `issueDate`. Si no existe → `PERIOD_CLOSED`.
  3. Si `policy.enabled` es falso y no hay confirmación del Maker → `PERIOD_CLOSED`.
  4. Si la diferencia en meses entre ambos períodos supera `lateRegistrationMonths` → `LATE_REGISTRATION_LIMIT`.
  5. En otro caso → `accountingDate` = primer día de ese período y `lateRegistration = true`.

  La confirmación del Maker (acción `CONFIRM_LATE_REGISTRATION`) se guarda en el asiento (`lateRegistrationConfirmedBy`) y equivale a la política activa para ese asiento.
- **Datos**: `empresa.lateRegistration = { enabled }` (`01` true, `02` false) y `documentType.lateRegistrationMonths` en el paquete (12 en `INVOICE`, `SALES_RECEIPT`, `CREDIT_NOTE`, `DEBIT_NOTE`, `PROFESSIONAL_FEE_RECEIPT`; `null` = sin límite en los internos).

## R-08 · Validador

- **Decisión**: `validateEntry(entry, { chart, periods, policy, documentType })` verifica, en orden:
  1. RD-03 con `checkBalance` sobre `functionalAmountMinor`.
  2. RD-12 con R-07.
  3. RD-17: cada línea con cuenta existente, `esCuentaU`, activa y, si `requiereCC`, con la dimensión `costCenter`.

  La evaluación del spec 001 ya detecta la mayoría de los casos RD-17; el validador los repite porque un asiento puede llegar desde otra vía (reversión del spec 006) y porque el plan puede cambiar entre evaluación y validación.

## R-09 · Acciones del Maker

- **Decisión**: función pura `applyMakerAction(document, entry, action, { actor, now })` → `{ document?: nuevaRevision, entryPatch? }`.

  | Acción | Efecto |
  |---|---|
  | `VERIFY_FIELDS` `{ fields: [{ path, value? }] }` | confirma (o corrige) y marca `verifiedByHuman` |
  | `EDIT_FIELDS` `{ changes: [{ path, value }] }` | corrige valores; no se puede cambiar `documentTypeCode` |
  | `CLASSIFY` `{ operationTypeCode?, lines?: [{ lineNo, operationTypeCode }], proposeRule?: boolean }` | solo operaciones admitidas para el tipo y la perspectiva |
  | `SET_DIMENSIONS` `{ document?: { costCenter }, lines?: [{ lineNo, costCenter }] }` | escribe en `fields` / `lines[i].fields` |
  | `CONFIRM_LATE_REGISTRATION` | parche en el asiento |
  | `RETRY` | sin cambios |
  | `CANCEL` `{ reason }` | parche en el asiento |

  Toda acción suma el actor a `entry.intervenedBy` y pone `manualIntervention = true`, excepto `RETRY` sin cambios hecho después de una corrección de configuración del Admin.
- **Justificación**: una sola función, probada, que traduce la UI en cambios de datos.

## R-10 · Revisiones del documento

- **Decisión**: `canonicalDocuments` guarda todas las revisiones (`{ id, revision }` único); la vigente es la de mayor número. Cada revisión nueva registra `revisedBy`, `revisedAt`, `reason` y `changes: [{ path, before, after }]`. El asiento apunta a `canonicalDocRef = { id, revision }`.

## R-11 · Proponer regla desde la bandeja

- **Decisión**: con `proposeRule`, el servicio crea una regla `PROPOSED` mediante `classificationRuleService.saveClassificationRule` del spec 001. Condición: `eq(party('ISSUER').fiscalId, '<emisor>')` más el tipo de documento, y la operación elegida. Hace falta un permiso nuevo, `PROPOSE_CLASSIFICATION_RULE` (MAKER), y que el servicio de reglas acepte ese permiso **solo** cuando `status = 'PROPOSED'`.

## R-12 · Disparo

- **Decisión**: `src/services/journal/index.js` suscribe `interpretationService.onDocumentReceived` a `DocumentReceived` al cargarse, con el `ctx` del actor que publicó el evento. La interpretación corre tras `demoSettings.latencyMs`. En pruebas se llama directamente a `interpretIntakeRecord(ctx, { intakeRecordId })`.

## R-13 · Permisos nuevos

`VIEW_STAGING` y `VIEW_JOURNAL` (todos); `ACT_ON_STAGING`, `CANCEL_ENTRY` y `PROPOSE_CLASSIFICATION_RULE` (MAKER); `RETRY_INTERPRETATION` (MAKER).
