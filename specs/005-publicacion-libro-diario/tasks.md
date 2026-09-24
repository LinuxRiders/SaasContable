---

description: "Lista de tareas para implementar la Publicación Atómica, el Libro Diario y los Registros Legales"
---

# Tasks: Publicación Atómica, Libro Diario y Registros Legales

**Input**: `specs/005-publicacion-libro-diario/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md)

**Prerequisites**: specs 001 a 004 en verde. **Tests**: SÍ.

**Reglas**:

- `postEntry` conserva su firma del spec 004.
- Los consumidores son idempotentes.
- Los módulos Compras, Ventas, Tesorería, Libros, Liquidación IGV y Cierre **no** se refactorizan: solo leen la fuente adicional que expone el contexto.

---

## Phase 1: Setup

- [ ] T001 Crear `src/domain/ledger/__tests__/`, `src/services/ledger/__tests__/` y `src/components/ledger/`; permisos de research R-08 y acciones de auditoría (`OUTBOX_DISPATCHED`, `OUTBOX_FAILED`, `LEDGER_APPENDED`, `LEDGER_VERIFIED`, `PROJECTIONS_REBUILT`) con pruebas
- [ ] T002 [P] `demoSettings.busDown = false` en la semilla; colecciones vacías del data-model por empresa; el reset las limpia
- [ ] T003 [P] Implementar `repository.setCollections(tenantId, map)` en `src/services/storage/repository.js` con prueba de todo o nada (simular `QuotaExceededError` en la segunda escritura con `memoryStorage`)

## Phase 2: Foundational

- [ ] T004 [P] Crear `src/domain/ledger/types.js` y `src/domain/ledger/postedEvent.js` (`buildPostedEvent`), con prueba del payload del data-model
- [ ] T005 Reimplementar `postEntry` y agregar `dispatchOutbox` y `setBusDown` en `src/services/posting/postingService.js` (research R-01); el bus entrega a los consumidores registrados en `src/services/ledger/consumers.js`

## Phase 3: US1 — Publicación atómica (P1) 🎯 MVP

- [ ] T006 [US1] Escribir `src/services/ledger/__tests__/posting.test.js`: bus activo; bus caído; 3 fallos y restablecimiento; reentrega del mismo evento; intento de modificar un `POSTED` → rechazo (RD-07) en `journalRepository.saveEntry` (guardia nueva: no se guardan asientos `POSTED` o `POSTED_PENDING_PUBLISH` salvo por `postingService`)
- [ ] T007 [US1] Implementar la guardia de inmutabilidad en `src/services/journal/journalRepository.js` y hacer pasar T006
- [ ] T008 [P] [US1] Crear `src/components/ledger/OutboxPanel.jsx` y `src/views/PublicacionView.jsx` (eventos pendientes y entregados, intentos, último error, "Reintentar publicación", interruptor "Bus caído"); registrarla en `Sidebar.jsx` y `App.jsx`

## Phase 4: US2 — Diario verificable (P1)

- [ ] T009 [P] [US2] Escribir `src/domain/ledger/__tests__/ledgerChain.test.js` e implementar `src/domain/ledger/ledgerChain.js` (`buildLedgerEntry`, `verifyLedgerChain`)
- [ ] T010 [US2] Implementar `ledgerConsumer` (idempotente, `appendOnly`) y `src/services/ledger/ledgerService.js` (`listLedger`, `verifyLedger`), con pruebas
- [ ] T011 [P] [US2] Crear `src/components/ledger/LedgerTable.jsx` y `src/components/ledger/ChainVerificationPanel.jsx`, y `src/views/LibroDiarioView.jsx` (anotaciones con huellas abreviadas y verificación); registrarla

## Phase 5: US3 — Registros legales (P1)

- [ ] T012 [P] [US3] Crear `src/data/jurisdictions/pe/legalBookRegisters.js` (data-model) e incorporarlo a `pack.legalBooks[i].register` y `subdiarioLabel`; validar las columnas con `validateExpression` en `pePack.test.js`
- [ ] T013 [P] [US3] Escribir `src/domain/ledger/__tests__/registerProjection.test.js` e implementar `src/domain/ledger/registerProjection.js` y `src/domain/ledger/csv.js` (DOC-01, DOC-03 negativo, DOC-04, DOC-06, extracto bancario; asiento con `PE.JOURNAL` → `null`)
- [ ] T014 [US3] Implementar `registerConsumer` y `src/services/ledger/registerService.js` (`listRegister`, `exportRegisterCsv`)
- [ ] T015 [US3] Crear `src/components/ledger/RegisterTable.jsx` y `src/views/RegistrosLegalesView.jsx` (pestañas por libro del paquete, filtro de período, totales, exportar CSV, enlace al asiento); registrarla

## Phase 6: US4 — Integración con los módulos existentes (P2)

- [ ] T016 [P] [US4] Escribir `src/domain/ledger/__tests__/voucherProjection.test.js` e implementar `src/domain/ledger/voucherProjection.js` (`projectVoucher`, `projectInvoice`)
- [ ] T017 [US4] Implementar `voucherProjectionConsumer` y `src/services/ledger/projectionService.js` (`getProjectedVouchers`, `getProjectedInvoices`, `subscribe`, `rebuildProjections`)
- [ ] T018 [US4] En `src/context/AccountingContext.jsx`: cargar las proyecciones al iniciar y cuando `projectionService.subscribe` avise, y exponer `vouchers`, `compras` y `ventas` combinados (en memoria + proyectados). No cambiar la lógica de registrar compras o ventas.
- [ ] T019 [US4] En `src/views/LibrosContablesView.jsx`, mostrar el distintivo "Motor contable" y el enlace al asiento cuando `origen === 'MOTOR'`, y ocultar para esos vouchers cualquier acción de edición
- [ ] T020 [US4] Prueba E2E `src/services/ledger/__tests__/ledger.e2e.test.js` (quickstart, fila E2E): la suma de IGV que hace `LiquidacionIGVView` (extraer esa suma a una función pura exportada en el mismo archivo, sin cambiar su resultado) coincide con los registros de Compras y Ventas

## Phase 7: US5 — Trazabilidad (P2)

- [ ] T021 [US5] Implementar `src/services/ledger/traceService.js` (`getEntryTrace`, research R-07) con prueba para el asiento de DOC-10
- [ ] T022 [US5] Crear `src/components/ledger/TraceTimeline.jsx` (pasos con actor, rol, fecha, `traceId` y ✔/✖ de cada huella) y `src/views/TrazabilidadView.jsx` (búsqueda por asiento, documento o `traceId`); agregar "Ver trazabilidad" en `EntryDetailModal.jsx`; registrarla

## Phase 8: Polish

- [ ] T023 [P] Prueba de agnosticismo para `src/domain/ledger/`
- [ ] T024 "Reconstruir proyecciones" en `RegistrosLegalesView.jsx` (Admin y Auditor), con prueba de que reconstruir produce los mismos datos
- [ ] T025 `npx vitest run`, `npm run build` y los 6 escenarios del quickstart

## Dependencies

F1 → F2 → US1 (MVP) → US2 → US3 → US4 → US5 → Polish. US2, US3 y US4 son consumidores independientes, así que pueden hacerse en paralelo tras US1.
