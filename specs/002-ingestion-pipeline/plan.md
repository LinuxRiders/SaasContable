# Implementation Plan: Ingestión Multiformato de Documentos Sustentatorios

**Branch**: `002-ingestion-pipeline` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-ingestion-pipeline/spec.md`

## Summary

Implementar S1 del SDD v3.0 con los siguientes componentes:

- Recepción por archivo (uno o varios), formulario y documentos de ejemplo.
- Original guardado de solo agregado.
- Registro de lectores: UBL 2.1 con perfil de jurisdicción, JSON v1, CSV con perfil, formulario y extractor simulado por SHA-256 para PDF e imagen.
- Construcción del `CanonicalDocument` del spec 001 con procedencia y confianza por campo.
- Deduplicación agnóstica después de leer, y DLQ básica.
- Un bus de eventos simulado que entrega `DocumentReceived` al spec 003.
- La vista de ingestión y la bandeja de documentos recibidos, con el original junto a los datos.

Los 16 documentos de prueba reales ya están generados en `public/fixtures/documents/`.

## Technical Context

**Language/Version**: JavaScript ES2022 (ES Modules) + JSDoc

**Primary Dependencies**: React 18, Vite 6, lucide-react. APIs nativas: `DOMParser`, `TextDecoder`, `crypto.subtle`, `File.arrayBuffer`, `fetch`, `URL.createObjectURL`. Sin dependencias nuevas.

**Storage**: `localStorage` vía `repository.js`: `rawPayloads` (solo agregado), `intakeRecords`, `canonicalDocuments`, `dlq`, `dedupIndex` y `events` por tenant (data-model).

**Testing**: Vitest + `happy-dom` (su `DOMParser` en las pruebas del lector UBL); las pruebas leen los archivos de prueba con `node:fs`.

**Target Platform**: navegador moderno.

**Project Type**: SPA con backend simulado.

**Performance Goals**: procesar los 16 documentos de ejemplo en menos de 5 s con la latencia de demo por defecto.

**Constraints**: 300 KB por archivo; cuota de `localStorage` ≈ 5 MB (los ejemplos se guardan por URL, sin bytes); dominio puro; nada de país en `src/domain/ingestion/intake/`.

**Scale/Scope**: 5 lectores, ~10 módulos de dominio, 1 servicio + bus de eventos, 2 vistas, ~8 componentes.

## Constitution Check

| Principio | Estado | Cómo se cumple |
|---|---|---|
| I. Backend simulado | ✅ | `intakeService` `async`, `ok`/`fail`, `repository.js`; el reset limpia las colecciones de ingestión. |
| II. Invariantes reales | ✅ | RD-01 (`appendOnly`, huella verificable), RD-04 (clave agnóstica + SHA-256), RD-08 (tenant en cada clave y en cada filtro), RD-15 preparado (procedencia y confianza por campo). Importes enteros. Extractor simulado detrás de un interruptor explícito. |
| III. Dominio puro / ACL | ✅ | Lectores puros que producen `CanonicalDocument`; `DOMParser`, reloj, IDs y hash inyectados; perfiles del paquete inyectados. |
| IV. Identidad y segregación | ✅ | Solo el Maker carga; permisos en el servicio; auditoría por acción. |
| V. Pruebas | ✅ | Pruebas por lector y una prueba E2E con los 16 documentos reales. |
| VI. Simplicidad | ✅ | Sin librerías de PDF, OCR, XML ni CSV: el extractor es simulado, y para XML y CSV bastan las APIs nativas. |
| VII. Coherencia | ✅ | `IngestionView` se reescribe; `DocumentosRecibidosView` nueva; patrón de vistas, `Modal` y `MetricCard`. |

## Project Structure

### Documentation

```text
specs/002-ingestion-pipeline/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
├── contracts/ (domain-api.md, services.md, document-json-v1.md)
└── checklists/requirements.md
```

### Source Code

```text
public/fixtures/documents/            # (YA GENERADO) 15 archivos de prueba + README
scripts/fixtures/                     # (YA EXISTE) fuente de datos y generador
src/
├── data/
│   ├── fixtures/documentFixtures.js  # (YA GENERADO) catálogo, huellas, extracción simulada
│   └── jurisdictions/pe/
│       ├── readingProfiles.js        # perfiles UBL y CSV (nuevo)
│       └── pack.js                   # (spec 001) fiscalIdTypes con checkDigit
├── domain/
│   ├── shared/
│   │   ├── money.js                  # parseDecimalToMinor
│   │   └── fiscalId.js               # validateFiscalId (MOD11 parametrizado)
│   └── ingestion/intake/
│       ├── types.js
│       ├── formatDetection.js
│       ├── readerRegistry.js
│       ├── readers/
│       │   ├── ublReader.js · jsonDocumentReader.js · csvReader.js · formReader.js · simulatedExtractor.js
│       ├── canonicalBuilder.js
│       ├── dedup.js
│       ├── intakeDecision.js
│       ├── runIntake.js
│       └── __tests__/                # una suite por módulo + fixtures.e2e.test.js
├── services/
│   ├── events/eventBus.js            # nuevo, compartido por 003–007
│   └── ingestion/
│       ├── intakeService.js
│       ├── seedIngestion.js          # colecciones vacías en la semilla
│       └── index.js                  # (ampliar)
├── components/intake/
│   ├── FileDropzone.jsx · SampleCatalog.jsx · ManualDocumentForm.jsx · IntakeSummary.jsx
│   ├── OriginalViewer.jsx            # reutilizado por el spec 003
│   ├── CanonicalDocumentPanel.jsx    # reutilizado por el spec 003
│   └── ConfidenceBadge.jsx
└── views/
    ├── IngestionView.jsx             # reescrita: Cargar · Registro manual · Ejemplos
    └── DocumentosRecibidosView.jsx   # nueva: bandeja con filtros y detalle
```

**Structure Decision**: la ingestión nueva va en `src/domain/ingestion/intake/` para separarla de la infraestructura conservada (`money`, `fx`, `audit`, `periods`, `stateMachine`, `permissions`). El bus de eventos va en `src/services/events/` porque lo comparten los specs 002 a 007.

## Orden de construcción

1. Utilidades (`money`, `fiscalId`) y perfiles del paquete.
2. Detección, registro de lectores y los cinco lectores, cada uno con sus pruebas sobre los archivos reales.
3. `canonicalBuilder`, `dedup`, `intakeDecision` y `runIntake`, más la prueba E2E de los 16 documentos. **Hito MVP.**
4. `eventBus` e `intakeService`, con sus permisos y auditoría.
5. Componentes y vistas.

## Complexity Tracking

| Decisión | Por qué | Alternativa descartada |
|---|---|---|
| Extractor simulado por huella | Determinismo y demo sin servicios externos | OCR en el navegador (Tesseract.js): dependencia pesada y resultados no deterministas |
| Perfiles de lectura como datos | RD-14: el lector UBL no debe saber qué es un RUC | Lector "UBL-Perú" con códigos fijos |
| Originales de ejemplo por URL | La cuota de `localStorage` no admite muchos binarios | Guardar todo en base64 |
