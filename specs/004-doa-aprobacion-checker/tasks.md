---

description: "Lista de tareas para implementar la DoA, firma y aprobación del Checker"
---

# Tasks: Delegación de Autoridad, Firma y Aprobación del Checker

**Input**: `specs/004-doa-aprobacion-checker/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md)

**Prerequisites**: specs 001 a 003 en verde. **Tests**: SÍ.

**Reglas**:

- La SoD se valida en el servicio; ningún rol la salta sin una excepción registrada.
- La matriz es un dato y se escribe con el lenguaje de expresiones del spec 001.
- `postEntry` es el único camino a `POSTED`.

---

## Phase 1: Setup

- [ ] T001 Crear `src/domain/approval/__tests__/`, `src/services/approval/__tests__/`, `src/services/posting/` y `src/components/approval/`
- [ ] T002 [P] Permisos de research R-10 en `src/domain/ingestion/permissions.js` (con pruebas) y acciones de auditoría del contrato en `src/domain/ingestion/audit.js`
- [ ] T003 [P] Usuario `gerente_rosa` (research R-09) en `src/context/AccountingContext.jsx`, `src/views/LoginView.jsx` (botón "Checker nivel máximo") y `src/components/gestion-usuarios-empresas/fixtures/accessFixtures.js`
- [ ] T004 [P] `demoSettings.signingServiceDown = false` en la semilla de `src/services/ingestion/demoService.js`; colecciones `doaMatrix`, `signatures` y `alerts` por empresa

## Phase 2: Foundational

- [ ] T005 Extender `evaluateExpression` y `validateExpression` (spec 001) con el contexto `extra` y las rutas `approval.*` ([contracts/api.md §1](contracts/api.md)); prueba de regresión: todas las pruebas del spec 001 siguen en verde
- [ ] T006 [P] Crear `src/domain/approval/types.js` (data-model §1–§4) y `src/data/mockDoaMatrix.js` con la semilla del data-model §1; sembrar la matriz v1 en cada empresa
- [ ] T007 Crear `src/services/posting/postingService.js` con `postEntry` (research R-07): `assertTransition('PENDING_APPROVAL', 'POSTED')`, guardar `approvedBy`, `signatureRef` y `signedAt`, publicar `JournalEntryPosted` con el payload del SDD §11 (líneas con `side`, tipo de documento, operación, libro, documento de origen, firma, fx, `isReversal`, `reversalOfId`) y auditar `ENTRY_POSTED`

## Phase 3: US1 — Decisión de nivel (P1) 🎯 MVP

- [ ] T008 [P] [US1] Escribir `src/domain/approval/__tests__/decideApproval.test.js` (cada regla semilla, máximo, piso del sistema, regla por defecto y determinismo) e implementar `src/domain/approval/approvalContext.js` y `src/domain/approval/decideApproval.js` (research R-01 a R-03)
- [ ] T009 [US1] Implementar `onReadyForApproval` en `src/services/approval/approvalService.js` (solo decisión y persistencia en `entry.approvalDecision`; auditoría `APPROVAL_DECIDED`) y suscribirlo a `JournalEntryDrafted` en `src/services/approval/index.js`, importado desde `src/services/journal/index.js`
- [ ] T010 [P] [US1] Crear `src/components/approval/ApprovalDecisionPanel.jsx` (nivel, motivos con origen matriz o sistema, versión de matriz) e integrarlo como pestaña "Aprobación" en `EntryDetailModal.jsx` (spec 003)

## Phase 4: US2 — STP (P1)

- [ ] T011 [P] [US2] Escribir `src/domain/approval/__tests__/signature.test.js` e implementar `src/domain/approval/signature.js` (research R-05)
- [ ] T012 [US2] Completar `onReadyForApproval`: STP → firma `stp-agent` → `postEntry`; servicio caído → `blockedBy` + alerta `SIGNING_SERVICE_DOWN` + `STP_BLOCKED`; implementar `retryBlockedStp` y `setSigningServiceDown`
- [ ] T013 [US2] Escribir `src/services/approval/__tests__/approval.e2e.test.js`, parte STP: DOC-01, DOC-03, DOC-04 y DOC-06 llegan a `POSTED` con firma verificable; con el servicio caído quedan bloqueados y al restablecerlo pasan a `POSTED`
- [ ] T014 [P] [US2] Agregar el interruptor "Servicio de firmas caído" al panel de demo existente (`BackupsView.jsx`) y el `SignatureBadge.jsx` en `EntryDetailModal.jsx`

## Phase 5: US3 — Aprobación del Checker (P1)

- [ ] T015 [P] [US3] Escribir `src/domain/approval/__tests__/segregation.test.js` e implementar `src/domain/approval/segregation.js` (`canApprove`, research R-04)
- [ ] T016 [US3] Implementar `queryPendingApproval` y `approveEntry` (orden: versión → período → nivel → SoD → firma → `postEntry`; cada denegación con `APPROVAL_DENIED`)
- [ ] T017 [US3] Completar `approval.e2e.test.js`: DOC-07, DOC-09, DOC-10 y DOC-16 → nivel 1; `contador_maria` no puede aprobar DOC-10 (SoD); `revisor_luis` sí; asiento de S/ 60,000 → `revisor_luis` `INSUFFICIENT_LEVEL`, `gerente_rosa` aprueba
- [ ] T018 [P] [US3] Crear `src/components/approval/SignDialog.jsx` (resumen del asiento, huella de contenido y confirmación)
- [ ] T019 [US3] Reescribir `src/views/PendientesAprobacionView.jsx`: contadores por nivel, tabla (documento, emisor, total funcional, nivel, marcas, "puedes aprobar" o el motivo por el que no), `EntryDetailModal` con los botones Aprobar y Rechazar

## Phase 6: US4 — Rechazo (P1)

- [ ] T020 [US4] Implementar `rejectEntry` y, en `src/services/journal/stagingService.js`, `reinterpretRejected` (research R-08), con pruebas
- [ ] T021 [P] [US4] Crear `src/components/approval/RejectDialog.jsx` (motivo obligatorio); en `AsientosView.jsx`, mostrar el motivo y "Volver a interpretar" para el Maker en los rechazados

## Phase 7: US5 — Matriz (P2)

- [ ] T022 [P] [US5] Escribir `src/domain/approval/__tests__/matrixDiff.test.js` e implementar `src/domain/approval/matrixDiff.js`
- [ ] T023 [US5] Implementar `src/services/approval/doaMatrixService.js` (`getDoaMatrix`, `listDoaMatrixVersions`, `saveDoaMatrix`), con pruebas (expresión inválida, nivel desconocido, `CONFLICT` y aislamiento)
- [ ] T024 [US5] Crear `src/components/approval/DoaMatrixEditor.jsx` (reglas con `ExpressionBuilder` del spec 001 en contexto de aprobación, niveles por Checker, excepciones de SoD con motivo y vencimiento, historial con diff) y `src/views/MatrizAprobacionView.jsx`; registrarla en `Sidebar.jsx` y `App.jsx` (edita el Admin; ven todos)

## Phase 8: Polish

- [ ] T025 [P] Prueba de agnosticismo para `src/domain/approval/`
- [ ] T026 `npx vitest run`, `npm run build` y los 6 escenarios del [quickstart.md](quickstart.md)

## Dependencies

F1 → F2 → US1 → US2 → US3 (MVP) → US4 → US5 → Polish.
