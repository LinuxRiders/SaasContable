# Contrato: API de Dominio de Interpretación y Validación

**Feature**: 003-traduccion-validacion-staging · **Implementación**: `src/domain/journal/`

Funciones puras (reloj, IDs, catálogos, plan de cuentas, períodos y tasas inyectados).

| Módulo | Función | Descripción |
|---|---|---|
| `preInterpretation.js` | `checkExtractionConfidence(document, { documentType, threshold })` | `{ ok }` o `LOW_CONFIDENCE_EXTRACTION` (research R-05) |
| | `resolveReferences(document, { canonicalIndex })` | `{ ok, document }` con `resolvedDocumentId`, o `REFERENCE_NOT_FOUND` |
| `fxResolution.js` | `resolveDocumentFx(document, { functionalCurrency, rates, serviceDown, rateType })` | `{ ok, fx: null \| { rateMilli, rateDate, rateType, provisional } }` o `FX_RATE_UNAVAILABLE` |
| `accountingDate.js` | `resolveAccountingDate(issueDate, { periods, policy, lateRegistrationMonths, confirmedLate })` | `{ ok, accountingDate, accountingPeriod, lateRegistration }` o `PERIOD_CLOSED` / `LATE_REGISTRATION_LIMIT` (research R-07) |
| | `monthsBetween(periodA, periodB)` | entero |
| `entryValidation.js` | `validateEntry(entry, { chart, periods, policy, documentType })` | `{ ok, pending, accountingDate, accountingPeriod, lateRegistration }` (research R-08) |
| `interpretation.js` | `interpretForEntry({ document, previousEntry, context })` | ejecuta, en orden: confianza → referencias → FX → `interpretDocument` (spec 001) → `validateEntry`; devuelve `{ entryPatch, state: 'PENDING_APPROVAL' \| 'PENDING_INPUT', trace, events }`, sin persistir. `context` = `{ pack, documentType, tenantFiscalId, rules, candidatesFor, mapping, chart, functionalCurrency, fxRates, fxServiceDown, periods, lateRegistrationPolicy, canonicalIndex, threshold, now }` |
| | `diffRuns(prevTrace, nextTrace)` | primer paso que cambió (`changedFromStep`) |
| `makerActions.js` | `applyMakerAction(document, entry, action, { actor, now, pack, documentType })` | `{ ok, newRevision?, entryPatch }` o `{ ok: false, error }` (`OPERATION_NOT_ALLOWED`, `FIELD_NOT_EDITABLE`, `REASON_REQUIRED`) según research R-09 |
| | `buildProposedRule(document, classification, { actor })` | definición de regla `PROPOSED` (research R-11) |
| `stateMachine.js` (en `src/domain/ingestion/`) | `assertTransition(from, to)` | tabla completa del SDD §10.2 (research R-04) |
