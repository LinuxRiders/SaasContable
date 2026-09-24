# Research & Decisiones: Traducción, Validación y Staging

## Traducción AST
* **Manejo de Moneda Funcional**: El AST evaluará reglas que pueden derivar la tasa FX (provisionalFxRate). Todos los montos resultantes (`functionalAmount`) deben expresarse y almacenarse en **CENTAVOS** (Enteros).
* **Idempotencia**: Al re-evaluar un AST tras la intervención del Maker (ej. agrega un tag analítico faltante), el motor debe re-calcular los asientos sin duplicar el borrador, manteniendo el `traceId` y elevando el `entityVersion`.

## Validación de Balance Estricto (RD-03)
* Para asegurar Σ Débitos = Σ Créditos, calculamos la suma total de débitos y créditos en la moneda funcional.
* Si hay diferencia (ej. por redondeo FX), se debe enrutar a una cuenta de redondeo o rechazar (enviar a `PENDING_INPUT`) según las reglas AST. El validador es estricto: la diferencia debe ser 0.

## Concurrencia Optimista (NRF-13)
* UI debe enviar `entityVersion` al actualizar (ej. Maker completando datos).
* Si el servidor (simulado) detecta un `entityVersion` dispar, retorna error `CONCURRENCY_CONFLICT` y solicita refrescar.

## Estados
* Un `DRAFT` es transitorio en la evaluación. La persistencia principal ocurre al entrar a `PENDING_INPUT` o `PENDING_APPROVAL`.
* Un Maker no "aprueba", el Maker "completa" y el sistema vuelve a evaluar (`PENDING_INPUT` -> `DRAFT` temporal -> validación -> `PENDING_APPROVAL`).
