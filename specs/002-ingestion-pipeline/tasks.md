---
description: "Lista de tareas para implementar la Ingestión Multiformato de Documentos Sustentatorios"
---

# Tasks: Ingestión Multiformato de Documentos Sustentatorios

**Input**: `specs/002-ingestion-pipeline/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Prerequisites**: spec 001 implementado y en verde.

**Tests**: SÍ (constitución V). Las pruebas usan los archivos reales de `public/fixtures/documents/`, leídos con `node:fs`.

## Reglas para quien implementa

1. Leer SDD §5.3, §13.1 y §20.9, el [data-model](data-model.md) y los [contratos](contracts/). Si una tarea y un contrato difieren, manda el contrato.
2. **No regenerar** `public/fixtures/documents/` ni editar `src/data/fixtures/documentFixtures.js`: están generados y sus huellas son la clave del extractor simulado.
3. En `src/domain/ingestion/intake/` no puede haber reglas de país: nada de `RUC`, `IGV`, `SUNAT`, códigos `'01'`/`'6'`/`'1000'` ni nombres de columnas; todo eso sale de `src/data/jurisdictions/pe/readingProfiles.js`.
4. Dominio puro (reloj, IDs, SHA-256 y `DOMParser` inyectados). Importes enteros en unidades mínimas.
5. Servicios con `ctx`, `authorize`, `ok`/`fail`, auditoría y `repository.js`.
6. Tras cada fase: `npx vitest run` y `npm run build` en verde.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Verificar que el spec 001 está en verde (`npx vitest run`) y que existen `public/fixtures/documents/` (15 archivos + README) y `src/data/fixtures/documentFixtures.js` con 16 entradas
- [x] T002 Crear las carpetas `src/domain/ingestion/intake/readers/`, `src/domain/ingestion/intake/__tests__/`, `src/services/events/`, `src/services/ingestion/__tests__/` y `src/components/intake/`
- [x] T003 [P] Agregar a `src/domain/ingestion/permissions.js` las operaciones `INGEST_DOCUMENTS` y `REGISTER_MANUAL_DOCUMENT` (MAKER), `VIEW_RECEIVED_DOCUMENTS` (todos) y `SET_DEMO_TOGGLES` (todos menos AUDITOR), con pruebas en `src/domain/ingestion/__tests__/permissions.test.js`
- [x] T004 [P] Agregar la acción `MANUAL_DOCUMENT_REGISTERED` a la lista permitida de `src/domain/ingestion/audit.js`
- [x] T005 [P] Crear `src/test-utils/fixtures.js` (solo para pruebas) con `readFixture(fileName)` → `{ buffer, text, sha256 }` usando `node:fs` y `node:crypto`, y `fixtureById(id)` desde `DOCUMENT_FIXTURES`

---

## Phase 2: Foundational (bloquea todas las historias)

- [ ] T006 [P] Escribir `src/domain/shared/__tests__/money.test.js` e implementar `src/domain/shared/money.js` con `parseDecimalToMinor(text, minorUnits)` según [contracts/domain-api.md §1](contracts/domain-api.md) (`"1180.00"`→118000, `"5"`→500, `"1.234"` con 2 → error, `"-1"` → error; usa `minorUnitsOf` de `currencies.js`)
- [ ] T007 [P] Escribir `src/domain/shared/__tests__/fiscalId.test.js` e implementar `src/domain/shared/fiscalId.js` con `validateFiscalId(value, def)`: patrón + `MOD11` con pesos y mapa del `def` (válidos: `20450656934`, `20100000009`, `10400000005`; inválido: `20100000000`)
- [ ] T008 Ampliar `fiscalIdTypes` en `src/data/jurisdictions/pe/pack.js` con `pattern` y `checkDigit` según [data-model.md §7](data-model.md)
- [ ] T009 [P] Crear `src/data/jurisdictions/pe/readingProfiles.js` con `peReadingProfiles` ([data-model.md §7](data-model.md)) y exponerlo como `pack.readingProfiles` en `src/data/jurisdictions/index.js`
- [ ] T010 [P] Crear `src/domain/ingestion/intake/types.js` con los `@typedef` de [data-model.md](data-model.md) §1–§6 (`RawPayload`, `IntakeRecord`, `DlqEntry`, `DomainEvent`, `CanonicalDraft`, `RowError`)
- [ ] T011 [P] Escribir `src/domain/ingestion/intake/__tests__/formatDetection.test.js` con los bytes reales de cada archivo de prueba (PDF, JPEG, PNG por firma aunque el MIME diga otra cosa; XML, JSON y CSV por contenido) e implementar `src/domain/ingestion/intake/formatDetection.js`
- [ ] T012 [P] Implementar `src/domain/ingestion/intake/readerRegistry.js` (`createReaderRegistry(readers)` → `select(meta)`) con prueba de orden de prioridad
- [ ] T013 [P] Escribir `src/domain/ingestion/intake/__tests__/canonicalBuilder.test.js` e implementar `src/domain/ingestion/intake/canonicalBuilder.js` (`buildCanonical`, `annotateFiscalIds`) según [data-model.md §3](data-model.md)
- [ ] T014 [P] Escribir `src/domain/ingestion/intake/__tests__/dedup.test.js` e implementar `src/domain/ingestion/intake/dedup.js` (`buildDedupKey`) según research R-08 (`F001-00000123` = `F001-123`; serie vacía; otro emisor distinto)
- [ ] T015 Escribir `src/domain/ingestion/intake/__tests__/intakeDecision.test.js` e implementar `src/domain/ingestion/intake/intakeDecision.js` (`decideIntake`) según research R-09: ajeno a la empresa, duplicado, campos obligatorios dudosos (calcula las rutas obligatorias desde el esquema), fecha futura como advertencia, identificador inválido
- [ ] T016 Implementar `src/domain/ingestion/intake/runIntake.js` según [contracts/domain-api.md §5](contracts/domain-api.md): detecta formato, selecciona lector, construye canónicos, anota identificadores, decide cada documento en orden actualizando un índice de huellas local, y arma registros, DLQ y eventos. Por ahora sin lectores registrados (los agregan las historias). Prueba mínima con un lector falso.
- [ ] T017 Crear `src/services/events/eventBus.js` según [contracts/services.md §2](contracts/services.md), con pruebas en `src/services/events/__tests__/eventBus.test.js` (publica, persiste en `<tenantId>:events`, un suscriptor que falla no afecta a otros)
- [ ] T018 Crear `src/services/ingestion/seedIngestion.js` (colecciones vacías `rawPayloads`, `intakeRecords`, `canonicalDocuments`, `dlq`, `dedupIndex` y `events` por empresa, y `demoSettings.extraction = { forceLowConfidence: false, forceUnreadable: false }`) e invocarlo desde `ensureSeeded` en `src/services/ingestion/demoService.js`. Agregar `csvProfiles: ['PE_BOLETAS_VENTA_V1']` a la empresa `01` en `src/data/mockEmpresas.js`.
- [ ] T019 Crear `src/services/ingestion/intakeService.js` con la estructura común (validación de `ctx`, permisos, tamaño, SHA-256 de bytes, `appendOnly` del original, `RawPayloadStored`, ejecución de `runIntake`, persistencia en el orden del contrato, auditoría) y la operación `ingestFiles`. Registrar los lectores desde un único `buildReaderRegistry()` en el servicio (los lectores se agregan en las historias). Exportar en `src/services/ingestion/index.js`.

**Checkpoint**: base en verde; `ingestFiles` guarda el original y envía a la DLQ cualquier formato (todavía no hay lectores).

---

## Phase 3: User Story 1 — Documento electrónico estructurado (Priority: P1) 🎯 MVP

**Goal**: XML UBL, JSON v1 y CSV producen canónicos correctos.

**Independent Test**: cargar DOC-01 y verificar el canónico completo con confianza 1.0 (spec US1).

- [ ] T020 [P] [US1] Escribir `src/domain/ingestion/intake/__tests__/ublReader.test.js` con DOC-01 a DOC-05 y DOC-13 (usar `new (require('happy-dom').Window)().DOMParser` o el global de happy-dom): tipo, serie, número, fechas, moneda, partes con `fiscalIdType` por `schemeID`, líneas con `itemCode`, impuestos por línea y total con `rateBp = 1800`, totales, referencia y motivo en DOC-03, perspectiva `null`, `sourceFormat: 'XML'` y confianza 1; DOC-13 → `MALFORMED`; raíz desconocida → `UNKNOWN_DOCUMENT_TYPE`
- [ ] T021 [US1] Implementar `src/domain/ingestion/intake/readers/ublReader.js` (research R-04, perfil `profiles.ubl`). Hacer pasar T020.
- [ ] T022 [P] [US1] Escribir `src/domain/ingestion/intake/__tests__/jsonDocumentReader.test.js` con DOC-06, DOC-07 y DOC-15, más casos inventados de esquema desconocido, moneda desconocida e importe decimal (→ `MALFORMED`), según [contracts/document-json-v1.md](contracts/document-json-v1.md)
- [ ] T023 [US1] Implementar `src/domain/ingestion/intake/readers/jsonDocumentReader.js`. Hacer pasar T022.
- [ ] T024 [P] [US1] Escribir `src/domain/ingestion/intake/__tests__/csvReader.test.js`: DOC-08 → 3 borradores (emisor = empresa, receptor con `fiscalIdType: 'DNI'`, línea, IGV, total); una fila con `valor_venta = "abc"` → `rowErrors[{ rowNumber: 2 }]` y las otras dos correctas; cabecera distinta → `CSV_PROFILE_MISMATCH` con `missingColumns`
- [ ] T025 [US1] Implementar `src/domain/ingestion/intake/readers/csvReader.js` (separador del perfil; campos entre comillas; líneas vacías ignoradas). Hacer pasar T024.
- [ ] T026 [US1] Registrar `ublReader`, `jsonDocumentReader` y `csvReader` en `buildReaderRegistry()` de `intakeService.js`; inyectar un `DOMParser` (el global del navegador)
- [ ] T027 [P] [US1] Escribir `src/services/ingestion/__tests__/intakeService.structured.test.js`: `ingestFiles` con DOC-01 (como `File` simulado) → `RECEIVED`, canónico guardado, eventos `RawPayloadStored` + `DocumentReceived`, auditoría; DOC-08 → 3 registros con `rowNumber`; un documento donde la empresa no figura → `NOT_FOR_TENANT`; `CHECKER` → `FORBIDDEN`; archivo de 301 KB → `PAYLOAD_TOO_LARGE` sin guardar nada
- [ ] T028 [P] [US1] Crear `src/components/intake/FileDropzone.jsx` (arrastrar o seleccionar varios archivos; muestra nombre, tamaño y tipo antes de cargar) y `src/components/intake/IntakeSummary.jsx` (tabla por archivo con el estado y las métricas del lote)
- [ ] T029 [US1] Reescribir `src/views/IngestionView.jsx` con la pestaña **Cargar archivos** (FileDropzone + IntakeSummary) y las pestañas vacías **Registro manual** y **Documentos de ejemplo**. Solo el Maker ve los controles de carga.

**Checkpoint**: DOC-01 a DOC-08 y DOC-15 se reciben desde la UI.

---

## Phase 4: User Story 2 — Foto o PDF (Priority: P1)

**Goal**: extractor simulado con confianza por campo.

**Independent Test**: DOC-09 con confianza alta; DOC-10 con 3 campos dudosos (spec US2).

- [ ] T030 [P] [US2] Escribir `src/domain/ingestion/intake/__tests__/simulatedExtractor.test.js`: DOC-09 (`IMAGE`), DOC-10 (campos bajo 0.85: `parties[ISSUER].fiscalId`, `taxes[VAT].amountMinor`, `totals.totalMinor`), DOC-11 (`PDF_SCANNED`), DOC-14 (`PDF_TEXT`), DOC-12 → `UNREADABLE`, huella desconocida → `UNREADABLE`, `forceLowConfidence` → todos los importes en 0.4, `forceUnreadable` → `UNREADABLE`, `notFound` conservado
- [ ] T031 [US2] Implementar `src/domain/ingestion/intake/readers/simulatedExtractor.js` (research R-06) y registrarlo en `buildReaderRegistry()` para `PDF` e `IMAGE`. Hacer pasar T030.
- [ ] T032 [US2] Implementar en `intakeService.js` las operaciones `getExtractionToggles` y `setExtractionToggles`, y leer los toggles de `demoSettings.extraction` en cada ingestión
- [ ] T033 [P] [US2] Crear `src/components/intake/ConfidenceBadge.jsx` (verde ≥ umbral, ámbar por debajo, rojo = 0 o no encontrado; tooltip con la ubicación)
- [ ] T034 [P] [US2] Crear `src/components/intake/OriginalViewer.jsx` según research R-11 (imagen con zoom, PDF en `iframe` con blob URL, XML/JSON formateado, CSV como tabla) a partir de `getOriginalContent`
- [ ] T035 [US2] Crear `src/components/intake/CanonicalDocumentPanel.jsx`: secciones Partes, Cabecera, Líneas, Impuestos, Retenciones, Referencias y Totales, cada valor con su `ConfidenceBadge`; prop `highlightPaths` para resaltar dudosos; modo solo lectura (el spec 003 le agrega edición)
- [ ] T036 [US2] Implementar `getOriginalContent` en `intakeService.js` (URL para `FIXTURE`, texto para `TEXT`, `data:` URL para `BASE64`)

**Checkpoint**: DOC-09 a DOC-12 y DOC-14 se procesan; el original se ve junto a los datos.

---

## Phase 5: User Story 3 — Duplicados (Priority: P1)

**Goal**: RD-04 entre cargas y entre formatos.

**Independent Test**: DOC-01 y luego DOC-14 → duplicado (spec US3).

- [ ] T037 [P] [US3] Escribir `src/services/ingestion/__tests__/intakeService.dedup.test.js`: el mismo XML dos veces → `DUPLICATE` con `duplicateOfIntakeRecordId` y original guardado igual; DOC-01 y luego DOC-14 → `DUPLICATE`; en un mismo lote con dos copias, la segunda es duplicada; `DocumentDuplicated` y auditoría `DUPLICATE_DETECTED`; el índice solo contiene documentos recibidos
- [ ] T038 [US3] Completar la persistencia de `dedupIndex` en `intakeService.js` (lectura antes de `runIntake`, escritura de `dedupIndexAdditions` después) y hacer pasar T037

---

## Phase 6: User Story 6 — Documentos de ejemplo (Priority: P1)

**Goal**: catálogo de los 16 documentos de prueba y la prueba E2E (SC-001).

**Independent Test**: cargar los 16 en orden y comparar con el esperado (spec US6).

- [ ] T039 [US6] Implementar `ingestSample` (descarga con `fetch(url)`, mismo camino que un archivo, `channel: 'SAMPLE'`, `contentRef: FIXTURE`) y `listSampleCatalog` en `intakeService.js`. En pruebas, inyectar un `fetch` que lee de `public/` con `node:fs`.
- [ ] T040 [US6] Escribir `src/domain/ingestion/intake/__tests__/fixtures.e2e.test.js` y `src/services/ingestion/__tests__/samples.e2e.test.js`: sobre la semilla, cargar DOC-01 … DOC-15 en orden (y DOC-16 por `registerManualDocument` cuando exista US4; mientras tanto, `it.todo`) y verificar exactamente la tabla de [data-model.md §8](data-model.md)
- [ ] T041 [US6] Crear `src/components/intake/SampleCatalog.jsx` (tarjetas con id, título, formato, "esperado", vista previa en `Modal` con `OriginalViewer`, botón "Cargar", interruptores "Forzar baja confianza" e "Ilegible") y llenar la pestaña **Documentos de ejemplo** de `IngestionView.jsx`

**Checkpoint (MVP)**: US1, US2, US3 y US6. La prueba E2E pasa (salvo DOC-16).

---

## Phase 7: User Story 4 — Registro manual (Priority: P2)

**Goal**: formulario generado desde el esquema del tipo (RF-18).

**Independent Test**: registrar DOC-16 (depreciación) desde el formulario (spec US4).

- [ ] T042 [P] [US4] Escribir `src/domain/ingestion/intake/__tests__/formReader.test.js` e implementar `src/domain/ingestion/intake/readers/formReader.js` (valores → borrador; emisor = empresa si la perspectiva del tipo es fija `INTERNAL`; `operationTypeCode` explícito; `verifiedByHuman: true`); registrarlo en `buildReaderRegistry()`
- [ ] T043 [US4] Implementar `registerManualDocument` en `intakeService.js` (valida obligatorios con el esquema antes de guardar, convierte importes con `parseDecimalToMinor`, guarda los valores como original `FORM` y el adjunto opcional como original `ATTACHMENT`, audita `MANUAL_DOCUMENT_REGISTERED`); completar DOC-16 en `samples.e2e.test.js` usando `manualForm` del catálogo
- [ ] T044 [US4] Crear `src/components/intake/ManualDocumentForm.jsx` (research R-13): selector de tipo, campos de cabecera y partes según el esquema, grilla de líneas, selector de operación si hay varias admitidas, adjunto opcional con vista previa, y validación de obligatorios. Llenar la pestaña **Registro manual** de `IngestionView.jsx`.

---

## Phase 8: User Story 5 — Documentos recibidos (Priority: P2)

**Goal**: bandeja con filtros y detalle original + datos.

**Independent Test**: tras los ejemplos, la bandeja muestra cada estado y el detalle lado a lado (spec US5).

- [ ] T045 [P] [US5] Implementar `listReceivedDocuments`, `getReceivedDocument` y `listDlqEntries` en `intakeService.js`, con pruebas en `src/services/ingestion/__tests__/intakeService.read.test.js` (filtros, paginación, aislamiento: la empresa `02` no ve nada de la `01`)
- [ ] T046 [US5] Crear `src/views/DocumentosRecibidosView.jsx`: `MetricCard` por estado; tabla (fecha, canal, formato, tipo, emisor, serie-número, total, estado, n.º de dudosos); filtros por estado, formato, tipo y fechas; detalle en `Modal` ancho con `OriginalViewer` a la izquierda y `CanonicalDocumentPanel` a la derecha (dudosos resaltados); para duplicados, enlace al original; para DLQ, el motivo. Registrarla en `src/components/Sidebar.jsx` (grupo "INGESTIÓN Y APROBACIÓN", ícono `FileSearch`) y `src/App.jsx`.

---

## Phase 9: User Story 7 — Varios archivos a la vez (Priority: P3)

- [ ] T047 [US7] Verificar que `ingestFiles` procesa en orden, que el error de un archivo no detiene a los demás y que `summary` cuenta correctamente; agregar la prueba en `src/services/ingestion/__tests__/intakeService.batch.test.js` con 5 archivos (DOC-01, DOC-06, DOC-12, DOC-13 y DOC-01 repetido)

---

## Phase 10: Polish & Cross-Cutting

- [ ] T048 [P] Escribir `src/domain/ingestion/intake/__tests__/agnosticism.test.js`: recorre los archivos de `src/domain/ingestion/intake/` (sin `__tests__`) y falla si encuentra `RUC`, `IGV`, `SUNAT`, `schemeID="6"`, los literales `'1000'` o `'01'`, o nombres de columnas del perfil CSV
- [ ] T049 [P] Verificar SC-006 con una prueba: tras ingerir, duplicar y reiniciar la vista, la huella de cada `RawPayload` recalculada coincide con la guardada
- [ ] T050 Actualizar el marcador de `src/views/BandejaView.jsx` para que enlace a **Documentos recibidos** mientras no exista el spec 003
- [ ] T051 `npx vitest run` y `npm run build` en verde; reproducir los 8 escenarios de [quickstart.md](quickstart.md)

---

## Dependencies & Execution Order

- F1 → F2 → US1 → (US2 ∥ US3) → US6 → (US4 ∥ US5) → US7 → Polish.
- US6 necesita los lectores de US1 y US2 y la deduplicación de US3 para que la prueba E2E pase completa.
- Dentro de cada historia: pruebas → lector o dominio → servicio → componentes → vista.

### Parallel Opportunities

- F2: T006 ∥ T007 ∥ T009 ∥ T010 ∥ T011 ∥ T012 ∥ T013 ∥ T014.
- US1: T020 ∥ T022 ∥ T024; luego T021, T023 y T025 en paralelo (archivos distintos).
- US2: T033 ∥ T034 mientras se implementa T031.

## Implementation Strategy

MVP = F1 + F2 + US1 + US2 + US3 + US6 (la prueba E2E de los documentos de ejemplo en verde). Después: US4, US5, US7 y Polish.
