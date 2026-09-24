# 006 Reversiones Formales - Tareas

- [ ] T001 [P] [US1] Crear lógica de dominio para reversión en `src/domain/ingestion/reversalService.js` (inversión de líneas, setup de reversalOfId).
- [ ] T002 [P] [US1] Escribir tests unitarios (Vitest) para el dominio de reversión en `src/domain/ingestion/reversalService.test.js`.
- [ ] T003 [P] [US3] Agregar validaciones de negocio en el dominio (estado original debe ser POSTED, reglas de periodo/rol).
- [ ] T004 [P] [US1, US2] Implementar servicio asíncrono en `src/services/ingestion/reversalService.js` integrando persistencia `localStorage`.
- [ ] T005 [P] [US4] Añadir método `getReversalsForEntry` en el servicio y su test respectivo.
🛑 CHECKPOINT: Revisión humana del dominio y servicios. Validar inmutabilidad y reglas de negocio.
- [ ] T006 [S] [US1] Crear componente `ReversalRequestModal` en `src/components/ingestion/ReversalRequestModal.jsx`.
- [ ] T007 [S] [US1, US4] Actualizar `src/views/ingestion/JournalEntryDetailView.jsx` para integrar el botón de reversión y el listado de asientos vinculados.
- [ ] T008 [S] [US2] Asegurar que el nuevo asiento cargue correctamente en el visor existente de `DRAFT` / `PENDING_APPROVAL`.
🛑 CHECKPOINT: Revisión humana de la interfaz de usuario.
