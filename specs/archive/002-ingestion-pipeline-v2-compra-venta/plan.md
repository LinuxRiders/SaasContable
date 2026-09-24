# 002-ingestion-pipeline: Plan de Implementación

## Contexto Técnico
Este módulo implementa el Subsistema S1 del SDD. Siguiendo los principios de Clean Architecture y la Constitución del proyecto, la capa de dominio (`src/domain/ingestion/`) contendrá la lógica pura (parsers, hashes, reglas de negocio), mientras que la orquestación asíncrona residirá en `src/services/ingestion/`. El almacenamiento usará implementaciones mockeadas basadas en `localStorage`.

## Revisión de la Constitución
- **I. Frontend-only prototype:** Se usarán servicios asíncronos simulados (`IngestionService`), demorando artificialmente para imitar latencia de red.
- **II. Real domain invariants:** La lógica de deduplicación (hashes) y parsing estricto se codificará en puro JS.
- **III. Pure isolated domain:** Ningún parser o entidad del dominio accederá a `localStorage` ni conocerá de React.
- **IV. Simulated identity:** El servicio recibirá `context = { tenantId, userId, role }`.
- **V. Vitest testing:** Cobertura estricta para la generación de hashes y el registro de parsers.

## Estructura de Archivos
```text
src/
  domain/
    ingestion/
      entities/
        CanonicalDocument.js
        ExchangeRate.js
        FinancialLine.js
      parsers/
        IParserRegistry.js       # Interfaz/Clase base
        UblInvoiceParser.js      # Implementación para XML UBL (mock)
        JsonInvoiceParser.js     # Implementación para JSON
      valueObjects/
        DeduplicationHash.js     # Lógica de creación del hash
      fx/
        IFxResolver.js           # Interfaz/Contrato
  services/
    ingestion/
      ingestionService.js        # Orquestador del pipeline
      fxService.js               # Implementación de IFxResolver (mock)
  data/
    mockExchangeRates.js         # Datos semilla para tipos de cambio
    mockRawPayloads.js           # Documentos de prueba (XML strings, JSONs)
  views/
    ingestion/
      IngestionView.jsx          # UI principal
  components/
    ingestion/
      UploadArea.jsx             # Drag & Drop
      IngestionStatusList.jsx    # Estado del procesamiento
      DocumentDetailDialog.jsx   # Ver detalle del CanonicalDocument
```

## Fases de Implementación

1. **Fundaciones de Dominio:** Entidades base (`CanonicalDocument`, `FinancialLine`) y generador de hash (`DeduplicationHash`).
2. **Registro de Parsers (Strategy):** Contratos de parsers, registro dinámico y primeras implementaciones (JSON y UBL simulado).
3. **Resolución FX:** Entidad `ExchangeRate`, mock data de tipos de cambio y lógica de fallback (último día hábil).
4. **Servicio Orquestador:** `ingestionService.js` que une RawPayload -> Hash -> Parser -> FX -> Canonical.
5. **Capa de Almacenamiento:** Repositorio en `localStorage` para RawPayloads y CanonicalDocuments (append-only).
6. **Integración UI:** Componentes de subida, visualización de progreso y grilla de documentos procesados.
7. **Pruebas y QA:** Validar casos límite (duplicados, sin parser, FX faltante).
