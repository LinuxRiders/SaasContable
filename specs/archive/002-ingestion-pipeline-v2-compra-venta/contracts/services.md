# 002-ingestion-pipeline: Contratos de Servicios

## IngestionService

El servicio principal asíncrono para ingestar documentos.

```javascript
/**
 * Inicia el proceso de ingestión de un nuevo documento.
 * @async
 * @param {Object} context - { tenantId, userId, role }
 * @param {string|Object} rawPayload - El contenido del archivo (XML string, JSON, etc.)
 * @param {Object} metadata - Información auxiliar (ej. { filename: 'factura.xml', format: 'XML' })
 * @returns {Promise<IngestionResult>}
 */
async function ingestDocument(context, rawPayload, metadata) {}

/**
 * @typedef {Object} IngestionResult
 * @property {boolean} ok - True si terminó el pipeline correctamente o fue duplicado reconocido
 * @property {Object} [data]
 * @property {CanonicalDocument} [data.document] - El documento resultante
 * @property {string} [data.status] - 'CREATED', 'DUPLICATE', 'DLQ'
 * @property {string} [data.rawRefId] - ID del raw payload persistido
 * @property {Object} [error]
 * @property {string} [error.code] - 'NO_PARSER_FOUND', 'INVALID_FORMAT'
 * @property {string} [error.message]
 */

/**
 * Retorna los documentos recientemente procesados para la UI.
 * @async
 * @param {Object} context
 * @param {Object} options - { limit, offset }
 * @returns {Promise<{ok: boolean, data: CanonicalDocument[]}>}
 */
async function listIngestedDocuments(context, options) {}
```

## FxService

Servicio para consultar tipos de cambio.

```javascript
/**
 * Resuelve el tipo de cambio entre dos monedas para una fecha específica.
 * @async
 * @param {Object} context
 * @param {string} from - Moneda origen (ej. 'USD')
 * @param {string} to - Moneda destino (ej. 'PEN')
 * @param {string} date - Fecha 'YYYY-MM-DD'
 * @returns {Promise<{ok: boolean, data: ExchangeRate}>}
 */
async function resolveRate(context, from, to, date) {}
```

## ParserRegistry Contract

Mantenido en memoria, utilizado internamente por el `IngestionService`.

```javascript
/**
 * Interfaz que deben cumplir los Parsers.
 */
class IDocumentParser {
  /**
   * Evalúa si este parser puede manejar el payload.
   * @param {Object} metadata
   * @param {any} rawPayload
   * @returns {boolean}
   */
  canParse(metadata, rawPayload) {}

  /**
   * Extrae la información y retorna un documento canónico parcial.
   * IMPORTANTE: Debe convertir todos los montos a CENTAVOS (enteros).
   * @param {any} rawPayload
   * @returns {Partial<CanonicalDocument>}
   * @throws {Error} Si el formato es inválido durante el parseo
   */
  parse(rawPayload) {}
}
```
