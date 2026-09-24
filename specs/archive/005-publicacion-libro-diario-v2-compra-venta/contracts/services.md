# Contratos de Servicios

Todos los servicios respetan el formato estandarizado `{ok: boolean, data?: any, error?: {code, message, details}}`.

## IEventPublisher
**Ubicación:** `src/services/ingestion/publishService.js`
Coordina la publicación de un evento de dominio originado de un asiento.

```javascript
/**
 * Publica un evento de forma atómica a través del patrón Outbox
 * @param {Object} context - {tenantId, userId, role}
 * @param {Object} event - Instancia de Domain Event (ej. JournalEntryPosted)
 * @returns {Promise<{ok: boolean, error?: object}>}
 */
async function publish(context, event) {}
```

## OutboxProcessor
**Ubicación:** `src/services/ingestion/publishService.js` (Lógica delegada al servicio)
Busca y reintenta las publicaciones pendientes.

```javascript
/**
 * Recupera ítems PENDING del Outbox y los despacha al EventBus
 * @param {Object} context - {tenantId, userId, role}
 * @returns {Promise<{ok: boolean, data: { processedCount: number }}>}
 */
async function retryPending(context) {}
```

## ProjectionService
**Ubicación:** `src/services/ingestion/projectionService.js`
Construye o actualiza los saldos (CQRS) basados en el log de eventos.

```javascript
/**
 * Escucha eventos y aplica mutaciones a las proyecciones de balance
 * @param {Object} context - {tenantId, userId, role}
 * @param {Object} domainEvent - Evento recibido del EventBus
 * @returns {Promise<{ok: boolean}>}
 */
async function processEvent(context, domainEvent) {}

/**
 * Reconstruye la proyección desde cero (snapshot) utilizando el log completo
 * @param {Object} context - {tenantId, userId, role}
 * @returns {Promise<{ok: boolean}>}
 */
async function rebuildFromEvents(context) {}
```
