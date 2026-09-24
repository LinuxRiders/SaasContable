# Especificación: Publicación en Libro Diario y Proyecciones

> [!WARNING]
> **PENDIENTE DE REALINEAR CON SDD v3.0.** Este spec se escribió sobre el modelo anterior (compra/venta). No implementar hasta rehacerlo con `/speckit-specify` tomando como base el SDD v3.0 (§5, §20, §21) y el contrato del spec 001 (`specs/001-motor-plantillas-contables/contracts/`). Debe publicar el libro destino y los datos del documento en `JournalEntryPosted` (RF-19, §11), además de `lines` con `side` en lugar de `debits`/`credits`.

## 1. Visión General
Este documento define la implementación del Subsistema S5 (Persistencia y Proyección) del SDD para el entorno simulado de ContableOS. Cubre la publicación de eventos en el Event Bus, el almacenamiento inmutable en el Event Store (hash-chained), y la actualización de proyecciones CQRS para alimentar las vistas del Libro Diario, Mayor e IGV (SaaS Perú, PCGE 2026).

## 2. Requerimientos Cumplidos [RD-07, RD-13, RF-11, NRF-04, NRF-09, CU-01 step 10, HU-06]
- **RD-13 (Atomicidad Evento-Persistencia):** El cambio de estado a `POSTED` y la inserción de eventos son atómicos. Fallas de publicación en el bus resultan en `POSTED_PENDING_PUBLISH`, gestionado por un Outbox.
- **RD-07 (Inmutabilidad Post-Asentamiento):** Los asientos en `POSTED` son de solo lectura permanente.
- **NRF-04 (Consistencia Eventual):** Retraso simulado menor a 2s para actualizar proyecciones CQRS.
- **NRF-09 (Retención Normativa):** Retención obligatoria usando hash-chaining para garantizar la integridad histórica de los eventos.
- **CU-01 (Paso 10):** Publicación del evento `JournalEntryPosted` de forma atómica.

## Eventos Emitidos [§11]
- `JournalEntryPosted` — emitted when entry is posted and published (trigger: POSTED + bus publish)

## 3. Estados del Dominio
- `POSTED`: Asiento contabilizado, finalizado y publicado exitosamente en el Event Bus.
- `POSTED_PENDING_PUBLISH`: Asiento contabilizado pero pendiente de envío al Event Bus (retries automáticos vía Outbox).

## 4. Historias de Usuario
- **US1:** Como contador, al aprobarse un asiento, este publica un evento `JournalEntryPosted` y aparece inmediatamente en el Libro Diario (proyecciones CQRS).
- **US2:** Como sistema, si la publicación de eventos falla, se usa el patrón Outbox (`POSTED_PENDING_PUBLISH`) y reintenta en background para asegurar resiliencia.
- **US3:** Como auditor, puedo visualizar un log de eventos contables con el historial inmutable (garantizado por hash chaining) de todos los eventos emitidos.
- **US4:** Como analista de la información, la publicación de asientos actualiza de manera automática e integrada las vistas del Libro Mayor y de Liquidación IGV existentes.

## Trazabilidad SDD
| SDD Ref | Cobertura |
|---------|----------|
| RD-07 | US: Inmutabilidad POSTED |
| RD-13 | US: Atomicidad evento-persistencia, outbox |
| CU-01 paso 10 | Flujo principal STP |
