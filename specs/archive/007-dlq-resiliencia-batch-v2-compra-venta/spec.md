# Especificación de la Funcionalidad: DLQ, Resiliencia y Batch (007)

> [!WARNING]
> **PENDIENTE DE REALINEAR CON SDD v3.0.** Este spec se escribió sobre el modelo anterior (compra/venta). No implementar hasta rehacerlo con `/speckit-specify` tomando como base el SDD v3.0 (§5, §20, §21) y el contrato del spec 001 (`specs/001-motor-plantillas-contables/contracts/`). Debe cubrir los archivos no estructurados en la DLQ (imagen o PDF ilegible, con el original visible), el re-enrolamiento como registro manual (§16) y dar al Admin acceso sin excepciones de SoD.

## 1. Visión General
Esta especificación define la implementación transversal de los patrones de resiliencia, la gestión de colas de mensajes muertos (DLQ), la importación masiva de documentos (Batch) y las alertas de nivel de servicio (SLA) para el sistema ContableOS. 

Siguiendo los principios de la Constitución (I-VII), este diseño es un prototipo frontend (React + localStorage) con reglas de dominio estrictas pero con simulaciones explícitas y controladas de la infraestructura asíncrona.

## 2. Alcance (In-Scope)
*   **DLQ (Dead Letter Queue):** Captura de documentos cuyo `rawPayload` falla durante el parsing o la validación inicial tras intentos simulados. Interfaz para que el `SupportOperator` pueda visualizar, diagnosticar y re-encolar documentos.
*   **Circuit Breaker (Simulado):** Componente de resiliencia para dependencias externas (como el API de tipo de cambio FX). Implementado mediante un toggle manual (CLOSED, OPEN, HALF_OPEN) para demostración determinista.
*   **Importación Masiva (Batch):** Simulador de carga bulk (`BatchImport`) con control de progreso, que delega al pipeline de ingestión y reporta errores por documento.
*   **Alertas de SLA (Staging):** Detección simulada de documentos en estado `PENDING_INPUT` por más de 48 horas con escalamiento lógico.

## 3. Fuera de Alcance (Out-of-Scope)
*   Integración real con RabbitMQ, Kafka o AWS SQS para colas.
*   Retries automáticos temporizados (se simulan como saltos de estado inmediatos o manuales).
*   Envío real de correos de alerta o notificaciones push.

## 4. Historias de Usuario (User Stories)
*   **US1 (P1):** Como Sistema, cuando un payload de documento falla repetidamente en el paso de parsing, debe enviarse a la DLQ con detalles estructurados del error (`errorType`, `errorMessage`) para evitar el bloqueo del pipeline.
*   **US2 (P1):** Como Operador de Soporte (`SupportOperator`), quiero visualizar la bandeja DLQ, diagnosticar el error en el payload crudo y solicitar el re-procesamiento (`re-enroll`) hacia el inicio del pipeline de ingestión.
*   **US3 (P2):** Como Administrador (`Admin`), quiero interactuar con un panel de control simulado del `CircuitBreaker` (para el API de FX) y observar cómo el sistema rechaza rápidamente peticiones (fail-fast) cuando está en estado OPEN.
*   **US4 (P2):** Como Usuario Contable, quiero subir múltiples documentos de forma masiva (`BatchImport`), visualizando el progreso, total procesados, éxitos y fallos individuales.
*   **US5 (P3):** Como Supervisor, quiero ver alertas de documentos que han superado las 48 horas en `PENDING_INPUT` en el staging área, para garantizar el SLA de contabilidad.

## 5. Control de Acceso (ACL)
*   `Admin`: Acceso total para propósitos de prueba, incluyendo forzar estados del Circuit Breaker y alterar las fechas de SLA.
*   `SupportOperator`: Acceso EXCLUSIVO a las pantallas y servicios de DLQ. No tiene acceso a validación contable, aprobación, ni staging general.
*   `Contador` / `Asistente`: Acceso a Importación Masiva (Batch) y visualización de Alertas SLA, pero no a la DLQ.

## Eventos Emitidos [§11]
- `StagingAlertEscalated` — emitido cuando el documento supera las 48h en PENDING_INPUT (gatillo: chequeo de SLA)

## Trazabilidad SDD
Etiquetas de trazabilidad: [RF-06], [RF-09], [RF-12], [NRF-07], [NRF-10], [CU-04], [CU-05], [HU-05]
