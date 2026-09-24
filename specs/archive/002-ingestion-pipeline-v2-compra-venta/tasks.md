# 002-ingestion-pipeline: Tareas de Implementación

## Fase 1: Core Domain Models e Interfaces
- [ ] T001 [P] [US1] Crear la estructura de directorios para `src/domain/ingestion/` (entities, parsers, valueObjects, fx).
- [ ] T002 [P] [US1] Definir objeto de valor y clase factory para `CanonicalDocument.js` con validaciones básicas y JSDoc.
- [ ] T003 [P] [US1] Definir clase `FinancialLine.js` asegurando validación estricta de montos enteros (cents).
- [ ] T004 [P] [US3] Definir entidad `ExchangeRate.js`.

🛑 **CHECKPOINT 1:** Revisión de modelos de dominio. ¿Los tipos numéricos están claramente marcados para centavos?

## Fase 2: Deduplicación y Utilidades
- [ ] T005 [P] [US2] Implementar `DeduplicationHash.js` que recibe atributos y genera un string normalizado (ej. SHA-256 o string concatenado limpio).
- [ ] T006 [P] [US2] Escribir tests unitarios en Vitest para `DeduplicationHash` (casos de sensibilidad a mayúsculas, etc).
- [ ] T007 [P] [US1] Crear utilidad general de dominio `MoneyFormatter.js` / `MoneyParser.js` para conversiones seguras float->int evitando fallos de precisión.

## Fase 3: Sistema de Parsers (Strategy/Registry)
- [ ] T008 [P] [US4] Crear contrato base `IDocumentParser.js` con throws por defecto para `canParse` y `parse`.
- [ ] T009 [P] [US4] Implementar `ParserRegistry.js` con métodos `register()` y `resolve()`.
- [ ] T010 [P] [US1] Implementar `JsonInvoiceParser.js` que extienda de IDocumentParser.
- [ ] T011 [P] [US1] Implementar `UblInvoiceParser.js` (versión dummy o básica que busque substrings XML usando Regex simple por ahora).
- [ ] T012 [P] [US4] Escribir tests en Vitest comprobando que el Registry selecciona el Json parser para un JSON y el UBL parser para un XML.

🛑 **CHECKPOINT 2:** Revisión del patrón Strategy para los parsers y manejo de dinero.

## Fase 4: Repositorios de Almacenamiento
- [ ] T013 [P] [US1] Implementar `RawPayloadRepository.js` en `src/services/storage/` (localStorage, append-only, UUIDs).
- [ ] T014 [P] [US1] Implementar `CanonicalDocumentRepository.js` en `src/services/storage/`.
- [ ] T015 [P] [US2] Agregar método `findByHash(tenantId, hash)` a `CanonicalDocumentRepository`.

## Fase 5: Servicio de FX (Tipos de Cambio)
- [ ] T016 [P] [US3] Crear mock data en `src/data/mockExchangeRates.js` (USD y EUR vs PEN para varias fechas).
- [ ] T017 [P] [US3] Implementar `FxResolver.js` en dominio como contrato/interfaz.
- [ ] T018 [P] [US3] Implementar `fxService.js` en `src/services/ingestion/` que consulte la data mock simulando delay, con lógica de fallback si la fecha exacta no está.

🛑 **CHECKPOINT 3:** Almacenamiento y FX Service. ¿El repositorio de RawPayload asegura inmutabilidad?

## Fase 6: Orquestador (Ingestion Service)
- [ ] T019 [S] [US1] Crear cascarón de `ingestionService.js` con inyección de dependencias (repos, registry, fxService).
- [ ] T020 [S] [US1] Implementar estado `RAW_RECEIVED` en `ingestDocument`: Generar TraceID y persistir en `RawPayloadRepository`.
- [ ] T021 [S] [US2] Implementar estado `DUPLICATE_DETECTED`: Generar y validar el `DeduplicationHash`.
- [ ] T022 [S] [US1] Implementar estado `CANONICAL_EXTRACTED`: Parsear usando el registry, resolver moneda con `fxService` y persistir el `CanonicalDocument`.
- [ ] T023 [S] [US1] Implementar estado `FAILED_PARSE`: Capturar errores de parseo y marcarlos (DLQ).
- [ ] T024 [S] [US1] Implementar emisión de eventos de auditoría: `RawPayloadStored` al persistir raw, `DocumentDuplicated` al detectar duplicado, `DocumentParsingFailed` al fallar parseo — eventos append-only en `repo.appendAuditLog()`
- [ ] T025 [P] [US1] Implementar `listIngestedDocuments()` en el servicio.

🛑 **CHECKPOINT 4:** Orquestador completo. ¿Maneja promesas, delays asíncronos y captura errores (ej. sin parser)?

## Fase 7: Vistas de UI (React)
- [ ] T026 [P] [US1] Crear vista principal `IngestionView.jsx` en `src/views/ingestion/`.
- [ ] T027 [P] [US1] Crear componente `UploadArea.jsx` con soporte simple click/drag para archivos.
- [ ] T028 [P] [US1] Integrar lectura de archivos (FileReader API) en `UploadArea` para obtener texto (XML/JSON).
- [ ] T029 [S] [US1] Conectar UI con `IngestionService.ingestDocument()`, manejando el estado `loading` e indicadores.
- [ ] T030 [P] [US5] Ajustar la lógica del UI para procesar múltiples archivos (Importación Masiva) secuencialmente o `Promise.all`.
- [ ] T031 [P] [US1] Crear componente `IngestionStatusList.jsx` o tabla para mostrar los documentos ingestados recientemente (usando `listIngestedDocuments`).
- [ ] T032 [P] [US3] Asegurar que la tabla muestra las divisas correctamente, formateando montos de centavos a decimales en UI (ej `amount / 100`).
- [ ] T033 [P] [US2] Añadir indicación visual (badge/color) en la UI para documentos rechazados o duplicados.

🛑 **CHECKPOINT 5:** Revisión Final E2E. El usuario debe poder subir un JSON y verlo en la tabla convertido en CanonicalDocument en Centavos.
