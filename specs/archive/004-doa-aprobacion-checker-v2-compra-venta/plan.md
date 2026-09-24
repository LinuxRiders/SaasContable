# Plan de Implementación: DoA y Aprobación

## 1. Estrategia de Implementación
El desarrollo se dividirá en tres capas clave, respetando la arquitectura:
1.  **Dominio (`src/domain/ingestion/`)**: Implementar `doaEngine.js` y `signatureService.js`. Son funciones puras que toman un `JournalEntry` y una matriz de DoA, y devuelven decisiones y firmas.
2.  **Servicios (`src/services/ingestion/`)**: Implementar `approvalService.js`. Conectará el dominio con el estado simulado (Storage), verificará el contexto del usuario (SoD, Tenant) y actualizará el estado del asiento contable.
3.  **Vistas (`src/views/` y `src/components/`)**: Construir `PendientesAprobacionView.jsx` y componentes hijos para listar y procesar los pendientes.

## 2. Estrategia de Pruebas (Vitest)
-   **Dominio Puros:** 100% de cobertura en `doaEngine` (casos de STP, Checker L1/L2, bloqueo por Provisional FX) y `signatureService` (generación consistente y verificación del hash).
-   **Servicios:** Pruebas simulando diferentes roles (Maker intentando aprobar = rechazo por SoD, Admin aprobando = éxito, Checker aprobando = éxito).

## 3. Riesgos y Mitigaciones
-   **Manejo de Montos:** Riesgo de fallos si se usan flotantes. **Mitigación:** Asegurar estrictamente el uso de enteros (centavos) en la evaluación de la matriz DoA.
-   **Estado Desincronizado:** Posibilidad de aprobar un documento ya rechazado o modificado. **Mitigación:** Validar la transición desde el estado exacto `PENDING_APPROVAL` y validar que la firma sea sobre el contenido íntegro y actual del `JournalEntry`.
