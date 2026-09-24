# Contratos de Servicios Asíncronos

Los servicios reciben `Context = { tenantId, userId, role }` (Admin bypasses restrictions) y retornan una estructura estándar `{ ok: boolean, data?: any, error?: { code, message, details } }`.

## TranslationService
Ubicación: `src/services/ingestion/translationService.js`

```javascript
/**
 * Traduce un documento canónico a JournalEntry.
 * @param {Context} ctx
 * @param {string} canonicalDocId
 * @returns {Promise<Result>} { ok: true, data: { journalEntryId, state } }
 */
async function translateDocument(ctx, canonicalDocId)
```

## StagingService
Ubicación: `src/services/ingestion/stagingService.js`

```javascript
/**
 * Lista documentos en Staging (PENDING_INPUT).
 * @param {Context} ctx
 * @param {Object} filters (date, missingTags, etc.)
 * @returns {Promise<Result>} Lista paginada de JournalEntries
 */
async function getPendingInputQueue(ctx, filters)

/**
 * Maker actualiza y re-evalúa documento.
 * @param {Context} ctx
 * @param {string} journalEntryId
 * @param {Object} updates (tags o campos agregados)
 * @param {number} entityVersion (para NRF-13)
 * @returns {Promise<Result>} Nuevo estado
 */
async function updateAndReevaluate(ctx, journalEntryId, updates, entityVersion)

/**
 * Cancela documento desde Staging.
 * @param {Context} ctx
 * @param {string} journalEntryId
 * @param {string} justification
 * @param {number} entityVersion
 * @returns {Promise<Result>} Estado CANCELLED
 */
async function cancelDocument(ctx, journalEntryId, justification, entityVersion)
```
