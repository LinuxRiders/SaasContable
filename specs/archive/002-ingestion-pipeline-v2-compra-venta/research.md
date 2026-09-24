# 002-ingestion-pipeline: Investigación y Decisiones Técnicas

## Decisión 1: Representación de Montos Monetarios
**Contexto:** Los documentos fuente (UBL, JSON externos) traen montos con decimales (ej. `100.50`). En JavaScript, operar con floats para dinero causa errores de precisión.
**Decisión:** Todos los montos dentro de `CanonicalDocument` y `FinancialLine` se almacenarán y operarán estricta y únicamente como **ENTEROS (Centavos)**.
**Consecuencia:** Los parsers (`IDocumentParser`) tienen la responsabilidad exclusiva de convertir los floats/strings del origen (`100.50`) a enteros (`10050`) durante la fase de ingestión. El resto del sistema asume centavos.

## Decisión 2: Estrategia de Deduplicación
**Contexto:** Evitar que una misma factura se registre dos veces si el usuario la sube por error.
**Decisión:** Generar un identificador único determinista (`DeduplicationHash`) basado en: `[tenantId]-[emisorRuc]-[tipoDoc]-[numeroDoc]-[fechaEmision]`.
**Manejo de Colisiones:** Si se procesa un `RawPayload` que genera un hash ya existente, el servicio retornará una respuesta exitosa pero indicando que es un `DUPLICATE`, enlazando al `CanonicalDocument` previo. No se generará un nuevo documento contable.

## Decisión 3: Identificadores de Parsers y Extensibilidad
**Contexto:** El sistema debe detectar automáticamente qué parser usar para un payload.
**Decisión:** Los parsers declararán un método `canParse(metadata, rawPayload)`. El `IParserRegistry` iterará sobre los parsers registrados y seleccionará el primero que retorne `true`.
- UBL Parser verifica: contenido es string y empieza con `<?xml` o contiene `<Invoice`.
- JSON Parser verifica: contenido es objeto/JSON y tiene firmas específicas (ej. `documentType`).

## Decisión 4: Almacenamiento Inmutable (Append-Only)
**Contexto:** Requerimiento RD-01 exige no mutar el origen.
**Decisión:** El `RawPayload` se guarda en un array/tabla independiente en `localStorage` con un ID autogenerado. El `CanonicalDocument` mantiene una referencia `rawPayloadRef` hacia ese ID. Nunca se hace UPDATE a la tabla de RawPayloads, solo INSERT.

## Decisión 5: Obtención de Tipo de Cambio (FX)
**Contexto:** Si el documento es en USD, necesitamos PEN a la fecha de emisión.
**Decisión:** El orquestador consultará un servicio FX asíncrono. Si el servicio no encuentra el TC del día exacto (ej. sábado), buscará recursivamente hacia atrás hasta el TC del viernes. Si falla la API simulada, se aplica un TC `provisional = true`, permitiendo la ingestión pero levantando un flag para revisión posterior.
