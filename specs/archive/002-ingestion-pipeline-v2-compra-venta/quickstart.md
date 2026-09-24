# 002-ingestion-pipeline: Escenarios de Validación Rápida (Quickstart)

Para verificar que la implementación del Subsistema S1 es correcta, utilizar la UI de Ingestión (`/ingestion`) o los tests de integración ejecutando las siguientes pruebas:

## 1. Happy Path: Ingestión de Factura JSON en PEN
**Acción:** Subir un JSON válido representando una factura en Soles.
**JSON de prueba:**
```json
{
  "documentType": "INVOICE",
  "emitterRuc": "20123456789",
  "number": "F001-123",
  "issueDate": "2026-05-10",
  "currency": "PEN",
  "total": 118.00,
  "lines": [
    { "desc": "Servicios", "amount": 100.00, "tax": "IGV_18" }
  ]
}
```
**Validación esperada:**
- El sistema procesa con éxito.
- El `CanonicalDocument` generado tiene `totalAmount: 11800` (Centavos).
- Las líneas tienen montos `10000` y tags correctos.
- `exchangeRate` es `null`.

## 2. Deduplicación Estricta
**Acción:** Subir exactamente el mismo JSON del escenario 1 por segunda vez.
**Validación esperada:**
- El sistema responde con éxito rápido.
- Estado devuelto es `DUPLICATE`.
- Se asocia al mismo `CanonicalDocument` anterior; no se crea uno nuevo.
- El log en consola muestra "Deduplication hit for hash: XXX".

## 3. Resolución de FX en USD
**Acción:** Subir una factura en USD con fecha `2026-05-15`.
**Validación esperada:**
- El orquestador pausa (async) consultando el FX.
- El documento final tiene `currency: 'USD'`.
- La propiedad `exchangeRate` está poblada (ej. `rate: 3.75`).

## 4. Fallo de FX (Fallback a Provisional)
**Acción:** Subir factura en EUR para una fecha donde no hay mock data en `mockExchangeRates.js`.
**Validación esperada:**
- El servicio FX falla internamente o devuelve "Not Found".
- El documento se ingiere con éxito pero `exchangeRate` tiene `isProvisional: true` y rate `1.0`.

## 5. Parser no encontrado
**Acción:** Subir un archivo de texto con contenido "Hola Mundo" (formato no reconocido).
**Validación esperada:**
- Falla la ingestión controladamente.
- El error es `NO_PARSER_FOUND`.
- El `RawPayload` SIEMPRE DEBE haberse guardado en el storage (inmutabilidad origen), pero no se crea el `CanonicalDocument`.
