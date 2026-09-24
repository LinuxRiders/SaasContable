# Implementation Plan: Delegación de Autoridad, Firma y Aprobación del Checker

**Branch**: `004-doa-aprobacion-checker` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

## Summary

Evaluar cada asiento en `PENDING_APPROVAL` con una matriz DoA versionada, escrita en el lenguaje de expresiones del spec 001 sobre un contexto de aprobación, más un piso fijo del sistema. Lo de bajo riesgo se aprueba por STP con firma simulada verificable. Lo demás exige un Checker del nivel requerido, validado contra la SoD completa (creador, intervinientes, quien subió el documento). Incluye rechazo con motivo y reinterpretación, y simulación de la caída del servicio de firmas. La entrega a publicación pasa por un único punto, `postEntry`, que el spec 005 enriquece.

## Technical Context

JavaScript ES2022 + JSDoc · React 18 · sin dependencias nuevas · Storage: `doaMatrix`, `signatures` (solo agregado), `alerts` y los campos nuevos de `journalEntries` · Vitest.

## Constitution Check

| Principio | Estado | Cómo se cumple |
|---|---|---|
| I | ✅ | Servicios `async`; `repository.js`. |
| II | ✅ | RD-05 (`canApprove` en el servicio), RD-06 (firma SHA-256 verificable), RD-09 (piso fijo), RD-12 (período al firmar); transiciones del SDD §10.2. |
| III | ✅ | `src/domain/approval/` puro; matriz como datos. |
| IV | ✅ | Niveles por usuario en la matriz; SoD sin *bypass* de Admin; auditoría de denegaciones. |
| V | ✅ | Pruebas de decisión, SoD y firma, más E2E con los documentos de prueba. |
| VI | ✅ | Reutiliza el lenguaje de expresiones y Web Crypto. |
| VII | ✅ | `PendientesAprobacionView` reescrita; `MatrizAprobacionView` nueva; `EntryDetailModal` del spec 003. |

## Project Structure

```text
src/
├── domain/approval/  types.js · approvalContext.js · decideApproval.js · segregation.js · signature.js · matrixDiff.js · __tests__/
├── data/mockDoaMatrix.js                     # semilla data-model §1
├── services/
│   ├── approval/approvalService.js · doaMatrixService.js · index.js (suscripción a JournalEntryDrafted)
│   └── posting/postingService.js             # postEntry (lo amplía el spec 005)
├── components/approval/  ApprovalDecisionPanel.jsx · SignDialog.jsx · RejectDialog.jsx · SignatureBadge.jsx · DoaMatrixEditor.jsx
└── views/  PendientesAprobacionView.jsx (reescrita) · MatrizAprobacionView.jsx (nueva)
```

Además: `AccountingContext.jsx`, `LoginView.jsx` y `accessFixtures.js` (usuario `gerente_rosa`); `src/domain/accounting/expressions/` (contexto `approval.*`); `stagingService.js` del spec 003 (`reinterpretRejected`).

## Complexity Tracking

Sin violaciones. Extender el evaluador de expresiones con un contexto `extra` es compatible con el spec 001: se agrega una prueba de regresión.
