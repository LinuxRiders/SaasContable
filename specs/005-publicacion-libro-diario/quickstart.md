# Quickstart: Publicación, Diario y Registros

**Prerrequisitos**: specs 001 a 004.

## Pruebas automáticas

| Área | Qué demuestra |
|---|---|
| `setCollections` | escribe todo o nada (simulando cuota llena) |
| `postEntry` / outbox | bus activo → `POSTED` y un evento `DELIVERED`; bus caído → `POSTED_PENDING_PUBLISH`; 3 fallos y restablecimiento → `POSTED`, una sola anotación (SC-001) |
| Consumidores | reentrega del mismo evento no duplica Diario, registros ni vouchers |
| `verifyLedgerChain` | cadena válida; importe alterado → `HASH_MISMATCH` en esa anotación; anotación borrada → `SEQ_GAP` (SC-002) |
| `projectRegisterRow` | DOC-01 y DOC-03 (negativo) en Compras, DOC-04 en Ventas, DOC-06 en Retenciones; columnas cuadran con el asiento (SC-003) |
| `projectVoucher` / `projectInvoice` | formato del prototipo; IGV de DOC-01 y DOC-04; nota de crédito resta |
| E2E | cargar DOC-01, DOC-03, DOC-04, DOC-06 y DOC-07 → aprobados → libros y registros; la Liquidación IGV (función de suma usada por la vista) coincide con los registros (SC-004) |
| Trazabilidad | asiento de DOC-10 con todos los pasos y huellas verificadas |

## Escenarios manuales

1. Cargar DOC-01 y DOC-04 (STP) → **Libros**: dos vouchers "Motor contable"; **Liquidación IGV**: crédito 180.00 y débito 360.00 sumados a los manuales.
2. Activar "Bus caído" → aprobar DOC-10 → **Asientos**: `POSTED_PENDING_PUBLISH`; **Publicación**: 1 pendiente → desactivar → `POSTED`.
3. **Diario** → "Verificar integridad" → válido. En DevTools, alterar un importe de `contableos:v1:01:ledger` → verificar → anotación inválida señalada.
4. **Registros legales** → Compras de 2026-09 → DOC-01 y DOC-03 (negativa) → exportar CSV.
5. Auditor → **Trazabilidad** del asiento de DOC-10 → línea de tiempo completa con huellas verificadas.
6. Recargar el navegador → todo se conserva; "Reconstruir proyecciones" deja los mismos datos.
