# Investigación y Decisiones Técnicas

## 1. Implementación de Hash-Chaining (NRF-09)
Para asegurar la inmutabilidad local del `EventStore` (y simular blockchain/registros inmutables en servidor), emplearemos Web Crypto API nativa (`crypto.subtle.digest('SHA-256', ...)`). 
- **Decisión:** Cada nuevo evento escrito incluirá un `previousHash`. El primer evento del tenant usará la cadena `"GENESIS"`.

## 2. Patrón Outbox Atómico Simulando RD-13
LocalStorage opera de manera síncrona. Aprovecharemos esta característica para simular una "transacción".
- **Decisión:** `publishService.js` actualizará el documento origen (`JournalEntry`) y agregará una entrada en el arreglo `Outbox` dentro de un único bloque de escritura síncrono que realiza el `repository.js`. Si algo lanza un error a nivel de dominio, ninguna de las mutaciones será serializada.

## 3. Retries de Outbox (POSTED_PENDING_PUBLISH)
- **Decisión:** Un procesador `OutboxProcessor` buscará periódicamente, en modo background o provocado por una carga de página, los registros en estado `POSTED_PENDING_PUBLISH`. Tras lograr emitir el evento en el `EventBus`, la entrada del Outbox se marca como enviada y se descarta de la cola de reintentos.

## 4. Proyecciones CQRS y Contextos Reactivos (NRF-04)
El patrón CQRS dicta separar lecturas de escrituras.
- **Decisión:** `projectionService.js` mantendrá modelos desnormalizados. Los montos se manejarán estrictamente como centavos (CENTS, formato integer). Las interfaces en React consumirán estas proyecciones precalculadas para no sobrecargar el renderizado cuando consultan el Libro Diario o Libro Mayor de un mes contable (Period).
