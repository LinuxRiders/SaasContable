# Modelo de Datos: DLQ, Resiliencia y Batch (007)

Este documento define la estructura de datos almacenada en persistencia (localStorage). Todas las entidades tienen un `tenantId` para el aislamiento de datos (Multi-tenant).

## 1. DLQEntry
Representa un documento o evento que falló irreparablemente en el pipeline automatizado y requiere intervención manual.

```javascript
/**
 * @typedef {Object} DLQEntry
 * @property {string} id - UUID de la entrada en la DLQ.
 * @property {string} rawPayloadRef - Referencia o contenido crudo (JSON/XML) que falló.
 * @property {string} tenantId - Identificador del inquilino.
 * @property {string} errorType - Clasificación del error (ej. 'PARSE_ERROR', 'VALIDATION_ERROR').
 * @property {string} errorMessage - Detalle técnico del fallo.
 * @property {number} retryCount - Cuántas veces se intentó antes de ir a DLQ.
 * @property {number} maxRetries - Límite de intentos configurado (ej. 3).
 * @property {string} status - 'PENDING', 'REPROCESSING', 'RESOLVED', 'ABANDONED'.
 * @property {string} createdAt - Fecha ISO.
 * @property {string} [resolvedAt] - Fecha ISO en la que se solucionó.
 * @property {string} [resolvedBy] - userId del SupportOperator que lo resolvió.
 */
```

## 2. CircuitBreakerState
Guarda el estado global de un protector de dependencias. Para el prototipo, es manipulable globalmente (por tenant).

```javascript
/**
 * @typedef {Object} CircuitBreakerState
 * @property {string} serviceName - Ej. 'FX_API', 'SUNAT_VALIDEZ'.
 * @property {string} tenantId - Identificador del inquilino.
 * @property {string} state - 'CLOSED' (operativo), 'OPEN' (fail-fast), 'HALF_OPEN' (probando).
 * @property {number} failureCount - Fallos consecutivos detectados.
 * @property {string} lastFailureAt - Fecha ISO del último error.
 * @property {number} resetAfter - MS configurados para intentar volver a HALF_OPEN.
 */
```

## 3. BatchImport
Registra el progreso y resultado de una subida masiva de documentos.

```javascript
/**
 * @typedef {Object} BatchImport
 * @property {string} batchId - UUID del lote.
 * @property {string} tenantId - Identificador del inquilino.
 * @property {number} totalDocuments - Cantidad total de archivos en el lote.
 * @property {number} processed - Documentos evaluados hasta el momento.
 * @property {number} succeeded - Documentos que pasaron al Staging.
 * @property {number} failed - Documentos que terminaron en la DLQ.
 * @property {string} status - 'IN_PROGRESS', 'COMPLETED', 'PARTIAL_FAILURE', 'FAILED'.
 * @property {string} createdAt - Fecha ISO de inicio.
 * @property {string} [updatedAt] - Fecha ISO de último progreso.
 */
```

## 4. StagingAlert
Alerta generada para SLAs incumplidos en el Staging Area.

```javascript
/**
 * @typedef {Object} StagingAlert
 * @property {string} alertId - UUID de la alerta.
 * @property {string} journalEntryId - Referencia al asiento estancado.
 * @property {string} tenantId - Identificador del inquilino.
 * @property {number} hoursInStaging - Horas calculadas desde que entró a PENDING_INPUT.
 * @property {string} escalatedTo - Rol o ID de usuario al que se escaló.
 * @property {string} alertedAt - Fecha ISO.
 * @property {string} status - 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'.
 */
```
