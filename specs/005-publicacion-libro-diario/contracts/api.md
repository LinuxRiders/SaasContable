# Contrato: Publicación, Diario, Registros y Trazabilidad

**Feature**: 005-publicacion-libro-diario

## 1. Dominio — `src/domain/ledger/` (puro)

| Función | Descripción |
|---|---|
| `buildPostedEvent(entry, { document, signature, eventId })` | payload del data-model |
| `buildLedgerEntry(event, { prev, seq, sha256, now })` → `Promise<LedgerEntry>` | research R-03 |
| `verifyLedgerChain(entries, sha256)` → `Promise<{ ok, checked, firstInvalidSeq, reason }>` | |
| `projectRegisterRow(event, { legalBook, pack })` → `RegisterRow \| null` | evalúa columnas con el lenguaje de expresiones (contexto `entry.*` vía `extra`) y aplica el signo |
| `projectVoucher(event, { legalBook, documentType, chart })` | voucher del prototipo (decimales solo aquí) |
| `projectInvoice(event, { documentType })` → factura del prototipo `\| null` | solo documentos con `VAT`; `PURCHASE` si es `RECEIVED` y `SALE` si es `ISSUED` |
| `toCsv(rows, columns)` | exportación del registro |

## 2. Servicios

| Servicio · operación | Permiso | Descripción |
|---|---|---|
| `postingService.postEntry(ctx, { entry, signature })` | interno | research R-01 (misma firma que en el spec 004) |
| `postingService.dispatchOutbox(ctx)` | interno / `RETRY_PUBLICATION` | entrega los `PENDING` en orden; actualiza estados; auditoría `OUTBOX_DISPATCHED` / `OUTBOX_FAILED` |
| `postingService.setBusDown(ctx, { down })` | `SET_DEMO_TOGGLES` | al pasar a `false`, `dispatchOutbox` |
| `ledgerService.listLedger(ctx, { period?, page? })` | `VIEW_LEDGER` | |
| `ledgerService.verifyLedger(ctx)` | `VERIFY_LEDGER` | auditoría `LEDGER_VERIFIED` |
| `registerService.listRegister(ctx, { legalBookCode, period })` / `exportRegisterCsv(...)` | `VIEW_LEDGER` | |
| `projectionService.getProjectedVouchers(ctx)` / `getProjectedInvoices(ctx)` / `subscribe(handler)` | `VIEW_LEDGER` | consumo desde `AccountingContext` |
| `projectionService.rebuildProjections(ctx)` | `REBUILD_PROJECTIONS` | research R-06 |
| `traceService.getEntryTrace(ctx, { journalEntryId })` | `VIEW_TRACE` | research R-07 |

Consumidores (en `src/services/ledger/consumers.js`), suscritos a `JournalEntryPosted`: `ledgerConsumer`, `registerConsumer` y `voucherProjectionConsumer` (idempotentes, research R-02).

`repository.setCollections(tenantId, map)` (nuevo en `src/services/storage/repository.js`): escritura múltiple con restauración si falla.
