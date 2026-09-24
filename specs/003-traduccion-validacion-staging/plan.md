# Implementation Plan: Interpretación Contable, Validación y Bandeja del Maker

**Branch**: `003-traduccion-validacion-staging` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

## Summary

Convertir cada documento recibido en un `JournalEntry`:

1. **Antes del motor**: verificar la confianza de extracción y las referencias, y resolver el tipo de cambio.
2. **Motor**: interpretar con el motor del spec 001.
3. **Después del motor**: validar cuadre, período por fecha contable (con registro tardío) y cuentas.
4. **Resultado**: dejar el asiento en `PENDING_APPROVAL` o en la bandeja del Maker con motivos y acciones.

La bandeja permite verificar contra el original, corregir con revisiones inmutables, clasificar (y proponer reglas), informar dimensiones, confirmar registros tardíos, reintentar, cancelar y actuar en lote, con concurrencia optimista.

## Technical Context

**Language/Version**: JavaScript ES2022 + JSDoc · **Dependencies**: React 18, Vite 6, lucide-react (sin nuevas)

**Storage**: `<tenantId>:journalEntries` (versionado con `entityVersion`) y `<tenantId>:canonicalDocuments` (revisiones). También se actualizan `intakeRecords.processingStatus` y el log de eventos.

**Testing**: Vitest; E2E con los documentos reales del spec 002.

**Constraints**: dominio puro; interpretación determinista; sin reglas de país en `src/domain/journal/`.

**Scale/Scope**: 7 módulos de dominio, 2 servicios, 2 vistas (Bandeja reescrita y Asientos nueva), ~9 componentes.

## Constitution Check

| Principio | Estado | Cómo se cumple |
|---|---|---|
| I | ✅ | Servicios `async` con contratos; `repository.js`; el reset limpia asientos y revisiones. |
| II | ✅ | RD-03 y RD-17 (`validateEntry`), RD-09 (`resolveDocumentFx` con redondeo único heredado del spec 001), RD-12 (`resolveAccountingDate`), RD-15 y RD-16 (motor del spec 001), RD-01 (revisiones inmutables). Máquina de estados completa. |
| III | ✅ | `src/domain/journal/` puro; reutiliza `interpretDocument` en vez de duplicarlo. |
| IV | ✅ | Solo el Maker actúa; `intervenedBy` alimenta la SoD del spec 004; auditoría campo por campo. |
| V | ✅ | Pruebas por módulo + E2E con los 16 documentos. |
| VI | ✅ | Sin dependencias. |
| VII | ✅ | `BandejaView` reescrita; `AsientosView` nueva; reutiliza `OriginalViewer` y `CanonicalDocumentPanel` del spec 002. |

## Project Structure

```text
specs/003-traduccion-validacion-staging/   spec · plan · research · data-model · quickstart · tasks · contracts/
src/
├── domain/
│   ├── ingestion/stateMachine.js          # (completar tabla SDD §10.2)
│   └── journal/
│       ├── types.js
│       ├── preInterpretation.js
│       ├── fxResolution.js
│       ├── accountingDate.js
│       ├── entryValidation.js
│       ├── interpretation.js
│       ├── makerActions.js
│       └── __tests__/                     # + interpretation.e2e.test.js
├── services/journal/
│   ├── interpretationService.js
│   ├── stagingService.js
│   ├── journalRepository.js               # lectura/escritura versionada de asientos y revisiones
│   └── index.js                           # suscripción a DocumentReceived
├── components/journal/
│   ├── ReasonList.jsx                     # motivos con paso y acción sugerida
│   ├── VerifyFieldsPanel.jsx              # dudosos con el original al lado
│   ├── ClassificationPicker.jsx           # documento y líneas + "proponer regla"
│   ├── DimensionEditor.jsx
│   ├── LateRegistrationDialog.jsx · CancelEntryDialog.jsx
│   ├── BatchActionBar.jsx
│   ├── StagingWorkbench.jsx               # original + documento editable + motivos + acciones
│   ├── EntryLinesView.jsx                 # Debe/Haber (reutiliza EntryLinesTable del spec 001)
│   ├── InterpretationTraceView.jsx        # 10 pasos, historial de intentos
│   └── EntryDetailModal.jsx               # reutilizado por 004, 005 y 006
└── views/
    ├── BandejaView.jsx                    # reescrita
    └── AsientosView.jsx                   # nueva: asientos por estado
```

## Complexity Tracking

| Decisión | Por qué | Alternativa descartada |
|---|---|---|
| Re-ejecutar siempre toda la interpretación (R-02) | Determinismo y menos estados | Re-ejecución parcial con estados intermedios |
| Asiento persistente desde el primer intento (R-03) | La bandeja y el SDD §12.3 trabajan por `journalEntryId` | "Documento pendiente" separado del asiento |
