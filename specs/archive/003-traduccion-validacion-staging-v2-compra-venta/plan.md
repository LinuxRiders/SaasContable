# Plan de Ejecución: Traducción, Validación y Staging

## Fase 1: Dominio Base y Motor de Traducción (US1)
1. Extender entidades y value objects (`JournalEntry`, `EntryLine`, `JournalState`).
2. Implementar `translationEngine.js` para aplicar reglas AST sobre `CanonicalDocument`.
3. Implementar lógica de redondeo FX (RD-09) e inyección de contexto.

## Fase 2: Validación y Máquina de Estados (US2)
1. Desarrollar `validationService.js` para validar RD-03 (Σ Débitos = Σ Créditos en centavos), RD-12 y completeness.
2. Construir el orquestador `stateTransitions.js` para mover de `DRAFT` a `PENDING_APPROVAL` o `PENDING_INPUT`.

## Fase 3: Servicios de Aplicación (US3, US4, US5)
1. Crear `translationService.js` (orquestación asíncrona de extracción a traducción).
2. Crear `stagingService.js` (listado, edición, re-procesamiento AST, cancelación).
3. Implementar chequeo SLA 48h (NRF-10).

## Fase 4: Vistas y UI (US3, US4)
1. Desarrollar `BandejaView.jsx` con grid de documentos (concurrencia optimista).
2. Crear `DocumentDetail` y `MakerEditor` para corrección de tags y campos faltantes.
3. Integrar mock backend (localStorage).
