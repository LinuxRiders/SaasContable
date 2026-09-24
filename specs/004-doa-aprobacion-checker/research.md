# Research: Delegación de Autoridad, Firma y Aprobación

**Feature**: 004-doa-aprobacion-checker · **Fecha**: 2026-09-22

## R-01 · Matriz DoA con el lenguaje de expresiones del spec 001

- **Decisión**: las reglas de la matriz son `{ id, description, when: Expression, level }` evaluadas con `evaluateExpression` sobre un **contexto de aprobación** derivado del asiento, no sobre el documento: `approval.totalFunctionalMinor`, `approval.documentTypeCode`, `approval.operationTypeCode`, `approval.perspective`, `approval.sourceFormat`, `approval.provisionalFxRate`, `approval.manualIntervention`, `approval.lateRegistration`, `approval.isReversal`, `approval.reversalOfClosedPeriod`. El evaluador de expresiones admite un nuevo prefijo de ruta, `approval.*`, a través de un contexto adicional (extensión compatible del spec 001: `evaluateExpression(node, { document, line, extra })`, con `field: 'approval.x'` leído desde `extra`).
- **Justificación**: un solo lenguaje de condiciones en todo el sistema; la matriz sigue siendo datos.

## R-02 · Reglas fijas del sistema

- **Decisión**: `decideApproval` aplica, **después** de la matriz, el piso fijo "nunca STP" (nivel mínimo `CHECKER_L1`) si `provisionalFxRate`, `manualIntervention`, `sourceFormat ∈ { IMAGE, PDF_SCANNED, PDF_TEXT, FORM }` o `lateRegistration`. Este piso no es configurable (RD-09, RF-05).

## R-03 · Niveles

- **Decisión**: orden `STP_AUTO` < `CHECKER_L1` < `CHECKER_L2` < `CHECKER_MAX`. Los niveles de cada usuario viven en la matriz (`checkerLevels: { revisor_luis: 'CHECKER_L1', gerente_rosa: 'CHECKER_MAX' }`), porque son parte de la delegación de autoridad de la empresa.

## R-04 · Segregación de funciones

- **Decisión**: `checkSegregation(entry, { approverId, uploaderIds, exceptions })` rechaza si `approverId` ∈ `{ entry.createdBy } ∪ entry.intervenedBy ∪ uploaderIds ∪ { entry.reversalRequestedBy }`. `uploaderIds` sale de `RawPayload.receivedBy` del documento (y de sus adjuntos). Una excepción vigente de la matriz (`{ userId, scope: { documentTypeCodes?, maxTotalMinor? }, reason, createdBy, createdAt }`) la permite y queda en la firma.

## R-05 · Firma simulada

- **Decisión**: `contentForSignature(entry)` = JSON con claves ordenadas de `{ id, tenantId, documentTypeCode, operationTypeCode, legalBookCode, accountingDate, currency, fx, lines: [{ lineNo, side, accountCode, amountMinor, functionalAmountMinor, dimensions }] }`. Luego, `contentHash = sha256(content)` y `signature = sha256(contentHash + '|' + signerId + '|' + role + '|' + level + '|' + signedAt)`. `verifySignature(entry, signature)` recalcula ambos valores. Las huellas usan `serviceKit.sha256`.
- **Justificación**: constitución II ("firma = hash SHA-256 de contenido + usuario + timestamp").

## R-06 · Disparo de la decisión y STP

- **Decisión**: `approvalService.onReadyForApproval` se suscribe a `JournalEntryDrafted` (que el spec 003 publica al pasar a `PENDING_APPROVAL`), evalúa y guarda la decisión en `entry.approvalDecision`. Si es `STP_AUTO` y `demoSettings.signingServiceDown` es falso, firma como el agente `stp-agent` (rol `SYSTEM`, nivel `STP_AUTO`) y llama a `postEntry`. Si el servicio de firmas está caído, deja `entry.approvalDecision.blockedBy = 'SIGNING_SERVICE_DOWN'` y crea una alerta. Al apagar el interruptor, `retryBlockedStp(ctx)` procesa los bloqueados.

## R-07 · Punto único de publicación

- **Decisión**: `src/services/posting/postingService.js` con `postEntry(ctx, { entry, signature })`: hace la transición `PENDING_APPROVAL → POSTED`, guarda la firma y publica `JournalEntryPosted` (SDD §11) en el bus. El spec 005 reemplaza la implementación interna (outbox, libro hash-chained y proyecciones) **sin cambiar la firma de la función**.

## R-08 · Volver a interpretar un rechazado

- **Decisión**: `stagingService.reinterpretRejected(ctx, { journalEntryId })` (lo agrega esta feature al servicio del spec 003) crea un asiento nuevo para el mismo `intakeRecordId` a partir de la revisión vigente del documento, con `supersedesEntryId`, y deja en el rechazado `supersededByEntryId`. El nuevo asiento sigue el flujo del spec 003.

## R-09 · Usuario de demo nuevo

- **Decisión**: agregar `gerente_rosa` (Rosa Gerente, rol `Checker`) en `iniciarSesion` de `AccountingContext.jsx`, un botón de demo en `LoginView.jsx` y un usuario en `accessFixtures.js` con `TPL_CHECKER` en las empresas `01` y `02`. Su nivel lo da la matriz.

## R-10 · Permisos

`VIEW_APPROVALS` (todos), `APPROVE` y `REJECT` (CHECKER), `EDIT_DOA_MATRIX` (ADMIN), `VIEW_DOA_MATRIX` (todos) y `REINTERPRET_REJECTED` (MAKER). Las operaciones `APPROVE` y `REJECT` ya existen en la matriz de permisos: se conservan solo para `CHECKER`.
