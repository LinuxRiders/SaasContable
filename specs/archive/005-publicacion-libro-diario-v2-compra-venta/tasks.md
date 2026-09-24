# Tareas de Implementación

## Fase 1: Dominio de Eventos y Lógica Base
- [ ] T001 [P] [US1] Crear entidades de eventos puras de dominio (`JournalEntryPosted`, `JournalEntryRejected`, `StagingAlertEscalated`) en `src/domain/ingestion/events.js`.
- [ ] T002 [P] [US2] Definir entidad e invariantes para `OutboxItem` en `src/domain/ingestion/outbox.js`.
- [ ] T003 [P] [US3] Crear utilidad para generar hash criptográfico SHA-256 en `src/domain/ingestion/hashUtils.js`.
- [ ] T004 [P] [US1] Actualizar objeto de dominio `JournalEntry` para soportar las transiciones a `POSTED` y `POSTED_PENDING_PUBLISH`.
🛑 **CHECKPOINT:** Revisar pureza de la capa de dominio. Todo el cálculo financiero debe estar en centavos (CENTS). No debe existir uso de React, Vite, o localStorage aquí.

## Fase 2: Infraestructura Simulada
- [ ] T005 [P] [US1] Implementar `eventBus.js` en `src/domain/ingestion/` (patrón observador en memoria para simular colas).
- [ ] T006 [P] [US3] Implementar `eventStore.js` en `src/domain/ingestion/` asegurando el modo append-only y cadena de hashes inquebrantable.
- [ ] T007 [P] [US2] Construir adaptador transaccional en `src/services/storage/repository.js` que guarde múltiples items de modo síncrono.
🛑 **CHECKPOINT:** Validar que las inserciones mockeadas guarden exitosamente la cadena hash y soporten bloqueos simulados.

## Fase 3: Servicios de Aplicación y CQRS
- [ ] T008 [P] [US1] Construir `publishService.js` en `src/services/ingestion/` para coordinar el paso hacia el Outbox.
- [ ] T009 [P] [US2] Implementar método `retryPending` en el Outbox processor de los servicios.
- [ ] T010 [P] [US4] Desarrollar `projectionService.js` para suscribirse al bus y procesar operaciones acumulativas en los saldos `CQRSProjection`.
🛑 **CHECKPOINT:** Pruebas Vitest de los servicios. Comprobar que eventos despachados impactan a las proyecciones correctamente.

## Fase 4: Integración UI de React
- [ ] T011 [P] [US4] Suscribir `AccountingContext` a las proyecciones construidas por el CQRS para actualizar la visualización del Mayor.
- [ ] T012 [P] [US1] Conectar acción "Aprobar" desde la pantalla de detalle del asiento con `publishService.js`.
- [ ] T013 [P] [US3] Construir componente React `EventLogViewer.jsx` en la carpeta `src/views/` (o subcarpeta de auditoría) para depurar la trazabilidad.
🛑 **CHECKPOINT:** Verificación en navegador y simulación manual de fallos del Event Bus forzando el estado `POSTED_PENDING_PUBLISH`.
