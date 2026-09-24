---

description: "Lista de tareas para implementar la Interpretación Contable, Validación y Bandeja del Maker"
---

# Tasks: Interpretación Contable, Validación y Bandeja del Maker

**Input**: `specs/003-traduccion-validacion-staging/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Prerequisites**: specs 001 y 002 implementados y en verde.

**Tests**: SÍ (constitución V).

## Reglas para quien implementa

1. Leer SDD §5.4 a §5.6, §10.2 y §13.2, el data-model y los contratos. Manda el contrato.
2. **No duplicar** el razonamiento contable: esquema, perspectiva, clasificación, selección y evaluación se hacen **solo** con `accountingEngine.interpret` del spec 001.
3. Dominio puro en `src/domain/journal/`; sin reglas de país.
4. Toda corrección crea una **revisión nueva** del documento; nunca se modifica una revisión existente ni el original.
5. Tras cada fase: `npx vitest run` y `npm run build` en verde.

---

## Phase 1: Setup

- [ ] T001 Verificar que los specs 001 y 002 están en verde; crear las carpetas `src/domain/journal/__tests__/`, `src/services/journal/__tests__/` y `src/components/journal/`
- [ ] T002 [P] Agregar a `src/domain/ingestion/permissions.js` las operaciones de [contracts/services.md §3](contracts/services.md), con pruebas
- [ ] T003 [P] Agregar a `src/domain/ingestion/audit.js` las acciones `INTERPRETATION_RUN`, `DOCUMENT_REVISED`, `DOCUMENT_CLASSIFIED_MANUALLY` y `LATE_REGISTRATION_CONFIRMED`
- [ ] T004 [P] Agregar `FX_RATE_UNAVAILABLE` y `LATE_REGISTRATION_LIMIT` a `PENDING_CODES` en `src/domain/accounting/types.js`
- [ ] T005 [P] Datos: `functionalCurrency: 'PEN'` y `lateRegistration` en `src/data/mockEmpresas.js`; `fxRateType: 'SELL'` en `src/data/jurisdictions/pe/pack.js`; `lateRegistrationMonths` en `src/data/jurisdictions/pe/documentTypes.js` ([data-model.md §5](data-model.md)). Agregar el período `2026-10` `ABIERTO` a la empresa `01` para las pruebas de registro tardío.

---

## Phase 2: Foundational

- [ ] T006 Completar la tabla de `src/domain/ingestion/stateMachine.js` según research R-04 y actualizar `src/domain/ingestion/__tests__/stateMachine.test.js` (todas las transiciones válidas y ejemplos de inválidas)
- [ ] T007 [P] Crear `src/domain/journal/types.js` con los `@typedef` de [data-model.md](data-model.md) §1–§4
- [ ] T008 [P] Extraer `requiredPaths(documentType)` de `src/domain/ingestion/intake/intakeDecision.js` como export reutilizable (sin cambiar su comportamiento; pruebas del spec 002 en verde)
- [ ] T009 Crear `src/services/journal/journalRepository.js`: `getEntry`, `listEntries`, `saveEntry(entry, expectedVersion)` (usa `upsertVersioned`, `CONFLICT` si no coincide), `getDocument(id, revision?)`, `listRevisions(id)`, `appendRevision(document)` (rechaza revisiones existentes), `canonicalIndex(tenantId)` (para referencias)

---

## Phase 3: User Story 1 — Interpretación automática (Priority: P1) 🎯 MVP

**Independent Test**: DOC-01 → `PENDING_APPROVAL` con 5 líneas (spec US1).

- [ ] T010 [P] [US1] Escribir `src/domain/journal/__tests__/accountingDate.test.js` e implementar `src/domain/journal/accountingDate.js` (research R-07, [contracts/domain-api.md](contracts/domain-api.md))
- [ ] T011 [P] [US1] Escribir `src/domain/journal/__tests__/entryValidation.test.js` e implementar `src/domain/journal/entryValidation.js` (research R-08; usa `checkBalance` del spec 001)
- [ ] T012 [P] [US1] Escribir `src/domain/journal/__tests__/preInterpretation.test.js` e implementar `src/domain/journal/preInterpretation.js` (research R-05)
- [ ] T013 [US1] Escribir `src/domain/journal/__tests__/interpretation.test.js` e implementar `src/domain/journal/interpretation.js` (`interpretForEntry`, `diffRuns`): orden de pasos del data-model §3, corte en el primer paso con motivos (que devuelve todos los motivos de ese paso), `entryPatch` completo (líneas, glosa, libro, plantilla, fx, fechas, `configVersions`, traza con historial) y eventos `DocumentClassified`, `TemplateSelected` y `JournalEntryDrafted` o `JournalEntrySentToStaging`. Usar un `context` de prueba con el paquete PE real y la semilla de la empresa `01`.
- [ ] T014 [US1] Implementar `src/services/journal/interpretationService.js` (`interpretIntakeRecord`, `onDocumentReceived`) según [contracts/services.md §1](contracts/services.md): arma el `context` con `accountingEngine.getInterpretationContext` + FX, períodos, política y `canonicalIndex`; crea el asiento (`DRAFT`) o lo actualiza; aplica las transiciones con `assertTransition`; registra el uso de plantilla en `PENDING_APPROVAL`; actualiza `IntakeRecord.processingStatus`; publica eventos y audita
- [ ] T015 [US1] Crear `src/services/journal/index.js` (exporta servicios y suscribe `onDocumentReceived` a `DocumentReceived` del `eventBus`) e importarlo desde `src/services/ingestion/index.js` para que la suscripción exista al cargar la app
- [ ] T016 [P] [US1] Escribir `src/services/journal/__tests__/interpretationService.test.js`: DOC-01, DOC-03 (tras DOC-01), DOC-04, DOC-06 y DOC-07 llegan a `PENDING_APPROVAL` con la plantilla del catálogo; libro destino correcto; `templateUsage` incrementado una vez; registros `DUPLICATE` o `FAILED` → `NOT_INTERPRETABLE`; guía de remisión → `ARCHIVED_REFERENCE`
- [ ] T017 [P] [US1] Crear `src/components/journal/EntryLinesView.jsx` (Debe/Haber con totales, cuenta + descripción, rol, dimensiones, importe original y tasa si aplica) y `src/components/journal/InterpretationTraceView.jsx` (pasos con ✔/⏸, resumen y detalle desplegable; historial de intentos con `changedFromStep`)
- [ ] T018 [US1] Crear `src/components/journal/EntryDetailModal.jsx` (pestañas Asiento · Documento y original · Traza · Revisiones · Historial de estados) y `src/views/AsientosView.jsx` (lista por estado con `MetricCard`; registrar en `Sidebar.jsx` y `App.jsx`, ícono `BookCheck`)

**Checkpoint**: los documentos claros llegan solos a `PENDING_APPROVAL`.

---

## Phase 4: User Story 2 — Detener lo dudoso (Priority: P1)

**Independent Test**: DOC-02, DOC-08, DOC-10, DOC-11 y DOC-15 con sus motivos (spec US2).

- [ ] T019 [US2] Escribir `src/domain/journal/__tests__/interpretation.pending.test.js`: un caso por motivo del data-model §2 (con los documentos de prueba cuando existan y con documentos construidos en el test para `REFERENCE_NOT_FOUND`, `NO_TEMPLATE`, `ACCOUNT_UNRESOLVED`, `UNBALANCED` e `INVALID_AMOUNT`); cada motivo con `step`, `details` y `resolution`
- [ ] T020 [US2] Ajustar `interpretation.js` y `interpretationService.js` hasta que pase T019 (incluye `PENDING_INPUT` sin líneas cuando se detiene antes de evaluar)
- [ ] T021 [US2] Escribir `src/services/journal/__tests__/interpretation.e2e.test.js`, fase 1: cargar DOC-01 … DOC-16 en orden con los servicios del spec 002 y verificar `expected.interpretation` de cada documento del catálogo (SC-001)
- [ ] T022 [P] [US2] Crear `src/components/journal/ReasonList.jsx` (cada motivo con su paso, mensaje en español, detalle y botón de la acción sugerida)

---

## Phase 5: User Story 3 — Resolver pendientes (Priority: P1)

**Independent Test**: verificar DOC-10 y clasificar DOC-11 (spec US3).

- [ ] T023 [P] [US3] Escribir `src/domain/journal/__tests__/makerActions.test.js` e implementar `src/domain/journal/makerActions.js` (`applyMakerAction`, `buildProposedRule`) según research R-09 y R-11
- [ ] T024 [US3] Implementar en `src/services/journal/stagingService.js`: `queryStaging`, `getJournalEntry`, `listJournalEntries` y `applyMakerAction` (valida versión → aplica la acción → guarda la revisión y el parche → re-interpreta → guarda el asiento → audita; `proposeRule` crea la regla `PROPOSED` con el servicio de reglas del spec 001). Ajustar `classificationRuleService.saveClassificationRule` para aceptar `PROPOSE_CLASSIFICATION_RULE` solo con `status: 'PROPOSED'`.
- [ ] T025 [P] [US3] Escribir `src/services/journal/__tests__/stagingService.test.js`: cada acción lleva a su resultado esperado; `manualIntervention` e `intervenedBy`; revisión nueva con `changes`; el original y las revisiones anteriores no cambian; `CONFLICT`; `CHECKER` → `FORBIDDEN`
- [ ] T026 [US3] Completar `interpretation.e2e.test.js`, fase 2: resolver DOC-02 (dimensión), DOC-10 (verificar), DOC-11 (clasificar como activo fijo), DOC-15 (agregar referencia) → `PENDING_APPROVAL`; DOC-08 clasificado como `SERVICE_SALE` → `NO_TEMPLATE`
- [ ] T027 [P] [US3] Crear `src/components/journal/VerifyFieldsPanel.jsx` (lista de campos dudosos con valor, confianza y ubicación; confirmar o corregir cada uno; el `OriginalViewer` queda visible al lado)
- [ ] T028 [P] [US3] Crear `src/components/journal/ClassificationPicker.jsx` (solo operaciones admitidas; por documento o por línea; casilla "Proponer como regla para este emisor") y `src/components/journal/DimensionEditor.jsx` (por línea y por documento, con los centros de costo usados en el mapa de cuentas)
- [ ] T029 [US3] Crear `src/components/journal/StagingWorkbench.jsx`: `OriginalViewer` (spec 002) a la izquierda; a la derecha, `ReasonList`, el panel de la acción del motivo seleccionado, `CanonicalDocumentPanel` en modo edición (solo si la acción es `EDIT_FIELDS`) y "Reintentar". Tras cada acción muestra el nuevo estado o los nuevos motivos.
- [ ] T030 [US3] Reescribir `src/views/BandejaView.jsx`: contadores por motivo (`MetricCard`), filtros, tabla y `StagingWorkbench` en `Modal` ancho. Solo el Maker ve las acciones.

**Checkpoint (MVP)**: US1–US3; E2E fases 1 y 2 en verde.

---

## Phase 6: User Story 4 — Moneda extranjera (Priority: P1)

- [ ] T031 [P] [US4] Escribir `src/domain/journal/__tests__/fxResolution.test.js` e implementar `src/domain/journal/fxResolution.js` (research R-06)
- [ ] T032 [US4] Prueba de servicio con DOC-05: servicio activo (tasa del 2026-09-11, `provisionalFxRate: false`, asiento cuadrado con `balancingLine`) y servicio caído (`demoSettings.fxServiceDown = true` → tasa anterior, `provisionalFxRate: true`); moneda sin tabla → `FX_RATE_UNAVAILABLE`
- [ ] T033 [US4] Mostrar en `EntryDetailModal.jsx` la moneda, la tasa, su fecha y la marca "Tasa provisional"; en `AsientosView.jsx`, un filtro "con tasa provisional"

---

## Phase 7: User Story 5 — Período y registro tardío (Priority: P2)

- [ ] T034 [US5] Prueba de servicio: factura del 2026-08-20 registrada con el formulario en la empresa `01` → `accountingDate` 2026-09-01, `lateRegistration`; la misma en la empresa `02` → `PERIOD_CLOSED` → `CONFIRM_LATE_REGISTRATION` → pasa; con un plazo excedido → `LATE_REGISTRATION_LIMIT`
- [ ] T035 [US5] Crear `src/components/journal/LateRegistrationDialog.jsx` (período de emisión, primer período abierto, meses de atraso, plazo; confirmar o cancelar) e integrarlo en `StagingWorkbench.jsx`

---

## Phase 8: User Story 6 — Lote y cancelación (Priority: P2)

- [ ] T036 [US6] Implementar `batchApply` en `stagingService.js` con resultado por documento; prueba con 3 documentos, uno con versión desactualizada
- [ ] T037 [US6] Implementar `CANCEL` (motivo obligatorio, `CANCELLED` terminal, `JournalEntryCancelled`); prueba de que no se puede reactivar
- [ ] T038 [P] [US6] Crear `src/components/journal/BatchActionBar.jsx` (clasificar, informar dimensión, reintentar o cancelar sobre la selección; resumen del resultado) y `src/components/journal/CancelEntryDialog.jsx`; integrarlos en `BandejaView.jsx`

---

## Phase 9: User Story 7 — Trazabilidad (Priority: P3)

- [ ] T039 [US7] Completar la pestaña **Revisiones** de `EntryDetailModal.jsx` (tabla de cambios por revisión: ruta, antes, después, quién y cuándo) y la pestaña **Historial de estados**; verificar con el asiento de DOC-02 tras informar la dimensión

---

## Phase 10: Polish

- [ ] T040 [P] Prueba de agnosticismo para `src/domain/journal/` (misma regla que el spec 001, T090)
- [ ] T041 [P] Actualizar `src/views/PendientesAprobacionView.jsx` (marcador) con un enlace a **Asientos** filtrado por `PENDING_APPROVAL`, mientras no exista el spec 004
- [ ] T042 `npx vitest run`, `npm run build` y los 10 escenarios de [quickstart.md](quickstart.md)

## Dependencies

F1 → F2 → US1 → US2 → US3 (MVP) → US4 ∥ US5 → US6 → US7 → Polish. US4 y US5 solo tocan `fxResolution` y `accountingDate` más sus pruebas, así que pueden adelantarse en paralelo a US2.
