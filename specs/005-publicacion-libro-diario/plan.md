# Implementation Plan: Publicación Atómica, Libro Diario y Registros Legales

**Branch**: `005-publicacion-libro-diario` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

## Summary

Reimplementar `postEntry` para que la aprobación y el evento se guarden juntos (outbox) y se entreguen con reintento, con el estado `POSTED_PENDING_PUBLISH` cuando el bus está caído. El evento alimenta a tres consumidores idempotentes:

- un Libro Diario de solo agregado, encadenado por SHA-256 y verificable;
- los registros legales, definidos como datos del paquete;
- las proyecciones hacia los módulos existentes (vouchers y facturas), que `AccountingContext` combina con sus datos.

Se agrega una vista de trazabilidad para el Auditor.

## Technical Context

JavaScript ES2022 + JSDoc · React 18 · sin dependencias · Storage: `outbox`, `ledger` (solo agregado), `registers:*`, `projectedVouchers`, `projectedInvoices` y `appliedEvents:*` · Vitest.

## Constitution Check

| Principio | Estado | Cómo se cumple |
|---|---|---|
| I | ✅ | Servicios mock; `setCollections` en el único repositorio. |
| II | ✅ | RD-13 (outbox + `POSTED_PENDING_PUBLISH`), RD-07 (asiento `POSTED` inmutable; vouchers del motor de solo lectura), RNF-09 (Diario encadenado). Bus y outbox visibles, sin backoff real. |
| III | ✅ | `src/domain/ledger/` puro; libros definidos en el paquete. |
| IV | ✅ | Verificación y reconstrucción restringidas; todo auditado. |
| V | ✅ | Pruebas de outbox, cadena, proyecciones y E2E. |
| VI | ✅ | Sin librerías. |
| VII | ✅ | **Integración sin refactor**: `AccountingContext` solo agrega una fuente y las vistas existentes siguen igual (salvo un distintivo en Libros). |

## Project Structure

```text
src/
├── domain/ledger/  types.js · postedEvent.js · ledgerChain.js · registerProjection.js · voucherProjection.js · csv.js · __tests__/
├── data/jurisdictions/pe/legalBookRegisters.js      # columnas y signos (data-model)
├── services/
│   ├── storage/repository.js                        # + setCollections
│   ├── posting/postingService.js                    # reimplementación de postEntry + outbox
│   └── ledger/ ledgerService.js · registerService.js · projectionService.js · traceService.js · consumers.js · index.js
├── context/AccountingContext.jsx                    # combina las proyecciones (solo agregar fuente)
├── components/ledger/ LedgerTable.jsx · ChainVerificationPanel.jsx · RegisterTable.jsx · OutboxPanel.jsx · TraceTimeline.jsx
└── views/ LibroDiarioView.jsx · RegistrosLegalesView.jsx · PublicacionView.jsx · TrazabilidadView.jsx
```

## Complexity Tracking

| Decisión | Por qué | Alternativa descartada |
|---|---|---|
| `setCollections` con restauración | RD-13 en `localStorage` | Escrituras separadas (no atómicas) |
| Proyecciones combinadas en el contexto | Constitución VII: no refactorizar módulos | Migrar Compras, Ventas y Libros al motor nuevo |
