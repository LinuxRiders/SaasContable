# Quickstart: Interpretación, Validación y Bandeja del Maker

**Feature**: 003-traduccion-validacion-staging · **Prerrequisitos**: specs 001 y 002 implementados.

## Pruebas automáticas

| Área | Qué demuestra |
|---|---|
| `checkExtractionConfidence` | DOC-10 detenido; tras `VERIFY_FIELDS` de sus 3 campos, pasa |
| `resolveReferences` | DOC-03 con DOC-01 cargado → resuelve; sin DOC-01 → `REFERENCE_NOT_FOUND` |
| `resolveDocumentFx` | moneda funcional sin tasa; USD con tasa exacta; servicio caído → provisional; sin tasa previa → `FX_RATE_UNAVAILABLE` |
| `resolveAccountingDate` | período abierto; registro tardío dentro de plazo (agosto → 2026-09-01); fuera de plazo; política inactiva; sin período abierto |
| `validateEntry` | descuadre; cuenta inactiva; dimensión faltante |
| `applyMakerAction` | cada acción; operación no admitida; cambio de tipo de documento prohibido; cancelación sin motivo |
| `stateMachine` | tabla completa del SDD §10.2 y rechazo de transiciones no definidas |
| **E2E** `interpretation.e2e.test.js` | cargar DOC-01 … DOC-16 (servicios del spec 002) y verificar `expected.interpretation` de cada uno (SC-001); luego resolver los 5 pendientes y verificar que llegan a `PENDING_APPROVAL` (DOC-08, tras clasificar como `SERVICE_SALE`, queda en `NO_TEMPLATE`) |
| Servicio | `CONFLICT` por versión; lote con un conflicto; Checker no actúa; uso de plantilla registrado solo al llegar a `PENDING_APPROVAL`; eventos y auditoría |

## Escenarios manuales

1. **Camino feliz**: Maker, empresa `01` → cargar DOC-01 → **Asientos**: `PENDING_APPROVAL`, 5 líneas, Registro de Compras. Abrir la traza: regla "Proveedor de mercadería", plantilla y roles.
2. **Foto borrosa**: cargar DOC-10 → **Bandeja**: `LOW_CONFIDENCE_EXTRACTION` → verificar los 3 campos mirando la imagen → pasa a `PENDING_APPROVAL` con intervención manual.
3. **Clasificación manual**: DOC-11 → clasificar como "Adquisición de activo fijo" y marcar "Proponer como regla" → asiento de activo; como Admin, ver la regla `PROPOSED`.
4. **Dimensión**: DOC-02 → informar `CC-LOGISTICA` en la línea del flete → 8 líneas cuadradas.
5. **Esquema**: DOC-15 → completar la referencia a una factura existente (p. ej. F001-123 del 2026-09-10) → re-interpreta.
6. **Lote**: seleccionar las 3 boletas de DOC-08 → "Clasificar como venta de servicios" → cada una queda en `NO_TEMPLATE`; como Admin, duplicar una plantilla de venta para `SALES_RECEIPT`, activarla y "Reintentar" en lote.
7. **Tipo de cambio**: activar "Servicio FX caído" → cargar DOC-05 → asiento provisional.
8. **Registro tardío**: registrar manualmente una factura con fecha 2026-08-20 → fecha contable 2026-09-01, marca "registro tardío".
9. **Cancelación**: cancelar un pendiente sin motivo (se impide) y con motivo (`CANCELLED`).
10. **Concurrencia**: abrir el mismo pendiente en dos pestañas y guardar en ambas → la segunda recibe "El documento cambió; refresca".
