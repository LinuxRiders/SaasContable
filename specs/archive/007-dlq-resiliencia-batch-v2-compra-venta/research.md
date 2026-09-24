# Decisiones de Diseño e Investigación (007)

## Patrón Circuit Breaker en Frontend (Simulación)
En una arquitectura real, el Circuit Breaker existe en el backend (ej. usando Resilience4j o Polly) para proteger servicios externos como el API de Tipos de Cambio (FX). 
**Decisión para el prototipo:** Se implementa un servicio `circuitBreakerService` en memoria/localStorage. En lugar de fallar pseudo-aleatoriamente, los administradores tendrán un panel manual para forzar los estados: `CLOSED` (funciona normal), `OPEN` (falla rápido devolviendo un error sin llamar a la lógica subyacente), y `HALF_OPEN` (permite la siguiente llamada y cambia de estado según el resultado). 
**Justificación:** Esto permite al usuario (o al evaluador) probar explícitamente los flujos de "fallback" (ej. ingreso manual de tipo de cambio) sin depender de intermitencias de red.

## Simulador de DLQ y Retry (Retries Estáticos)
Las colas de mensajes muertos (DLQ) capturan eventos envenenados (poison pills). 
**Decisión:** Un registro en `DLQEntry` representa el mensaje. El contador `retryCount` y `maxRetries` existen, pero la lógica de "retry con backoff exponencial" se asume ocurrida ANTES de llegar a la DLQ. Para la simulación, cuando una importación masiva o individual reporta un `ParseError`, se registra inmediatamente en la tabla DLQ.
**Justificación:** Mantiene el modelo de programación asíncrono simple en el navegador, evitando el uso de `setInterval` o web workers complejos.

## Control de Progreso Batch
Para el `BatchImport`, el frontend debe mostrar un progreso. 
**Decisión:** El `batchService.js` recibirá un arreglo de `rawPayloads`. Procesará los elementos en lotes pequeños (chunks) usando `Promise.all` y llamadas recursivas o bucles `for...of` asíncronos. Actualizará un registro de `BatchImport` en localStorage tras cada chunk.
**Justificación:** Permite que la UI haga polling simulado o escuche eventos (callbacks) para actualizar una barra de progreso sin bloquear el hilo principal de React.

## SLA de Staging (Time-Travel)
Para probar la alerta de 48h (SLA), el testeo requeriría esperar 2 días.
**Decisión:** Se agregará un "modo Dev/Admin" que permita alterar el `createdAt` de los `CanonicalDocument` en el Staging Area (via un servicio especial o botón de debug) para simular el paso del tiempo y disparar el `StagingAlert`.
