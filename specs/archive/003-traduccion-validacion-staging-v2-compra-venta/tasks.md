# Tareas de Implementación: Spec 003

## Dominio: Traducción y Entidades
- [ ] T001 [P] [US1] Crear constantes `JournalState` y constructores en `src/domain/ingestion/journalEntry.js`.
- [ ] T002 [P] [US1] Implementar `translationEngine.js` para aplicar AST y retornar DRAFT.
- [ ] T003 [ ] [US2] Implementar `validationService.js` (RD-03, RD-09, RD-12) en `src/domain/ingestion/`.
- [ ] T004 [ ] [US2] Desarrollar `stateTransitions.js` para orquestar `DRAFT` -> `PENDING_APPROVAL` o `PENDING_INPUT`.
- [ ] T005 [ ] [US1,US2] Pruebas unitarias (Vitest) para validadores y estados.

🛑 **CHECKPOINT**: Revisión de Lógica de Dominio y Validaciones.

## Servicios: Aplicación
- [ ] T006 [P] [US1] Implementar `translationService.js` en `src/services/ingestion/`.
- [ ] T007 [ ] [US3] Implementar `stagingService.js` (listado, updateAndReevaluate) en `src/services/ingestion/`.
- [ ] T008 [ ] [US4] Agregar lógica de cancelación `cancelDocument` en `stagingService.js`.
- [ ] T009 [ ] [US5] Implementar query de SLA 48h en `stagingService.js`.
- [ ] T014 [ ] [US1, US2, US4] Implementar emisión de eventos (`JournalEntryDrafted`, `JournalEntrySentToStaging`, `JournalEntryCancelled`) en los servicios correspondientes de transición de estado.

🛑 **CHECKPOINT**: Revisión de Contratos de Servicios y Persistencia Local.

## UI: Bandeja Maker
- [ ] T010 [P] [US3] Crear componente `StagingGrid.jsx` en `src/components/ingestion/`.
- [ ] T011 [ ] [US3] Crear `MakerEditor.jsx` para completar tags y `DocumentDetail.jsx`.
- [ ] T012 [ ] [US3, US4] Ensamblar `BandejaView.jsx` en `src/views/` integrando los servicios.
- [ ] T013 [ ] [US3] Agregar manejo de errores de concurrencia optimista en la vista.

🛑 **CHECKPOINT**: Revisión Final de UI y Flujo HITL.
