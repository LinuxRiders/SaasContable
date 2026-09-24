# Implementation Plan: Configuración Contable y Motor de Plantillas por Tipo de Documento

**Branch**: `001-motor-plantillas-contables` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-motor-plantillas-contables/spec.md`

## Summary

Construir el Subsistema S0 del SDD v3.0 sobre el modelo contable real:

- un **Paquete de Jurisdicción** Perú como dato estático e inyectado;
- el **documento canónico genérico**;
- un **mapa de cuentas** por empresa validado contra el Plan Contable existente;
- **reglas de clasificación** de la operación;
- **plantillas** identificadas por *(tipo de documento, perspectiva, tipo de operación)* que declaran todas sus líneas mediante un **lenguaje de expresiones AST**, con selección determinista, pruebas obligatorias, activación por empresa, versionado inmutable y auditoría.

El núcleo vive en `src/domain/accounting/` como funciones puras, sin nada específico de un país. Los servicios mock en `src/services/accounting/` resuelven el paquete del tenant y lo inyectan. Tres vistas nuevas reemplazan a las de plantillas anteriores. La función `interpretDocument` es la misma que usarán la ingestión (spec 002) y la traducción (spec 003).

## Technical Context

**Language/Version**: JavaScript ES2022 (ES Modules) con JSDoc para tipos

**Primary Dependencies**: React 18, Vite 6, lucide-react (existentes). Sin dependencias nuevas.

**Storage**: `localStorage` solo a través de `src/services/storage/repository.js`, con claves `contableos:v1:<tenantId>:<colección>` (data-model §13). El paquete es dato estático en `src/data/jurisdictions/` (research R-01).

**Testing**: Vitest 5 (`npx vitest run`), con `happy-dom` ya instalado para los servicios que usan `repository` sobre `memoryStorage`.

**Target Platform**: Navegador moderno (Chrome, Edge, Firefox).

**Project Type**: SPA front-end con backend simulado (prototipo).

**Performance Goals**: interacción fluida; evaluar una plantilla sobre un documento de ejemplo en menos de 50 ms en el navegador (referencia RNF-02, no se mide formalmente).

**Constraints**: sin TypeScript, router, gestor de estado global ni UI kit (constitución VI); importes enteros (constitución II); dominio puro con reloj e IDs inyectados (constitución III); nada de país en `src/domain/accounting/` (RD-14).

**Scale/Scope**: 1 paquete (16 tipos de documento, 7 impuestos o retenciones, 25 tipos de operación, ~30 roles, 5 libros, 9 plantillas base), 2 empresas semilla, ~15 módulos de dominio, 5 servicios, 3 vistas, ~15 componentes.

## Constitution Check

*GATE: pasa antes de la Fase 0 y se re-verificó tras la Fase 1.*

| Principio (v1.1.0) | Estado | Cómo se cumple |
|---|---|---|
| **I. Prototipo front-end con backend simulado** | ✅ | Servicios `async` en `src/services/accounting/` con `ok`/`fail`, latencia de `demoSettings` y contratos en [contracts/services.md](contracts/services.md). `localStorage` solo vía `repository.js`. El reset re-siembra la configuración (FR-034). |
| **II. Invariantes reales, infraestructura simulada** | ✅ | RD-10 (versiones congeladas por hash y uso), RD-14 (núcleo sin país, verificado por prueba), RD-15 (`validateDocument`), RD-16 (`classify`, `selectTemplate`), RD-17 (`resolveAccount`, `checkTemplateAccounts`), RD-18 (`catalog.js` por vigencia) y RD-03 (`checkBalance` en pruebas y simulación). Importes enteros, `mulRate` y `convert` con redondeo único. |
| **III. Dominio puro y aislado (ACL)** | ✅ | `src/domain/accounting/` no importa React, `localStorage`, `src/data/` ni el reloj. El paquete, el plan, el mapa, las reglas y las plantillas llegan como argumentos. El registro de paquetes es Strategy (`src/data/jurisdictions/index.js`). Los typedefs conservan los nombres del SDD §13. |
| **IV. Identidad, tenant y segregación** | ✅ | `ctx` obligatorio; `authorize` con operaciones nuevas; el Admin ya no tiene *bypass* total (research R-12); aislamiento por tenant en cada servicio; eventos de auditoría por acción (R-15). |
| **V. Pruebas del dominio con Vitest** | ✅ | Pruebas por módulo de dominio y servicio (quickstart). Cada plantilla base tiene casos positivos y hay casos negativos. Prueba de agnosticismo con un paquete ficticio. El conjunto multiformato de ingestión corresponde al spec 002. |
| **VI. Simplicidad y stack acotado** | ✅ | Cero dependencias nuevas. Constructor visual de expresiones sin parser de texto (R-05). SHA-256 con Web Crypto (ya en `serviceKit`). |
| **VII. Coherencia con el prototipo existente** | ✅ | Vistas `src/views/*View.jsx` registradas en `Sidebar.jsx` y `App.jsx`; `Modal`, `MetricCard` y `theme.css`. `mockPlanContable.js` solo se amplía con datos (FR-033). No se refactorizan Compras, Ventas ni Tesorería. |

**Re-check post-diseño**: sin violaciones. La única desviación consciente es de alcance: `interpretDocument` omite FX real y periodo, que se resuelven en el spec 003 (documentado en la API de dominio §7).

## Estado de partida (tras la limpieza previa)

Se eliminó el código construido sobre el modelo "compra/venta" y el `CanonicalDocument` atado a Perú. El implementador **no debe recuperar** nada de lo eliminado: está en el historial de git (commit `73b9fd4`) solo como referencia de lo que no hay que hacer.

**Se conserva** (infraestructura agnóstica, reutilizable):

- `src/domain/ingestion/money.js`, `fx.js`, `audit.js`, `periods.js`, `stateMachine.js` y `permissions.js`, con sus pruebas.
- `src/services/ingestion/serviceKit.js` y `demoService.js` (reducido a la siembra base y los interruptores de demo).
- `src/services/storage/*` y `src/hooks/useIngestionContext.js`.

**Se eliminó**:

- `src/domain/templates/` completo.
- `src/domain/ingestion/`: `classify`, `translator`, `validator`, `canonical`, `templates`, `pipeline`, `accounts`, `staging`, `dedup`, `types` y `parsers/`.
- `src/services/ingestion/`: `templateService`, `ingestionService`, `stagingService`, `traceService` y `approvalQueryService`.
- `src/components/templates/` y `src/components/ingestion/`.
- `src/data/`: `mockPlantillasReglas`, `mockCategoriasPlantilla`, `mockComprobantesDemo` y `mockIngestionSeed`.
- `src/views/`: `PlantillasGlobalesView` y `PlantillasEmpresaView`.

`IngestionView`, `BandejaView` y `PendientesAprobacionView` quedan como marcadores "En reconstrucción" (specs 002 y 003).

## Project Structure

### Documentation (this feature)

```text
specs/001-motor-plantillas-contables/
├── spec.md
├── plan.md                         # este archivo
├── research.md                     # decisiones R-01 … R-16
├── data-model.md                   # entidades, semillas y claves
├── quickstart.md                   # pruebas y escenarios E1–E8
├── contracts/
│   ├── expression-language.md      # lenguaje de expresiones
│   ├── domain-api.md               # funciones puras (también para 002/003)
│   └── services.md                 # servicios mock y permisos
├── checklists/requirements.md
└── tasks.md                        # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── shared/
│   │   └── currencies.js               # decimales ISO 4217 (sin reglas de país)
│   ├── accounting/                     # NÚCLEO AGNÓSTICO (puro)
│   │   ├── types.js                    # @typedef de data-model §2–§12
│   │   ├── expressions/
│   │   │   ├── functions.js            # lista blanca: firma, tipos, implementación
│   │   │   ├── evaluate.js             # intérprete recursivo
│   │   │   └── validate.js             # validación estática (tipos, rutas, profundidad)
│   │   ├── catalog.js                  # vigencias (RD-18)
│   │   ├── documentValidation.js       # esquema y coherencia (RD-15)
│   │   ├── perspective.js
│   │   ├── classification.js           # RD-16
│   │   ├── templateSelection.js        # RD-16
│   │   ├── accountMapping.js           # validación y precarga del mapa
│   │   ├── accountResolution.js        # RD-17
│   │   ├── templateValidation.js       # validación al guardar
│   │   ├── templateEvaluation.js       # algoritmo §20.8.3
│   │   ├── balance.js                  # RD-03
│   │   ├── testRunner.js               # RNF-11
│   │   ├── templateDiff.js
│   │   ├── templateLifecycle.js        # edición, versiones, activación (RD-10)
│   │   ├── interpretation.js           # orquestación pura
│   │   └── __tests__/                  # una suite por módulo + agnosticism.test.js
│   └── ingestion/                      # (conservado) money, fx, audit, periods, stateMachine, permissions
│
├── data/
│   ├── jurisdictions/
│   │   ├── index.js                    # registro { PE }
│   │   ├── pe/
│   │   │   ├── pack.js                 # cabecera, identificadores, impuestos, operaciones, roles, libros
│   │   │   ├── documentTypes.js        # 16 tipos con esquema
│   │   │   ├── templates.js            # 9 plantillas base + casos
│   │   │   └── sampleDocuments.js      # documentos canónicos de ejemplo
│   │   └── __fixtures__/xxPack.js      # paquete ficticio para la prueba de agnosticismo
│   ├── mockReglasClasificacion.js      # reglas semilla por empresa
│   ├── mockMapasCuentas.js             # asignaciones explícitas y exclusiones de la empresa 02
│   ├── mockPlanContable.js             # (ampliado) data-model §8
│   └── mockEmpresas.js                 # (ajustado) jurisdictionCode, sin plantillasActivasIds
│
├── services/
│   ├── accounting/
│   │   ├── context.js                  # resolver empresa → paquete, plan, mapa, reglas, candidatas
│   │   ├── catalogService.js
│   │   ├── accountMappingService.js
│   │   ├── classificationRuleService.js
│   │   ├── templateService.js
│   │   ├── simulationService.js
│   │   ├── seedAccounting.js           # siembra de configuración (lo invoca demoService)
│   │   ├── index.js                    # exporta servicios + accountingEngine
│   │   └── __tests__/
│   ├── ingestion/                      # (conservado) serviceKit, demoService
│   └── storage/                        # (conservado)
│
├── components/accounting/
│   ├── DocumentTypeList.jsx  · DocumentTypeSchema.jsx · TaxTable.jsx
│   ├── AccountMappingTable.jsx · AccountPicker.jsx
│   ├── ClassificationRuleList.jsx · ClassificationRuleEditor.jsx
│   ├── ExpressionBuilder.jsx           # constructor estructurado (R-05)
│   ├── TemplateList.jsx · TemplateEditor.jsx · TemplateLineEditor.jsx · AccountRefEditor.jsx
│   ├── TestCasesPanel.jsx · VersionHistory.jsx · ActivationPanel.jsx
│   ├── SimulationTrace.jsx · EntryLinesTable.jsx
│   └── ConfigAuditLog.jsx
│
└── views/
    ├── ConfiguracionContableView.jsx   # pestañas: Paquete/Documentos, Impuestos, Mapa de cuentas, Reglas, Bitácora
    ├── PlantillasContablesView.jsx     # lista, editor, pruebas, versiones, activación
    └── SimuladorContableView.jsx
```

**Structure Decision**: se mantiene la separación `domain → services → views` de la constitución. El núcleo nuevo va en `src/domain/accounting/` (no en `domain/templates/`) para dejar claro que es el motor contable agnóstico y no el modelo anterior. Los datos de país solo existen bajo `src/data/jurisdictions/<código>/`.

## Orden de construcción recomendado

1. **Base**: `currencies`, `types`, lenguaje de expresiones (con pruebas) y `catalog`.
2. **Documento**: `documentValidation`, `perspective`, más el paquete PE (tipos y esquemas) y los documentos de ejemplo.
3. **Cuentas**: plan ampliado, `accountMapping`, `accountResolution`.
4. **Plantillas**: `templateValidation`, `templateEvaluation`, `balance`, `testRunner` y las 9 plantillas base, con sus casos en verde. **Este es el hito del MVP.**
5. `classification`, `templateSelection`, `interpretation` y la prueba de agnosticismo.
6. `templateLifecycle` y `templateDiff`.
7. Servicios, permisos, auditoría y siembra.
8. Vistas: primero Configuración, luego Plantillas y Simulador.

## Complexity Tracking

No hay violaciones de la constitución. Decisiones relevantes:

| Decisión | Por qué | Alternativa más simple descartada |
|---|---|---|
| Lenguaje de expresiones propio en AST JSON | Las plantillas deben declarar importes y condiciones sin código ni `eval` (RF-03, HU-01) | Campos fijos por "rol de línea" (BASE/TAX/COUNTERPART): es lo que fallaba en el modelo anterior, porque no puede expresar planillas, retenciones ni notas de crédito |
| Paquete como dato estático inyectado | Agnosticismo verificable (RD-14) | Constantes de Perú en el dominio: incumple RD-14 |
| Roles de cuenta y mapa por empresa | Las plantillas del paquete deben servir a planes distintos (SDD §20.6) | Cuentas literales en todas las plantillas: obliga a duplicar plantillas por empresa |
| Prueba de agnosticismo con paquete ficticio | Hace comprobables SC-002 y SC-003 | Revisión manual solamente |
