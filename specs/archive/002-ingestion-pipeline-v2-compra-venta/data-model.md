# 002-ingestion-pipeline: Modelo de Datos

## Dominio Puro (No persistencia)

```javascript
/**
 * @typedef {Object} CanonicalDocument
 * Representación interna y agnóstica de un documento externo.
 * 
 * @property {string} id - UUID interno
 * @property {string} tenantId - ID del inquilino (Aislamiento)
 * @property {string} rawPayloadRef - Referencia al ID del payload original inmutable
 * @property {string} deduplicationHash - Hash para unicidad
 * @property {string} type - Tipo de documento (ej. 'INVOICE', 'RECEIPT', 'CREDIT_NOTE')
 * @property {string} fiscalIdEmitter - RUC o ID fiscal del emisor
 * @property {string} documentNumber - Serie y número (ej. 'F001-000123')
 * @property {string} currency - Moneda original (ej. 'PEN', 'USD')
 * @property {string} issueDate - Fecha de emisión (YYYY-MM-DD)
 * @property {string} receivedAt - Timestamp ISO de ingestión
 * @property {string} traceId - W3C Trace ID para trazabilidad transversal
 * @property {number} totalAmount - Monto total en CENTAVOS de la moneda original
 * @property {FinancialLine[]} lines - Líneas de detalle del documento
 * @property {ExchangeRate|null} exchangeRate - Tasa aplicada si currency != PEN
 */

/**
 * @typedef {Object} FinancialLine
 * Detalle individual de un documento (ítem).
 * 
 * @property {string} description - Descripción del ítem o servicio
 * @property {number} amount - Monto subtotal de la línea en CENTAVOS
 * @property {string} currency - Moneda de la línea (usualmente hereda del documento)
 * @property {string} taxCode - Código de impuesto aplicado (ej. 'IGV_18')
 * @property {string[]} tags - Etiquetas extraídas por el parser
 */

/**
 * @typedef {Object} ExchangeRate
 * Tasa de cambio aplicada a un documento.
 * 
 * @property {string} fromCurrency - Moneda origen (ej. 'USD')
 * @property {string} toCurrency - Moneda destino (ej. 'PEN')
 * @property {number} rate - Tasa de cambio como factor (ej. 3.750)
 * @property {string} effectiveDate - Fecha usada para buscar la tasa (YYYY-MM-DD)
 * @property {boolean} isProvisional - True si fue ingresado manualmente o si falló el servicio oficial
 */

/**
 * @typedef {Object} RawPayloadRecord
 * El almacenamiento inmutable del documento original (Solo persistencia).
 * 
 * @property {string} id - UUID autogenerado
 * @property {string} tenantId - ID del inquilino
 * @property {string} uploadTimestamp - Cuándo fue subido
 * @property {string} format - 'XML', 'JSON', 'PDF' (metadata)
 * @property {string} payload - El contenido crudo (String)
 */
```

## Transiciones de Estado del Orquestador

1. `RAW_RECEIVED`: API Gateway receives payload (El payload llega al servicio, se le asigna un `traceId` y se persiste).
2. `DUPLICATE_DETECTED`: Hash already exists (terminal, log + discard). Se calcula el `deduplicationHash`. Si existe, fin (retorna ID existente).
3. `CANONICAL_EXTRACTED`: Parser successful. Se genera el `CanonicalDocument`, resolviendo `ExchangeRate` si aplica.
4. `FAILED_PARSE`: Parser failure after retries (goes to DLQ). Ocurrió un error al extraer/parsear el documento.
