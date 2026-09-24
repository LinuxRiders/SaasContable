# Research: Publicación Atómica, Libro Diario y Registros Legales

**Feature**: 005-publicacion-libro-diario · **Fecha**: 2026-09-22

## R-01 · Atomicidad simulada

- **Decisión**: `postEntry` (spec 004) se reimplementa así:
  1. Construye el asiento `POSTED` y el `OutboxEvent` `PENDING`.
  2. Los persiste en **una sola llamada** `repository.setCollections(tenantId, { journalEntries, outbox })`, una función nueva del repositorio que serializa todo antes de escribir y, si alguna escritura falla (p. ej. cuota llena), restaura las anteriores.
  3. Llama a `dispatchOutbox(ctx)`.

  Si `demoSettings.busDown`, la entrega falla: el evento queda `PENDING` con `attempts + 1` y el asiento pasa a `POSTED_PENDING_PUBLISH`. Cuando se entrega, el evento pasa a `DELIVERED` y el asiento vuelve a `POSTED`.
- **Justificación**: RD-13 dentro de las posibilidades de `localStorage`, con una única función de escritura múltiple probada.

## R-02 · Consumidores idempotentes

- **Decisión**: el bus entrega `JournalEntryPosted` a tres consumidores: `ledgerConsumer` (Diario), `registerConsumer` (registros legales) y `voucherProjectionConsumer` (vouchers para los módulos existentes). Cada uno guarda los ids aplicados en `<tenantId>:appliedEvents:<consumer>` y omite los repetidos.

## R-03 · Diario encadenado

- **Decisión**: `LedgerEntry = { seq, eventId, journalEntryId, accountingDate, accountingPeriod, glosa, lines, documentRef, prevHash, hash, appendedAt }`, con `hash = sha256(canonicalJson(sin hash) )` y `prevHash` del anterior (`'GENESIS'` en el primero). `verifyLedgerChain(entries, sha256)` recalcula en orden y devuelve `{ ok, checked, firstInvalidSeq, reason: 'HASH_MISMATCH' | 'PREV_HASH_MISMATCH' | 'SEQ_GAP' }`. Se usa `appendOnly`.

## R-04 · Definición de libros en el paquete

- **Decisión**: `pack.legalBooks[i].register = { columns: [{ key, label, from: Expression \| 'meta:<campo>' }], signByDocumentType: { CREDIT_NOTE: -1 }, periodFrom: 'accountingPeriod' }`. Las columnas se evalúan con el lenguaje de expresiones sobre el **documento de origen**, más un contexto `entry.*` (fecha contable, período, tasa, importes funcionales por rol). Perú define columnas para `PE.PURCHASES_REGISTER`, `PE.SALES_REGISTER`, `PE.WITHHOLDINGS_BOOK` y `PE.CASH_BANKS`. `PE.JOURNAL` no tiene registro auxiliar: su registro es el propio Diario.
- **Justificación**: FR-008 y RD-14 (el proyector no sabe qué es un Registro de Compras).

## R-05 · Proyección a los módulos existentes

- **Decisión**: `voucherProjectionConsumer` convierte el asiento al formato de voucher del prototipo: `{ id: 'MOT-<seq>', numero, fecha: accountingDate, subdiario: legalBook.subdiarioLabel, tipoDoc: documentType.shortCode, docRef: 'serie-número', entidadRuc, entidadNombre, glosa, estado: 'ASENTADO', origen: 'MOTOR', journalEntryId, lineas: [{ cta, desc, cc, debe, haber }] }`. Los importes pasan de unidades mínimas a decimales **solo** en la proyección, porque el prototipo usa números decimales. Filas de IGV: `purchaseRegister` y `salesRegister` se exponen además como `compras` / `ventas` en el formato de las facturas del prototipo (`subtotal`, `igv`, `total`, …), con el signo de la nota de crédito aplicado.
  - `AccountingContext` suma una fuente: al iniciar y al recibir `JournalEntryPosted` (suscripción al bus desde el contexto a través del servicio `projectionService.subscribe`), lee `projectionService.getProjectedVouchers(ctx)` y `getProjectedInvoices(ctx)`, y expone `vouchers = [...vouchersEnMemoria, ...proyectados]` (igual para `compras` y `ventas`).
  - Las vistas existentes no cambian. Solo `LibrosContablesView` muestra un distintivo "Motor contable" cuando `origen === 'MOTOR'`.
- **Justificación**: FR-010 sin refactorizar módulos (constitución VII).

## R-06 · Reconstrucción

- **Decisión**: `rebuildProjections(ctx)` borra las colecciones proyectadas y los ids aplicados de los consumidores de registros y vouchers, y reaplica los eventos en el orden del Diario. El Diario nunca se reconstruye.

## R-07 · Trazabilidad

- **Decisión**: `traceService.getEntryTrace(ctx, { journalEntryId })` arma la línea de tiempo desde: `RawPayload` (verifica la huella para `TEXT`, `BASE64` y `FIXTURE` descargando la URL), `IntakeRecord`, revisiones del canónico, traza de interpretación y su historial, `stateHistory`, decisión de aprobación, firma (`verifySignature`), eventos del log con el mismo `traceId`, `OutboxEvent`, `LedgerEntry` (verifica su huella individual) y filas de registro.

## R-08 · Permisos

`VIEW_LEDGER` y `VIEW_TRACE` (todos); `VERIFY_LEDGER` y `REBUILD_PROJECTIONS` (ADMIN, AUDITOR); `RETRY_PUBLICATION` (ADMIN, CHECKER).
