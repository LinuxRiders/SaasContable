# Tareas de Implementación (007)

El prefijo `[P]` indica que la tarea es paralelizable. `[USX]` vincula a la Historia de Usuario respectiva.

## Fase 1: Dominio (Domain)
- [ ] T001 [P] [US1] Crear entidades JSDoc en `src/domain/ingestion/dlq.js` y funciones `createDLQEntry`, `canReprocess`.
- [ ] T002 [P] [US3] Crear lógica pura de Circuit Breaker en `src/domain/ingestion/circuitBreaker.js` (`isOpen`, `recordSuccess`, `recordFailure`).
- [ ] T003 [P] [US5] Crear evaluador de alertas en `src/domain/ingestion/stagingAlerts.js` (`evaluateStagingSLA`).
- [ ] T004 [P] [US1] Escribir tests unitarios en Vitest para `dlq.js` y `stagingAlerts.js`.

🛑 **CHECKPOINT 1:** Revisión del código de dominio por parte de un humano. Confirmar aislamiento (sin dependencias de localStorage o React).

## Fase 2: Servicios (Services)
- [ ] T005 [P] [US1] Crear `src/services/ingestion/dlqService.js` con soporte para `getDLQEntries`, `reprocessDLQEntry` en localStorage.
- [ ] T006 [P] [US4] Crear `src/services/ingestion/batchService.js` implementando el patrón de chunking (Promise.all con retardo simulado) para `importBatch`.
- [ ] T007 [P] [US3] Crear `src/services/ingestion/circuitBreakerService.js` manejando el estado global simulado del toggle (Admin).
- [ ] T008 [P] [US5] Crear `src/services/ingestion/alertService.js` que escanea las entradas de staging y lanza alertas vía SLA.
- [ ] T016 [P] [US5] Emitir evento `StagingAlertEscalated` en `alertService.js` al detectar el incumplimiento del SLA de 48h.

🛑 **CHECKPOINT 2:** Revisión de servicios. Asegurar que verifican el `context.role` antes de operar.

## Fase 3: Componentes de UI (UI Components)
- [ ] T009 [P] [US2] Crear componente `src/components/ingestion/DLQList.jsx` (Tabla con filtros).
- [ ] T010 [P] [US2] Crear componente `src/components/ingestion/DLQDetail.jsx` (Modal o vista con el raw payload y botón de re-procesar).
- [ ] T011 [P] [US4] Crear componente `src/components/ingestion/BatchProgress.jsx` (Barra de progreso de React que escucha al batchService).
- [ ] T012 [P] [US3] Crear componente `src/components/ingestion/CircuitBreakerPanel.jsx` (Panel Admin exclusivo).

## Fase 4: Vistas e Integración (Views & Final Polish)
- [ ] T013 [ ] [US2] Ensamblar `src/views/DLQView.jsx` uniendo la lista y detalles, validando la inyección del contexto (SupportOperator).
- [ ] T014 [ ] [US4] Integrar el `BatchProgress` en la vista existente o nueva de subida de archivos contables.
- [ ] T015 [ ] [US5] Agregar widget de alertas (`StagingAlert`) en el panel de control del Supervisor/Admin.

🛑 **CHECKPOINT 3:** Revisión final (End-to-End). Verificar flujos completos y simulación asíncrona de la UI.
