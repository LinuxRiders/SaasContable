# 002-ingestion-pipeline: Lista de Verificación y Requerimientos de Calidad

## Alineación con Principios Arquitectónicos
- [ ] **Aislamiento del Dominio:** ¿Los parsers son JS puro sin imports de React ni accesos a red/localStorage?
- [ ] **Manejo de Moneda:** ¿Todos los atributos de dinero en `CanonicalDocument` y `FinancialLine` son documentados e implementados como enteros (`cents`)?
- [ ] **Inmutabilidad:** ¿El servicio garantiza que se guarda el payload crudo ANTES de cualquier intento de parseo o transformación?
- [ ] **Multi-Tenant:** ¿El cálculo del hash de deduplicación incluye el `tenantId`?
- [ ] **Extensibilidad:** ¿Se implementó el patrón *Strategy* a través de `IParserRegistry` en lugar de un `switch` gigante en el orquestador?

## Pruebas Requeridas (Vitest)
- [ ] Unit Test: `DeduplicationHash` genera el mismo string para inputs iguales, diferentes para fechas/emisor distintos.
- [ ] Unit Test: `JsonInvoiceParser` convierte correctamente floats del JSON (ej. `118.50`) a enteros (`11850`). Maneja problemas de precisión de JS (ej `0.1 + 0.2`).
- [ ] Unit Test: `IParserRegistry` selecciona el parser correcto basado en la evaluación de `canParse`. Retorna null o throw si ninguno aplica.
- [ ] Integration: El orquestador sigue la secuencia: Guardar Raw -> Hash -> Parse -> FX -> Guardar Canonical.

## Checklist de UI (React)
- [ ] El componente de subida soporta Drag & Drop.
- [ ] Hay feedback visual asíncrono (simulación de latencia al procesar).
- [ ] La tabla de resultados muestra el monto con formato de moneda y el tipo de cambio aplicado si es extranjero.
- [ ] Se muestra un indicador (badge) si el documento fue detectado como DUPLICADO.
