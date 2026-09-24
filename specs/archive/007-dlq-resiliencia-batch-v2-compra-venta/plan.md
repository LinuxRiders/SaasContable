# Plan de Ejecución (007)

El desarrollo se divide en 4 fases incrementales, garantizando el aislamiento de la lógica de dominio antes de integrar React.

## Fase 1: Dominio y Reglas (Domain)
*   **Objetivos:** Crear la lógica pura sin estado para clasificar errores, decidir si un payload va a DLQ, y reglas de SLA.
*   **Archivos:** `src/domain/ingestion/dlq.js`, `circuitBreaker.js`, `batchProcessor.js`, `stagingAlerts.js`.
*   **Pruebas (Vitest):** Validar que los fallos persistentes generen objetos `DLQEntry` válidos y que el evaluador de SLA marque correctamente los documentos con más de 48h.

## Fase 2: Servicios Base (Infra / Services)
*   **Objetivos:** Integrar el dominio con `localStorage` y simular el procesamiento asíncrono.
*   **Archivos:** `dlqService.js`, `batchService.js`, `alertService.js`, `mockDLQEntries.js`, `circuitBreakerService.js`.
*   **Responsabilidades:** Manejar promesas simuladas para la importación masiva (`importBatch` devolviendo progreso mediante callbacks) e inyectar el control de acceso (`context.role`).

## Fase 3: Interfaz de Usuario (UI - Support & Batch)
*   **Objetivos:** Crear las vistas para el `SupportOperator` y el componente de subida masiva.
*   **Archivos:** `src/views/DLQView.jsx`, `src/components/ingestion/DLQList.jsx`, `DLQDetail.jsx`, `BatchProgress.jsx`.
*   **UX:** Mostrar bandeja de mensajes muertos con botones de "Re-procesar". Mostrar barra de progreso fluida (UI optimista) para el batch.

## Fase 4: Integración del Panel de Resiliencia
*   **Objetivos:** Incorporar el Toggle del Circuit Breaker en la vista de Admin y las notificaciones de SLA.
*   **Archivos:** `src/components/ingestion/CircuitBreakerPanel.jsx`.
*   **Validación Final:** Demo completa donde el Admin pone FX en `OPEN`, sube un batch que requiere FX, los envíos fallan y caen a DLQ. El Support Operator repara el batch desde DLQ.

## Diagrama de Flujo Conceptual

```
[ Batch UI ] ---> ( batchService )
                        |
                  loop( payloads )
                        |
                 ( ingestion pipeline ) ---> FX API [ Circuit Breaker ]
                        |
                 [ Error en Parsing / FX ] 
                        |
                   ( dlqService )
                        |
                   [ DLQ DB ] <--- [ Support Operator UI ]
```
