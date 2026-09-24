# Checklist de Requisitos

## Atributos de Calidad (No Funcionales)
- [ ] **RD-13 (Atomicidad Evento-Persistencia):** Comprobado. La actualización del asiento y la creación del registro en el Outbox suceden en una única operación transaccional mockeada en el cliente local.
- [ ] **RD-07 (Inmutabilidad Post-Asentamiento):** Comprobado. La lógica de negocio no permite mutaciones de montos o cuentas si el estado es `POSTED` o `POSTED_PENDING_PUBLISH`.
- [ ] **NRF-04 (Consistencia Eventual):** Comprobado. Las proyecciones (Balances y Mayor) tardan máximo ~2s en actualizarse al completarse el proceso asíncrono.
- [ ] **NRF-09 (Retención Normativa con Hash):** Comprobado. Todos los registros introducidos en el `EventStore` poseen la propiedad `hash` computada a partir del `previousHash` y de su propio payload.

## Historias de Usuario Cumplidas
- [ ] **US1 (Publicación Atómica):** Un evento `JournalEntryPosted` es despachado con éxito si el asiento es aprobado, impactando las proyecciones directamente (CQRS).
- [ ] **US2 (Tolerancia a Fallos - Outbox):** Un fallo del bus retiene el evento sin perderlo, posibilitando su posterior envío mediante una tarea programada/manual (Outbox).
- [ ] **US3 (Trazabilidad y Auditoría):** Se cuenta con un visor de registros inmutables dentro del sistema para comprobar el encadenamiento correcto de las transacciones (Auditoría).
- [ ] **US4 (Consolidación de Vistas):** Los cambios se observan reflejados fluidamente en las consultas preexistentes de Reportes, Libros, IGV y el Dashboard financiero.
