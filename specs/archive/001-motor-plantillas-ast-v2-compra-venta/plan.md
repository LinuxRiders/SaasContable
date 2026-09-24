# Implementation Plan: Motor de Plantillas AST

**Branch**: `001-motor-plantillas-ast` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-motor-plantillas-ast/spec.md`

## Summary

Implementar el Motor de Plantillas AST (Subsistema S0 del SDD) como fundación del pipeline de ingestión contable. El motor permite al Administrador crear, versionar y activar plantillas de reglas contables mediante un editor visual. Las plantillas se compilan a árboles AST evaluables que traducen documentos canónicos a asientos contables. Integración directa con el catálogo de cuentas PCGE existente para validación en tiempo real.

**Enfoque técnico**: Dominio puro en `src/domain/templates/` (funciones sin React ni side effects), servicios async en `src/services/ingestion/templateService.js` con persistencia en localStorage, y vistas React en `src/views/` + `src/components/templates/`.

## Technical Context

**Language/Version**: JavaScript ES2020+ (ES Modules) con JSDoc para tipos

**Primary Dependencies**: React 18, lucide-react, Vitest

**Storage**: localStorage vía `src/services/storage/repository.js` con claves `contableos:v1:<tenantId>:templates`

**Testing**: Vitest (`npx vitest run`)

**Target Platform**: Navegador moderno (Chrome/Firefox/Edge)

**Project Type**: SPA front-end (prototipo sin backend)

**Performance Goals**: No aplica (prototipo). Interacción UI fluida.

**Constraints**: Sin dependencias nuevas. Sin TypeScript. Sin router. APIs nativas del navegador.

**Scale/Scope**: ~15 archivos de dominio/servicios, ~8 archivos de componentes/vistas, ~7 archivos de tests, ~2 archivos de datos semilla.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio                                       | Estado  | Verificación                                                                                                                                                                     |
| ----------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Prototipo Front-End con Backend Simulado** | ✅ PASA | Servicios async en `src/services/`, persistencia solo vía repository, errores con forma estable `{code, message, details}`                                                       |
| **II. Invariantes Reales, Infra Simulada**      | ✅ PASA | RD-10 (versionado inmutable) implementado en dominio. Montos en céntimos. Máquina de estados de plantilla (DRAFT→ACTIVE→RETIRED)                                                 |
| **III. Dominio Puro y Aislado (ACL)**           | ✅ PASA | Evaluador AST, conditions, lifecycle, diff, schema, templateAccounts — todos en `src/domain/templates/` como funciones puras sin React, sin localStorage. Reloj e IDs inyectados |
| **IV. Identidad, Tenant y Segregación**         | ✅ PASA | Servicios reciben `{tenantId, userId, role}`. Admin = permisos totales. Auditor = solo lectura. Activación de plantillas por tenant                                              |
| **V. Pruebas con Vitest**                       | ✅ PASA | Tests para evaluator, conditions, lifecycle, testRunner, diff, schema, templateAccounts                                                                                          |
| **VI. Simplicidad y Stack Acotado**             | ✅ PASA | Cero dependencias nuevas. JSDoc. APIs nativas                                                                                                                                    |
| **VII. Coherencia con Prototipo Existente**     | ✅ PASA | Vistas en `src/views/*View.jsx`, registradas en Sidebar y App. Usa theme.css, Modal, MetricCard                                                                                  |

## Project Structure

### Documentation (this feature)

```text
specs/001-motor-plantillas-ast/
├── spec.md              # Especificación funcional (6 US, 12 FR)
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas
├── data-model.md        # Modelo de datos (ASTTemplate, ASTNode, TestCase, EntryLine)
├── quickstart.md        # Guía de validación end-to-end (4 escenarios)
├── contracts/
│   └── services.md      # Contratos de API de servicios
├── checklists/
│   └── requirements.md  # Checklist de calidad del spec
└── tasks.md             # (Siguiente paso: /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── domain/templates/                  # Lógica pura (sin React, sin side effects)
│   ├── types.js                       # @typedef JSDoc: ASTNode, Template, TemplateVersion, TestCase
│   ├── conditions.js                  # Evaluador de condiciones booleanas (and/or/not/comparadores)
│   ├── evaluator.js                   # Motor AST: evaluate(template, doc) → EntryLine[]
│   ├── schema.js                      # Validación de estructura AST
│   ├── lifecycle.js                   # Máquina de estados: create, saveDraft, activate, edit, retire
│   ├── diff.js                        # Diff entre versiones en lenguaje natural
│   ├── testRunner.js                  # Runner de test cases con verificación de balance
│   ├── templateAccounts.js            # Validación de cuentas contra PCGE
│   └── __tests__/                     # Tests Vitest para cada módulo
│       ├── conditions.test.js
│       ├── evaluator.test.js
│       ├── lifecycle.test.js
│       ├── testRunner.test.js
│       ├── diff.test.js
│       ├── schema.test.js
│       └── templateAccounts.test.js
│
├── services/
│   ├── ingestion/
│   │   └── templateService.js         # API async: CRUD plantillas, test runner, activaciones
│   └── storage/
│       ├── repository.js              # Acceso a localStorage (existente)
│       └── accountingStore.js         # Carga de datos semilla (existente)
│
├── data/
│   ├── mockPlantillas.js              # Plantillas planas legacy (existente, se conserva)
│   ├── mockPlantillasReglas.js        # Plantillas AST semilla con test cases
│   └── mockCategoriasPlantilla.js     # Categorías y mapeo (existente)
│
├── components/templates/              # Componentes React del editor
│   ├── TemplateEditor.jsx             # Editor principal: reglas + tests + versiones
│   ├── ConditionBuilder.jsx           # Builder visual de condiciones
│   ├── ActionEditor.jsx               # Editor de acciones (cuenta, monto, lado)
│   ├── SplitEditor.jsx                # Editor de distribuciones (split por CC)
│   ├── RuleList.jsx                   # Lista de reglas con drag-and-drop de prioridad
│   ├── TestCasesPanel.jsx             # Panel de test cases con runner
│   ├── VersionHistory.jsx             # Historial de versiones con diff
│   └── AccountWarnings.jsx            # Alertas de validación contra PCGE
│
├── views/
│   ├── PlantillasGlobalesView.jsx     # Catálogo global (Admin)
│   └── PlantillasEmpresaView.jsx      # Activación por empresa (Admin/Auditor)
│
└── hooks/
    └── useIngestionContext.js          # Hook de contexto para servicios de ingestion
```

**Structure Decision**: Se mantiene la estructura existente del proyecto con la separación `domain/ → services/ → views/` establecida por la constitución (Principio III). Los archivos de dominio ya existen parcialmente de implementaciones anteriores — **se re-implementan desde cero** según este plan.

## Complexity Tracking

> No hay violaciones de la constitución. No se agregan dependencias nuevas.

| Aspecto                             | Decisión                                              | Justificación                                                   |
| ----------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| Montos en céntimos                  | Enteros, sin flotantes                                | Constitución II exige enteros o helper único de redondeo        |
| AST como JSON                       | Nodos tipados recursivos                              | Más natural para editor visual + evaluador recursivo            |
| Persistencia dual (global + tenant) | `global:templates` + `<tenantId>:templateActivations` | Separar catálogo maestro de activaciones por empresa            |
| Admin sin restricción               | FR-012                                                | Confirmado explícitamente por el usuario para facilitar testing |
