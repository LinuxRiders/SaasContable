# Plan de Tareas: DoA y Checker

- [ ] T001 [P] [US1] Crear `src/data/mockDoAMatrix.js` con las reglas de negocio en centavos.
- [ ] T002 [P] [US1] Implementar `doaEngine.js` en `src/domain/ingestion/` evaluando monto y FX.
- [ ] T003 [S] [US1] Implementar tests en Vitest para `doaEngine.js` garantizando rutas a STP y Checker.

🛑 **CHECKPOINT:** Revisión del Motor DoA.

- [ ] T004 [P] [US2] Implementar `signatureService.js` en `src/domain/ingestion/` para el hash SHA-256.
- [ ] T005 [P] [US3] Implementar `approvalService.js` en `src/services/ingestion/`. Manejar transiciones a POSTED y REJECTED.
- [ ] T006 [S] [US5] Implementar reglas de Segregación de Funciones (SoD) en `approvalService.js`.
- [ ] T007 [S] [US3] Implementar tests de `approvalService.js` validando roles (Maker, Checker, Admin).
- [ ] T012 [P] [US3] Emitir evento `JournalEntryRejected` en `approvalService.js` durante el rechazo del asiento.

🛑 **CHECKPOINT:** Revisión de Servicios y SoD.

- [ ] T008 [P] [US3] Crear UI `PendientesAprobacionView.jsx` en `src/views/` con el listado.
- [ ] T009 [S] [US3] Crear componentes `ApprovalDetail` y `SignatureConfirm` en `src/components/ingestion/`.
- [ ] T010 [S] [US4] Conectar la UI con `approvalService.processApproval` (Aprobar y Rechazar).
- [ ] T011 [S] Integrar la vista en el menú principal (Layout/Router).

🛑 **CHECKPOINT:** Revisión de la Vista Checker y Fin de Feature.
