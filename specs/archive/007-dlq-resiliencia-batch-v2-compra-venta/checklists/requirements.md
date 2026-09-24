# Matriz de Trazabilidad de Requerimientos (007)

Este documento vincula el código y las historias de usuario de la especificación 007 con el Documento de Diseño del Sistema (SDD).

| ID SDD | Descripción Corta | Estado | Pruebas Unitarias / Cobertura | Archivos Relacionados |
| :--- | :--- | :--- | :--- | :--- |
| **RF-06** | Manejo de Fallos de Parseo y DLQ | ✅ En Alcance | `dlq.test.js` | `domain/ingestion/dlq.js`, `dlqService.js` |
| **RF-09** | Re-procesamiento desde DLQ | ✅ En Alcance | `dlqService.test.js` | `services/dlqService.js`, `DLQView.jsx` |
| **RF-12** | Importación Masiva (Batch) | ✅ En Alcance | `batchProcessor.test.js` | `batchService.js`, `BatchProgress.jsx` |
| **NRF-07** | Resiliencia (Circuit Breaker y Outbox) | ✅ En Alcance (Simulado) | `circuitBreaker.test.js` | `circuitBreakerService.js`, `CircuitBreakerPanel.jsx` |
| **NRF-10** | SLA de Staging (48h en PENDING_INPUT) | ✅ En Alcance | `stagingAlerts.test.js` | `alertService.js` |
| **CU-04** | Fallo de Parseo (Sin bloqueo) | ✅ En Alcance | - | `dlqService.js` |
| **CU-05** | Operador re-procesa documento | ✅ En Alcance | - | `DLQView.jsx` |
| **HU-05** | Gestión de DLQ (Soporte) | ✅ En Alcance | - | `DLQView.jsx`, `DLQList.jsx`, `DLQDetail.jsx` |
| **RD-13** | Patrón Outbox | ⚠️ Parcial | - | (Cubierto principalmente en spec 005, aquí se monitorea si falla) |

## Verificaciones Pre-Pull Request
- [ ] ¿El operador de soporte NO tiene acceso a pantallas ajenas a la DLQ?
- [ ] ¿El Admin tiene un toggle manual para el Circuit Breaker (CLOSED/OPEN/HALF_OPEN)?
- [ ] ¿Los fallos simulados del parser caen correctamente en el estado PENDING de la tabla DLQEntry?
- [ ] ¿La interfaz del importador masivo no bloquea el navegador de forma permanente (Promise batching)?
