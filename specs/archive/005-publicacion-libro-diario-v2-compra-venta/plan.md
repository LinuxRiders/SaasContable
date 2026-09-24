# Plan de Implementación: Publicación Libro Diario

## Fase 1: Dominio Base (Eventos y Outbox)
- **Objetivo:** Definir la capa de dominio pura de eventos y el manejo de los estados de publicación.
- **Actividades:**
  - Crear clases de eventos en inglés: `JournalEntryPosted`, `JournalEntryRejected`, `JournalEntryCancelled`, etc.
  - Implementar la lógica para el encadenamiento criptográfico (Hash Chain) que sustenta NRF-09.
  - Añadir soporte para el estado `POSTED_PENDING_PUBLISH` en el workflow de `JournalEntry`.

## Fase 2: Infraestructura Simulada (Bus y Store)
- **Objetivo:** Simular un entorno orientado a eventos en el navegador mediante dependencias locales.
- **Actividades:**
  - Desarrollar el `EventBus` simulado en memoria con capacidades pub/sub.
  - Construir el `EventStore` que escribe los registros de forma "append-only" con su validación de hash previo.
  - Definir la estructura del `Outbox` y el sistema de reintentos asociado.

## Fase 3: Servicios de Aplicación (Publisher y CQRS)
- **Objetivo:** Implementar los servicios que coordinan el flujo entre los asientos, los eventos y las proyecciones.
- **Actividades:**
  - Desarrollar `publishService.js` asegurando una escritura atómica mockeada (RD-13) con `repository.js`.
  - Crear `projectionService.js` para suscribirse al bus y regenerar las sumatorias y los saldos usando matemáticas exactas (siempre en centavos enteros).
  - Implementar el worker/cron virtual del Outbox.

## Fase 4: Integración UI y Vistas
- **Objetivo:** Proveer visibilidad en la interfaz de React a los resultados de las proyecciones.
- **Actividades:**
  - Modificar el `AccountingContext` existente para suscribirse a los cambios del modelo de lectura (proyección).
  - Verificar que las grillas de Libro Mayor e IGV muestren los valores recalculados.
  - Crear la vista de visualización del Log de Auditoría inmutable.
