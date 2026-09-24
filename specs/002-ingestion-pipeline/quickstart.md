# Quickstart: Validación de la Ingestión Multiformato

**Feature**: 002-ingestion-pipeline · **Prerrequisito**: spec 001 implementado (paquete PE, catálogo de tipos de documento).

```bash
npx vitest run
npm run build
npm run dev
```

Documentos de prueba: `public/fixtures/documents/` (catálogo en `src/data/fixtures/documentFixtures.js`). **No regenerarlos**: cambiarían las huellas. Si hace falta regenerarlos, `node scripts/fixtures/generate-document-fixtures.mjs` (Windows con Edge) reescribe también el catálogo.

## Pruebas automáticas

| Área | Qué demuestra |
|---|---|
| `parseDecimalToMinor`, `validateFiscalId` | decimales por moneda; RUC válido e inválido (dígito verificador), DNI |
| `detectFormat` | firma PDF/JPEG/PNG, XML, JSON y CSV sin depender de la extensión |
| `ublReader` | DOC-01 a DOC-05 leídos con el perfil PE: partes, líneas, impuestos, totales y referencia de DOC-03; DOC-13 → `MALFORMED` |
| `jsonDocumentReader` | DOC-06, DOC-07 y DOC-15; esquema desconocido; moneda desconocida |
| `csvReader` | DOC-08 → 3 borradores; fila con importe inválido → `rowErrors`; cabecera distinta → `CSV_PROFILE_MISMATCH` |
| `simulatedExtractor` | DOC-09 (alta confianza), DOC-10 (3 campos dudosos), DOC-11 (`PDF_SCANNED`), DOC-12 → `UNREADABLE`; `forceLowConfidence` y `forceUnreadable` |
| `buildDedupKey` | `F001-00000123` = `F001-123`; distinto emisor ≠ duplicado |
| `decideIntake` | orden de decisión de research R-09 |
| **E2E** `fixtures.e2e.test.js` | los 16 documentos en orden sobre la semilla producen exactamente la tabla de data-model §8 (SC-001) |
| Servicio | permisos (solo Maker carga), límite de tamaño, original de solo agregado (huella intacta, SC-006), aislamiento por tenant, eventos y auditoría |
| Agnosticismo | ningún archivo de `src/domain/ingestion/intake/` contiene `RUC`, `IGV`, `SUNAT`, `'01'`, `'6'` como códigos, ni nombres de columnas del CSV |

## Escenarios manuales

1. **Ejemplos (US6)**: Maker `contador_maria`, empresa `01` → **Ingestión → Documentos de ejemplo**. Cargar DOC-01 … DOC-16 en orden y comparar cada resultado con su columna "esperado".
2. **Foto (US2)**: abrir DOC-10 en **Documentos recibidos**: imagen borrosa a la izquierda; a la derecha, emisor, IGV y total resaltados como dudosos.
3. **Duplicado entre formatos (US3)**: DOC-14 (PDF) aparece como duplicado de DOC-01 (XML), con enlace.
4. **Carga propia (US1, US7)**: descargar desde el catálogo DOC-01, DOC-06 y DOC-12 y subirlos juntos como archivos: resumen "1 duplicado, 1 recibido... 1 en DLQ" (DOC-01 y DOC-06 ya estaban si se hizo el paso 1).
5. **Formulario (US4)**: **Registro manual** → tipo "Documento interno" → operación "Depreciación" → dos líneas → registrar.
6. **Interruptores**: activar "Forzar baja confianza" y cargar DOC-09: todos sus importes quedan dudosos.
7. **Permisos**: como Auditor, la bandeja se ve completa y no aparecen los botones de carga; como Admin, tampoco se puede cargar.
8. **Reset**: "Reset a datos demo" vacía originales, recepciones, índice de huellas y DLQ.
