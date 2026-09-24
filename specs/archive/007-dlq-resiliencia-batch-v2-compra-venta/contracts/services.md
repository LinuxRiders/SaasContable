# Contratos de Servicios (007)

Los servicios exponen funciones asíncronas para las vistas de React. Se inyecta un objeto de contexto `context` (`tenantId`, `userId`, `role`) para asegurar la pertenencia de los datos y el Control de Acceso (ACL).
Retorno estándar: `{ ok: boolean, data?: any, error?: { code: string, message: string, details?: any } }`.

## 1. DLQ Service (`src/services/ingestion/dlqService.js`)

```javascript
/**
 * Obtiene la lista de elementos en la DLQ. Exclusivo para 'SupportOperator' y 'Admin'.
 * @param {Object} context - { tenantId, userId, role }
 * @param {Object} filters - { status }
 * @returns {Promise<{ok: boolean, data: DLQEntry[], error: Object}>}
 */
async function getDLQEntries(context, filters) {}

/**
 * Re-encola un documento al inicio del pipeline de ingestión.
 * Cambia el estado en la DLQ a 'REPROCESSING' y si tiene éxito, a 'RESOLVED'.
 * @param {Object} context
 * @param {string} entryId - ID de la entrada DLQ.
 * @param {string} modifiedPayload - (Opcional) Payload corregido.
 * @returns {Promise<{ok: boolean, data: { status: string }}>}
 */
async function reprocessDLQEntry(context, entryId, modifiedPayload) {}
```

## 2. Batch Service (`src/services/ingestion/batchService.js`)

```javascript
/**
 * Inicia el proceso de importación masiva. Crea un registro BatchImport.
 * Llama en bucle a la capa de ingestión y actualiza el estado.
 * @param {Object} context
 * @param {Array<string|Object>} payloads - Lista de documentos crudos.
 * @param {Function} onProgress - Callback(batchId, processed, total) para actualizar UI.
 * @returns {Promise<{ok: boolean, data: BatchImport}>}
 */
async function importBatch(context, payloads, onProgress) {}

/**
 * Obtiene el estado de un batch previo o actual.
 * @param {Object} context
 * @param {string} batchId
 */
async function getBatchStatus(context, batchId) {}
```

## 3. Circuit Breaker Service (`src/services/ingestion/circuitBreakerService.js`)

```javascript
/**
 * Obtiene el estado simulado actual del circuit breaker.
 * @param {Object} context
 * @param {string} serviceName - Ej. 'FX_API'
 */
async function getCircuitBreakerState(context, serviceName) {}

/**
 * Fuerza el estado del circuit breaker (Solo Admin). Útil para testing de resiliencia.
 * @param {Object} context
 * @param {string} serviceName
 * @param {string} forcedState - 'CLOSED', 'OPEN', 'HALF_OPEN'
 */
async function setCircuitBreakerState(context, serviceName, forcedState) {}
```

## 4. SLA Alert Service (`src/services/ingestion/alertService.js`)

```javascript
/**
 * Evalúa los documentos en PENDING_INPUT y genera StagingAlerts si superan 48h.
 * @param {Object} context
 */
async function triggerSLAEvaluation(context) {}
```
