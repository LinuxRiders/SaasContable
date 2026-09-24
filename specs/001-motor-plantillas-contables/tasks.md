---
description: "Lista de tareas para implementar la Configuración Contable y el Motor de Plantillas por Tipo de Documento"
---

# Tasks: Configuración Contable y Motor de Plantillas por Tipo de Documento

**Input**: Documentos de diseño en `specs/001-motor-plantillas-contables/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: SÍ. La constitución (principio V) exige pruebas Vitest para todo el dominio; las tareas de prueba van antes de la implementación de cada módulo y deben fallar primero.

**Organización**: por historia de usuario (US1–US8 del spec).

## Reglas para quien implementa (leer antes de empezar)

1. **Lectura obligatoria**: SDD `specs/SDD-ACL-Translation-Engine.md` §20 y §21, y en esta carpeta: `data-model.md` y `contracts/*.md`. Si una tarea y un contrato difieren, manda el contrato.
2. **Agnosticismo (RD-14)**: en `src/domain/accounting/` **no** pueden aparecer `RUC`, `IGV`, `PCGE`, `SUNAT`, `PEN`, `COMPRA`, `VENTA` ni códigos de cuenta. Todo eso va en `src/data/jurisdictions/pe/`. La tarea T090 lo verifica automáticamente.
3. **No recuperar el código eliminado** (modelo compra/venta). No crear campos `operationType: 'COMPRA'|'VENTA'`, ni roles `BASE/TAX/COUNTERPART`, ni lados inferidos. Las plantillas declaran cada línea.
4. **Dominio puro**: `src/domain/**` no importa React, `localStorage`, `src/data/**`, `Date`/`Date.now()` ni `crypto`. Reloj, IDs, hash, paquete, plan, mapa, reglas y plantillas llegan como argumentos.
5. **Importes enteros** en unidades mínimas; tasas en `rateBp`; FX en `rateMilli`; un único redondeo con `roundHalfUpDiv` de `src/domain/ingestion/money.js`.
6. **Servicios**: `async`, primer argumento `ctx`, retorno `ok()`/`fail()` de `src/services/ingestion/serviceKit.js`, `authorize(ctx, OP, repository)` y un evento de auditoría por escritura. `localStorage` solo vía `src/services/storage/repository.js`.
7. **UI**: español, `theme.css`, `Modal`, `MetricCard` e íconos `lucide-react`; vistas registradas en `src/components/Sidebar.jsx` y `src/App.jsx`.
8. Tras cada fase: `npx vitest run` en verde y `npm run build` sin errores.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1…US8)

---

## Phase 1: Setup

**Purpose**: dejar la base lista sobre el estado posterior a la limpieza (plan §Estado de partida).

- [x] T001 Verificar el estado de partida: `npm run build` y `npx vitest run` pasan; `src/domain/templates/`, `src/components/templates/` y `src/components/ingestion/` no existen; `IngestionView.jsx`, `BandejaView.jsx` y `PendientesAprobacionView.jsx` muestran el marcador "En reconstrucción". Si algo falla, detenerse y reportarlo.
- [x] T002 Crear las carpetas `src/domain/shared/`, `src/domain/accounting/expressions/`, `src/domain/accounting/__tests__/`, `src/data/jurisdictions/pe/`, `src/data/jurisdictions/__fixtures__/`, `src/services/accounting/__tests__/` y `src/components/accounting/`
- [x] T003 [P] Crear `src/domain/shared/currencies.js` con `MINOR_UNITS = { PEN: 2, USD: 2, EUR: 2, COP: 2, MXN: 2, CLP: 0, JPY: 0 }` (ISO 4217) y `minorUnitsOf(currency)` (lanza un error con `code: 'UNKNOWN_CURRENCY'` si no existe)
- [x] T004 [P] En `src/domain/ingestion/permissions.js`, agregar a la matriz las operaciones de [contracts/services.md §7](contracts/services.md): `VIEW_ACCOUNTING_CONFIG` (ADMIN, MAKER, CHECKER, AUDITOR), `VIEW_CONFIG_AUDIT` (ADMIN, AUDITOR), y `EDIT_ACCOUNT_MAPPING`, `EDIT_CLASSIFICATION_RULES`, `EDIT_TEMPLATES`, `RUN_TEMPLATE_TESTS`, `ACTIVATE_TEMPLATES`, `SIMULATE` (solo ADMIN). Quitar de ADMIN las operaciones de Maker y Checker (`INGEST`, `UPDATE_STAGING`, `REVALIDATE`, `CANCEL`, `APPROVE`, `REJECT`) y las de plantillas del modelo anterior. Actualizar `src/domain/ingestion/__tests__/permissions.test.js`.
- [x] T005 [P] En `src/services/ingestion/serviceKit.js`, eliminar el _bypass_ de `assertRole` que concede todo al rol `ADMIN` (research R-12)
- [x] T006 [P] En `src/domain/ingestion/audit.js`, reemplazar las acciones `TEMPLATE_*` del modelo anterior por las de research R-15: `ACCOUNT_MAPPING_SAVED`, `CLASSIFICATION_RULE_SAVED`, `CLASSIFICATION_RULE_STATUS_CHANGED`, `TEMPLATE_CREATED`, `TEMPLATE_DUPLICATED`, `TEMPLATE_DRAFT_SAVED`, `TEMPLATE_VERSION_CREATED`, `TEMPLATE_TESTS_RUN`, `TEMPLATE_ACTIVATED`, `TEMPLATE_DEACTIVATED`, `TEMPLATE_RETIRED`, `TEMPLATE_USAGE_RECORDED`

---

## Phase 2: Foundational (bloquea todas las historias)

**Purpose**: tipos, lenguaje de expresiones, catálogo, paquete PE, plan ampliado y siembra base.

**⚠️ CRITICAL**: ninguna historia puede empezar sin esta fase.

### Tipos y lenguaje de expresiones

- [x] T007 Crear `src/domain/accounting/types.js` con los `@typedef` JSDoc de [data-model.md](data-model.md) §2–§7 y §12 (sin lógica): `JurisdictionPack`, `FiscalIdType`, `TaxDefinition`, `OperationType`, `AccountRole`, `LegalBook`, `DocumentTypeDefinition`, `FieldDefinition`, `CoherenceRule`, `CanonicalDocument`, `Party`, `DocumentLine`, `TaxAmount`, `Withholding`, `DocumentReference`, `ExtractionInfo`, `AccountMapping`, `ClassificationRule`, `ASTTemplate`, `TemplateVersion`, `TemplateLine`, `AccountRef`, `TemplateTestCase`, `TestRun`, `TemplateActivation`, `EvaluationResult`, `EntryLine`, `PendingReason`, y `Expression`; más la constante `PENDING_CODES` con los códigos de data-model §12
- [x] T008 [P] Escribir `src/domain/accounting/__tests__/expressions.evaluate.test.js`: un caso por función de [contracts/expression-language.md](contracts/expression-language.md) §3, con un documento canónico ficticio en el propio test; `mulRate(10000, 1800) = 1800`; `mulRate(3333, 1800) = 600` (redondeo único half-up); `null` en aritmética lanza `NULL_IN_ARITHMETIC`; `line` fuera de contexto lanza un error; mismo input produce el mismo output
- [x] T009 [P] Escribir `src/domain/accounting/__tests__/expressions.validate.test.js`: forma de nodo inválida, función fuera de la lista blanca, aridad incorrecta, tipo de resultado distinto del esperado (`MONEY` vs `BOOL`), profundidad mayor a 12, más de 200 nodos, ruta `fields.x` que no existe en el esquema, código de impuesto no admitido por el tipo, y `line` sin contexto. Cada error trae `path` y `reason`.
- [x] T010 Implementar `src/domain/accounting/expressions/functions.js`: registro `FUNCTIONS` con `{ name, params: [tipos], returns, needsLine?, allowsProp?: [...], impl(ctx, args) }` para cada función de [contracts/expression-language.md](contracts/expression-language.md) §3. `mulRate` usa `roundHalfUpDiv(amount * rateBp, 10000)`.
- [x] T011 Implementar `src/domain/accounting/expressions/evaluate.js` con `evaluateExpression(node, { document, line = null, pack = null })`: primitivos, `const`, `field`, `line`, y `fn` con `prop` opcional. `sumLines` y `countLines` evalúan sus argumentos con cada línea como contexto (los argumentos de estas dos funciones se evalúan de forma perezosa). Hacer pasar T008.
- [x] T012 Implementar `src/domain/accounting/expressions/validate.js` con `validateExpression(node, { expectedType, documentType, lineContext })` → `{ ok, errors: [{ path, reason }] }` e `inferType(node, ...)`; resolver los tipos de `fields.*` y `line.fields.*` desde `documentType.headerFields` y `lineFields` (MONEY→MONEY, QUANTITY→INT, PERCENT→RATE_BP, CODE/STRING→STRING, DATE→DATE, BOOLEAN→BOOL). Hacer pasar T009.

### Catálogo y paquete Perú

- [x] T013 [P] Escribir `src/domain/accounting/__tests__/catalog.test.js` con un paquete mínimo definido en el test: `getDocumentType` y `getTaxRate` antes, dentro y después de una vigencia, y con `effectiveTo: null`; `getOperationTypes(pack, docType, perspective)`; `getAccountRole`
- [x] T014 Implementar `src/domain/accounting/catalog.js` según [contracts/domain-api.md §1](contracts/domain-api.md) (comparación de fechas `YYYY-MM-DD` como strings). Hacer pasar T013.
- [x] T015 [P] Crear `src/data/jurisdictions/pe/pack.js` con `pePackHeader` (`code: 'PE'`, `version: 1`, `name: 'Perú'`, `effectiveFrom: '2020-01-01'`, `defaultFunctionalCurrency: 'PEN'`, `referenceChartOfAccounts: 'PCGE'`, `roundingToleranceMinor: 1`, `extractionConfidenceThreshold: 0.85`) y los catálogos:
  - `fiscalIdTypes`: RUC, DNI, CE.
  - `taxes` de la SDD §21.3 con `rateBp` (`VAT` 1800 desde `2011-03-01` con `recoverableAccountRole: 'VAT_CREDIT'` y `payableAccountRole: 'VAT_PAYABLE'`; `INCOME_TAX_FEES` 800; `VAT_WITHHOLDING` 300; `VAT_PERCEPTION` 200; `EXCISE`, `BAG_TAX` y `SPOT` con tasa de ejemplo).
  - `operationTypes`: los 25 códigos de la SDD §21.3 con `allowedPerspectives`.
  - `mixedOperationTypes: { RECEIVED: 'PURCHASE_MIXED', ISSUED: null, INTERNAL: null }`.
  - `accountRoles`: los de la SDD §21.4 y [data-model.md §9](data-model.md), con `suggestedAccountCode`; `COST_DESTINATION` con calificador `costCenter` y sugerencias `CC-ADMIN: '94'`, `CC-VENTAS: '95'`, `CC-LOGISTICA: '95'`; `BANK_ACCOUNT` con calificador `bankAccount`; `INCOME_TAX_WITHHELD_PAYABLE_4TH` → `40172` e `INCOME_TAX_WITHHELD_PAYABLE_5TH` → `40173`.
  - `legalBooks`: los 5 de la SDD §21.6.
- [x] T016 [P] Crear `src/data/jurisdictions/pe/documentTypes.js` con los 16 tipos de la SDD §21.2. Los esquemas de `INVOICE`, `CREDIT_NOTE`, `PROFESSIONAL_FEE_RECEIPT`, `PAYROLL_SUMMARY`, `BANK_STATEMENT` e `INTERNAL_DOCUMENT` son los de [data-model.md §3](data-model.md), con sus `coherenceRules` escritas como expresiones. El resto lleva esquemas mínimos coherentes. `DISPATCH_GUIDE` lleva `generatesEntry: false`. Llenar `operationTypesByPerspective` (p. ej. `PAYROLL_SUMMARY: { INTERNAL: ['PAYROLL'] }`; `INVOICE: { RECEIVED: [compras, activo, servicios, mixto…], ISSUED: ['MERCHANDISE_SALE', 'SERVICE_SALE'] }`; `CREDIT_NOTE: { RECEIVED: ['PURCHASE_RETURN', 'PURCHASE_PRICE_ADJUSTMENT'], ISSUED: ['SALES_RETURN'] }`).
- [x] T017 Crear `src/data/jurisdictions/index.js` con `JURISDICTION_PACKS = { PE: pePack }` (donde `pePack` combina la cabecera, los catálogos, `documentTypes` y `baseTemplates: []` por ahora) y `getPackByCode(code)` (devuelve `null` si no existe)
- [x] T018 [P] Escribir `src/data/jurisdictions/__tests__/pePack.test.js`: cada `documentType` válido (códigos únicos, perspectivas ⊆ admitidas, operaciones existentes en `operationTypes`, `coherenceRules` válidas con `validateExpression` como `BOOL`); cada rol referenciado por un impuesto existe; tasa de `VAT` a `2026-09-15` = 1800

### Datos base y siembra

- [x] T019 [P] Ampliar `src/data/mockPlanContable.js`: agregar `activo: true` a todas las cuentas; agregar las cuentas de agrupación `41`, `46` y `62`, y las 13 cuentas de detalle de [data-model.md §8](data-model.md) (con `elemento`, `moneda: 'MN'`, `tipoAnalisis` y `requiereCC` según la tabla)
- [x] T020 [P] Ajustar `src/data/mockEmpresas.js`: agregar `jurisdictionCode: 'PE'` a cada empresa y eliminar `plantillasActivasIds`; en `src/views/EmpresasView.jsx`, al crear una empresa, asignar `jurisdictionCode: 'PE'` en lugar de `plantillasActivasIds` (sin otros cambios en esa vista)
- [x] T021 Crear `src/services/accounting/context.js` con `resolveTenantContext(repo, ctx)` → `{ empresa, pack, chart, functionalCurrency, tenantFiscalId }`, que usa `getGlobal('empresas')`, `getPackByCode(empresa.jurisdictionCode)` y `getCollection(tenantId, 'chartOfAccounts')`. Devuelve `fail('NO_JURISDICTION_PACK', …)` si la empresa no tiene paquete. `tenantFiscalId` sale de `empresa.ruc` en este archivo de servicio (el dominio nunca lee ese campo).
- [x] T022 Crear `src/services/accounting/seedAccounting.js` con `seedAccountingConfig(repo, { clock, idGenerator })` vacío por ahora (se completa en US2, US4 y US5). Modificar `src/services/ingestion/demoService.js` para que: `meta.schemaVersion` sea `2`; si el valor guardado no es `2`, ejecute `clearNamespace({ keepSession: true })` y vuelva a sembrar; y llame a `seedAccountingConfig` después de sembrar empresas y planes. Agregar `demoMode: true` a `demoSettings`.
- [x] T023 Crear `src/services/accounting/index.js` que re-exporte los servicios (se irán agregando) y ejecute `repository.init()` si no se hizo

**Checkpoint**: `npx vitest run` y `npm run build` en verde. El núcleo de expresiones y catálogo existe y está probado.

---

## Phase 3: User Story 1 — Consultar el Paquete de Jurisdicción y los tipos de documento (Priority: P1) 🎯 MVP

**Goal**: el Admin (y el Auditor, en solo lectura) ve el paquete de la empresa, sus tipos de documento con esquema, impuestos con tasa vigente, operaciones, roles y libros.

**Independent Test**: quickstart E1.

- [x] T024 [P] [US1] Escribir `src/services/accounting/__tests__/catalogService.test.js` (usar `memoryStorage` + `repository.init`, sembrar con `ensureSeeded`): lista de 16 tipos; esquema de `CREDIT_NOTE` con referencia obligatoria; `listTaxes` a dos fechas; rol sin permiso → `FORBIDDEN`; empresa sin `jurisdictionCode` → `NO_JURISDICTION_PACK`
- [x] T025 [US1] Implementar `src/services/accounting/catalogService.js` según [contracts/services.md §1](contracts/services.md) y exportarlo en `index.js`. Hacer pasar T024.
- [x] T026 [P] [US1] Crear `src/components/accounting/DocumentTypeList.jsx`: tabla de tipos (nombre, familia, códigos oficiales, perspectivas, genera asiento, libro) con filtro por familia
- [x] T027 [P] [US1] Crear `src/components/accounting/DocumentTypeSchema.jsx`: detalle de un tipo con campos de cabecera y de línea (clave, etiqueta, tipo, obligatorio), partes exigidas, impuestos y retenciones admitidos, referencia, reglas de coherencia (descripción) y aviso "solo de referencia" si `generatesEntry` es falso
- [x] T028 [P] [US1] Crear `src/components/accounting/TaxTable.jsx`: impuestos y retenciones con tipo, tasa vigente a la fecha elegida (selector de fecha) y roles; "Sin tasa vigente" cuando corresponda
- [x] T029 [US1] Crear `src/views/ConfiguracionContableView.jsx` con pestañas **Documentos** (lista + detalle en `Modal`), **Impuestos**, **Operaciones y libros**, y las pestañas vacías **Mapa de cuentas**, **Reglas** y **Bitácora** (se llenan en US2, US5 y US8). Encabezado con `MetricCard` (paquete, versión, tipos, impuestos). Usa `useIngestionContext` para `ctx`.
- [x] T030 [US1] Registrar `ConfiguracionContableView` en `src/components/Sidebar.jsx` (sección de configuración, ícono `BookOpen`) y en `src/App.jsx`, visible para todos los roles

**Checkpoint**: E1 del quickstart reproducible.

---

## Phase 4: User Story 2 — Mapear los roles de cuenta al plan de la empresa (Priority: P1)

**Goal**: mapa de cuentas por empresa, precargado, validado y versionado (RD-17).

**Independent Test**: quickstart E2.

- [x] T031 [P] [US2] Escribir `src/domain/accounting/__tests__/accountMapping.test.js`: `validateMappingEntry` con cuenta inexistente, de agrupación, inactiva, rol desconocido, calificador no permitido y calificador duplicado; `preloadMapping` resuelve por prefijo (sugerida `4212` → `4212101`; `701` → `7012101`), aplica sugerencias de calificador, no pisa entradas existentes y reporta roles sin equivalente (p. ej. `3361`)
- [x] T032 [P] [US2] Escribir `src/domain/accounting/__tests__/accountResolution.test.js`: `resolveAccount` para `LITERAL` (existe/no existe/no imputable), `ROLE` sin y con calificador (valor mapeado y no mapeado), `BY_OPERATION_TYPE` (entrada presente, uso de `fallback`, sin entrada ni `fallback` → `ACCOUNT_UNRESOLVED`); `rolesUsedBy` y `checkTemplateAccounts` sobre una versión de plantilla de ejemplo
- [x] T033 [US2] Implementar `src/domain/accounting/accountMapping.js` (`validateMappingEntry`, `validateMapping`, `preloadMapping`, `diffMappingRoles`) según [contracts/domain-api.md §5](contracts/domain-api.md) y research R-07. Hacer pasar T031.
- [x] T034 [US2] Implementar `src/domain/accounting/accountResolution.js` (`resolveAccount`, `rolesUsedBy`, `checkTemplateAccounts`). Para `qualifierFrom`, recibe el valor ya evaluado en `qualifier`. Hacer pasar T032.
- [x] T035 [P] [US2] Crear `src/data/mockMapasCuentas.js` con `explicitMappings` por empresa (`01`: `FIXED_ASSET_IT_EQUIPMENT → 3351101`, `BANK_ACCOUNT BCP-MN → 104101`, `BANK_ACCOUNT IBK-MN → 104102`) y `excludedRoles` (`02`: `FIXED_ASSET_IT_EQUIPMENT`, `PROFESSIONAL_FEES_PAYABLE`), según [data-model.md §9](data-model.md)
- [x] T036 [US2] Completar `seedAccountingConfig` en `src/services/accounting/seedAccounting.js`: por empresa, precargar el mapa con `preloadMapping`, aplicar `explicitMappings`, quitar `excludedRoles` y guardar la versión 1 en `<tenantId>:accountMappings` con `updatedBy: 'system'`
- [x] T037 [P] [US2] Escribir `src/services/accounting/__tests__/accountMappingService.test.js`: la empresa `02` tiene 2 roles sin mapear; guardar con cuenta `42` → `VALIDATION_ERROR`; guardar válido → versión 2 con `changedRoles` y evento `ACCOUNT_MAPPING_SAVED`; `expectedVersion` desactualizada → `CONFLICT`; `MAKER` que guarda → `FORBIDDEN`; la empresa `01` no ve el mapa de la `02`
- [x] T038 [US2] Implementar `src/services/accounting/accountMappingService.js` según [contracts/services.md §2](contracts/services.md). `getMappingImpact` cruza los roles sin mapear con `rolesUsedBy` de las plantillas del paquete y del tenant (usa `listTemplates` cuando exista; mientras tanto, solo `pack.baseTemplates`). Exportar en `index.js`. Hacer pasar T037.
- [x] T039 [P] [US2] Crear `src/components/accounting/AccountPicker.jsx`: buscador de cuentas del plan de la empresa que muestra código y descripción y deshabilita las cuentas de agrupación e inactivas
- [x] T040 [US2] Crear `src/components/accounting/AccountMappingTable.jsx`: una fila por rol (y por calificador), con cuenta asignada, descripción, estado (✔ / sin mapear / inválida), plantillas bloqueadas y botones "Precargar sugerencias" y "Guardar". Muestra los errores por fila que devuelve el servicio.
- [x] T041 [US2] Llenar la pestaña **Mapa de cuentas** de `src/views/ConfiguracionContableView.jsx` con `AccountMappingTable` (edición solo si el rol es `ADMIN`)

**Checkpoint**: E2 del quickstart reproducible.

---

## Phase 5: User Story 3 — Crear una plantilla contable para un tipo de documento (Priority: P1)

**Goal**: el Admin crea, duplica y guarda plantillas que declaran todas sus líneas, validadas contra el esquema del tipo.

**Independent Test**: pasos 1–3 de quickstart E3.

- [ ] T042 [P] [US3] Escribir `src/domain/accounting/__tests__/templateValidation.test.js`: plantilla válida de honorarios; sin línea `CREDIT`; dos `balancingLine`; `LITERAL` en alcance `PACK`; libro inexistente; tipo con `generatesEntry: false`; operación no admitida para la perspectiva; campo `fields.foo` inexistente (con `path` exacto, p. ej. `lines[1].amount`); `line` usado sin `forEachDocumentLine`; `BY_OPERATION_TYPE` sin `fallback` → advertencia (no error)
- [ ] T043 [US3] Implementar `src/domain/accounting/templateValidation.js` con `validateTemplateVersion(version, { pack, scope })` → `{ ok, errors, warnings }` según [contracts/domain-api.md §6](contracts/domain-api.md), usando `validateExpression` con el tipo esperado de cada lugar (contrato de expresiones §4). Hacer pasar T042.
- [ ] T044 [P] [US3] Escribir `src/domain/accounting/__tests__/templateLifecycle.create.test.js`: `newTemplate({ definition, tenantId, createdBy, createdAt, id })` crea una plantilla `TENANT` v1 `DRAFT`; `duplicateTemplate(source, version, …)` crea `TENANT` con `duplicatedFrom` y las líneas y casos copiados; `saveDraft` solo sobre una versión `DRAFT`
- [ ] T045 [US3] Implementar en `src/domain/accounting/templateLifecycle.js` las funciones `newTemplate`, `duplicateTemplate`, `saveDraft` y `canEdit` (la regla de versiones con uso se completa en US7). Hacer pasar T044.
- [ ] T046 [US3] Crear `src/data/jurisdictions/pe/templates.js` con las 9 plantillas base de la SDD §21.4 (`scope: 'PACK'`, `version: 1`, `status: 'PUBLISHED'`), por ahora sin `testCases`: líneas declaradas con roles, importes con el lenguaje de expresiones (p. ej. `{ fn: 'taxAmount', args: ['VAT'] }`), `balancingLine` en la línea de proveedores, clientes o banco, líneas de destino con `COST_DESTINATION` calificado por `fields.costCenter` o `line.fields.costCenter`, `requiredInputs` (planilla: `fields.costCenter`) y `legalBookCode` según §21.2. Incluirlas en `pePack.baseTemplates` en `src/data/jurisdictions/index.js`.
- [ ] T047 [P] [US3] Agregar a `src/data/jurisdictions/__tests__/pePack.test.js` que cada plantilla base pasa `validateTemplateVersion` sin errores
- [ ] T048 [P] [US3] Escribir `src/services/accounting/__tests__/templateService.create.test.js`: `listTemplates` devuelve las 9 `PACK` + las `TENANT` del tenant; `createTemplate` y `duplicateTemplate` persisten en `<tenantId>:templates` y auditan; `saveTemplateDraft` inválido → `EXPRESSION_INVALID` con `errors[]`; editar una `PACK` → `NOT_EDITABLE`; `CHECKER` → `FORBIDDEN`; otro tenant no ve la plantilla
- [ ] T049 [US3] Implementar en `src/services/accounting/templateService.js`: `listTemplates`, `getTemplate`, `createTemplate`, `duplicateTemplate` y `saveTemplateDraft` según [contracts/services.md §4](contracts/services.md). Exportar en `index.js`. Hacer pasar T048.
- [ ] T050 [P] [US3] Crear `src/components/accounting/ExpressionBuilder.jsx`: constructor estructurado (research R-05). Recibe `value`, `onChange`, `expectedType`, `documentType` y `lineContext`; ofrece solo funciones cuyo tipo de retorno coincide con el esperado y solo campos del esquema del tipo esperado; permite anidar argumentos; muestra el JSON en modo solo lectura; marca en rojo los errores de `validateExpression`
- [ ] T051 [P] [US3] Crear `src/components/accounting/AccountRefEditor.jsx`: selector de `kind` (`ROLE`, `BY_OPERATION_TYPE` y, solo en `TENANT`, `LITERAL`); roles del paquete; `qualifierFrom` con `ExpressionBuilder` (`STRING`); tabla operación → rol o cuenta y `fallback`; `AccountPicker` para `LITERAL`
- [ ] T052 [US3] Crear `src/components/accounting/TemplateLineEditor.jsx`: lado (`DEBIT`/`CREDIT`), `AccountRefEditor`, importe (`ExpressionBuilder`, `MONEY`), `emitWhen` (`BOOL`), casilla `forEachDocumentLine` (activa el contexto `line`), dimensiones (clave + `ExpressionBuilder` `STRING`), descripción, `balancingLine`, y botones mover arriba/abajo y eliminar
- [ ] T053 [US3] Crear `src/components/accounting/TemplateEditor.jsx`: cabecera (código, nombre, tipo de documento → perspectivas admitidas → operaciones admitidas, prioridad, aplicabilidad, libro, glosa, `requiredInputs`), lista de `TemplateLineEditor`, errores y advertencias de validación por ruta, y botón "Guardar borrador". Solo lectura para plantillas `PACK`, con botón "Duplicar como plantilla de la empresa".
- [ ] T054 [P] [US3] Crear `src/components/accounting/TemplateList.jsx`: tabla con código, nombre, terna, alcance (`PACK`/`TENANT`), versión, estado en la empresa y uso; filtros por tipo de documento y alcance
- [ ] T055 [US3] Crear `src/views/PlantillasContablesView.jsx` (lista + editor en `Modal` a pantalla ancha; botón "Nueva plantilla" solo para `ADMIN`) y registrarla en `src/components/Sidebar.jsx` y `src/App.jsx` (ícono `FileCog`)

**Checkpoint**: E3 pasos 1–3 reproducibles.

---

## Phase 6: User Story 4 — Probar y activar una plantilla para una empresa (Priority: P1)

**Goal**: evaluación real de plantillas, casos de prueba obligatorios, y activación bloqueada por pruebas, cuentas o ambigüedad.

**Independent Test**: quickstart E3 pasos 3–5 y E4.

- [ ] T056 [P] [US4] Crear `src/data/jurisdictions/pe/sampleDocuments.js` con los documentos canónicos de los 9 casos positivos (importes de la SDD §21.4; empresa `01`, RUC ficticio `20450656934` como receptor o emisor según la perspectiva; terceros ficticios de `scripts/fixtures/document-fixtures.source.mjs` (`20100000009`, `20100000025`, `20100000033`, `10400000005`, `20600000005`) e incluir el documento interno de depreciación de la SDD §21.4; `extraction.sourceFormat` variado; `operationTypeCode` ya asignado en documento y líneas). Agregar el documento del caso negativo de planilla sin `fields.costCenter`. Exportar `SAMPLE_DOCUMENTS` con `{ id, title, expected, document }`.
- [ ] T057 [P] [US4] Escribir `src/domain/accounting/__tests__/balance.test.js` (`checkBalance` cuadrado, descuadrado y vacío) e implementar `src/domain/accounting/balance.js`
- [ ] T058 [P] [US4] Escribir `src/domain/accounting/__tests__/templateEvaluation.test.js`: algoritmo de la SDD §20.8.3 paso a paso, con plantillas y documentos definidos en el test y un mapa en línea: `requiredInputs` faltante → `MISSING_INPUT`; `forEachDocumentLine` con `BY_OPERATION_TYPE`; importe cero omitido; importe negativo → `INVALID_AMOUNT`; rol sin mapear → `ACCOUNT_UNRESOLVED`; cuenta con `requiereCC` sin `costCenter` → `MISSING_DIMENSION`; `groupBy`; FX con `fxRateMilli = 3745` sobre USD donde `balancingLine` absorbe 1 unidad mínima; diferencia mayor que la tolerancia → `UNBALANCED`; glosa y `legalBookCode` en el resultado; trazabilidad `templateLineId` y `sourceLineNos`
- [ ] T059 [US4] Implementar `src/domain/accounting/templateEvaluation.js` con `evaluateTemplate(version, document, { pack, mapping, chart, fxRateMilli = null, functionalCurrency })` → `EvaluationResult` (data-model §12). Usa `evaluateExpression`, `resolveAccount`, `convert` de `src/domain/ingestion/fx.js` y `checkBalance`. Hacer pasar T058.
- [ ] T060 [P] [US4] Escribir `src/domain/accounting/__tests__/testRunner.test.js`: caso positivo que pasa, caso con cuenta distinta que falla con una diferencia legible ("Línea 2: se esperaba 4011101, se obtuvo 4212101"), caso negativo con `expectedPending`, `mappingSource: 'INLINE'` vs `'TENANT'`, y asiento que no cuadra → `FAIL`
- [ ] T061 [US4] Implementar `src/domain/accounting/testRunner.js` con `runTests(version, { pack, tenantMapping, chart, functionalCurrency })` según [contracts/domain-api.md §6](contracts/domain-api.md). La comparación es por lista ordenada de `{ side, accountCode, functionalAmountMinor, dimensions }`. Hacer pasar T060.
- [ ] T062 [US4] Agregar a cada plantilla base de `src/data/jurisdictions/pe/templates.js` su caso positivo (`mappingSource: 'TENANT'`, `input` desde `SAMPLE_DOCUMENTS` y `expectedLines` con las cuentas de la empresa `01` de [data-model.md §9](data-model.md)) y los dos casos negativos de [data-model.md §10](data-model.md)
- [ ] T063 [US4] Escribir `src/data/jurisdictions/__tests__/peTemplates.test.js`: con el plan ampliado y el mapa semilla de la empresa `01`, las 9 plantillas base pasan todos sus casos (SC-001), y cada asiento positivo cuadra con los totales de la SDD §21.4 (p. ej. planilla: Debe = Haber = 2 180 000)
- [ ] T064 [P] [US4] Escribir `src/domain/accounting/__tests__/templateLifecycle.activation.test.js`: `contentForHash` estable ante el orden de claves; `checkActivation` sin casos, con un caso en `FAIL`, con hash distinto del probado, con cuentas sin resolver, con otra activa de la misma terna, alcance y prioridad, y con plantilla retirada → errores; caso feliz → `ok`
- [ ] T065 [US4] Implementar `contentForHash` y `checkActivation` en `src/domain/accounting/templateLifecycle.js`. Hacer pasar T064.
- [ ] T066 [P] [US4] Escribir `src/services/accounting/__tests__/templateService.activation.test.js`: `runTemplateTests` persiste `TestRun` con `contentHash` (en la versión para `TENANT`; en `<tenantId>:packTestRuns` para `PACK`) y audita; `activateTemplate` feliz → `TemplateActivation` `ACTIVE` y la versión pasa a `PUBLISHED`; activar la base de activo fijo en la empresa `02` → `ACTIVATION_BLOCKED` con el rol sin mapear; activación de la empresa `01` invisible en la `02`; `deactivateTemplate` → `INACTIVE`
- [ ] T067 [US4] Implementar en `src/services/accounting/templateService.js`: `runTemplateTests`, `activateTemplate` (re-ejecuta las pruebas sin persistir como verificación final, calcula el hash con `serviceKit.sha256` sobre `contentForHash`, pasa la activación previa de la misma plantilla a `SUPERSEDED` y audita `TEMPLATE_ACTIVATED`) y `deactivateTemplate`. Hacer pasar T066.
- [ ] T068 [US4] Completar `seedAccountingConfig`: en la empresa `01`, ejecutar las pruebas de las 9 plantillas base con su mapa y activarlas (sin eventos de usuario: `activatedBy: 'system'`). En la empresa `02`, no activar ninguna.
- [ ] T069 [P] [US4] Crear `src/components/accounting/EntryLinesTable.jsx`: tabla de líneas de asiento (lado, cuenta, descripción de la cuenta, rol de origen, importe original, tasa, importe funcional, dimensiones) con totales de Debe y Haber y un indicador de cuadre
- [ ] T070 [US4] Crear `src/components/accounting/TestCasesPanel.jsx`: lista de casos; alta y edición de caso (elegir documento de ejemplo o pegar un canónico JSON, origen del mapa, `fxRateMilli`, líneas esperadas o motivos esperados; botón "Tomar resultado actual como esperado"); botón "Ejecutar pruebas"; resultado por caso ✅/❌ con las diferencias y `EntryLinesTable` esperado vs obtenido
- [ ] T071 [US4] Crear `src/components/accounting/ActivationPanel.jsx`: estado en la empresa actual, botón "Activar esta versión" o "Desactivar", y lista de motivos cuando el servicio devuelve `ACTIVATION_BLOCKED`
- [ ] T072 [US4] Integrar `TestCasesPanel` y `ActivationPanel` como pestañas del editor en `src/components/accounting/TemplateEditor.jsx`

**Checkpoint (MVP)**: US1–US4 completas. Las 9 plantillas base activas en la empresa `01` con pruebas en verde; E1–E4 reproducibles.

---

## Phase 7: User Story 5 — Definir reglas de clasificación de la operación (Priority: P2)

**Goal**: reglas por documento y línea que deciden el tipo de operación, con prueba de clasificación.

**Independent Test**: quickstart E5.

- [ ] T073 [P] [US5] Escribir `src/domain/accounting/__tests__/classification.test.js`: valor explícito del origen prevalece; prioridad mayor gana y empate por `id`; regla `PROPOSED` o `RETIRED` ignorada; opción única (`PAYROLL_SUMMARY` → `PAYROLL`); líneas mixtas → `PURCHASE_MIXED` tomado de `pack.mixedOperationTypes` aunque una regla de documento haya propuesto otro tipo; líneas que heredan la operación del documento; regla con tipo no admitido para el documento ignorada; ninguna decisión → `CLASSIFICATION_REQUIRED`; traza con todas las reglas evaluadas; `applyClassification` no muta el original
- [ ] T074 [US5] Implementar `src/domain/accounting/classification.js` (`classify`, `applyClassification`) según research R-08 y [contracts/domain-api.md §3](contracts/domain-api.md). Hacer pasar T073.
- [ ] T075 [P] [US5] Crear `src/data/mockReglasClasificacion.js` con las 8 reglas de [data-model.md §11](data-model.md) para la empresa `01` (condiciones como expresiones JSON). Agregar a `SAMPLE_DOCUMENTS` los documentos sin `operationTypeCode`: factura de mercadería + flete (dos líneas), factura de "equipos de cómputo" y extracto con una comisión. Usar los mismos datos ficticios que `scripts/fixtures/document-fixtures.source.mjs` (proveedores `20100000009`, `20100000025`, `20100000033`).
- [ ] T076 [US5] Completar `seedAccountingConfig` para sembrar las reglas en `<tenantId>:classificationRules`
- [ ] T077 [P] [US5] Escribir `src/services/accounting/__tests__/classificationRuleService.test.js`: guardar una regla válida → versión nueva y auditoría; condición inválida → `EXPRESSION_INVALID`; activar la regla `PROPOSED` y ver que `testClassification` de la factura de cómputo cambia a `FIXED_ASSET_ACQUISITION`; `AUDITOR` → `FORBIDDEN` al guardar
- [ ] T078 [US5] Implementar `src/services/accounting/classificationRuleService.js` según [contracts/services.md §3](contracts/services.md) (la validación de la condición usa `validateExpression` con `BOOL`; en reglas `DOCUMENT` sin esquema concreto, validar contra la unión de campos de los tipos del paquete). Exportar en `index.js`. Hacer pasar T077.
- [ ] T079 [P] [US5] Crear `src/components/accounting/ClassificationRuleList.jsx` (nombre, alcance, prioridad, operación, estado; acciones activar y retirar) y `src/components/accounting/ClassificationRuleEditor.jsx` (alcance, prioridad, `ExpressionBuilder` `BOOL` con contexto de línea si es `LINE`, operación)
- [ ] T080 [US5] Llenar la pestaña **Reglas** de `src/views/ConfiguracionContableView.jsx` con la lista, el editor en `Modal` y un panel "Probar clasificación" (elegir documento de ejemplo → resultado por documento y línea con la regla que decidió)

**Checkpoint**: E5 reproducible.

---

## Phase 8: User Story 6 — Simular la contabilización de un documento (Priority: P2)

**Goal**: interpretación de extremo a extremo (esquema → perspectiva → clasificación → selección → evaluación) con traza, sin persistir; y la API que usarán los specs 002 y 003.

**Independent Test**: quickstart E6.

- [ ] T081 [P] [US6] Escribir `src/domain/accounting/__tests__/documentValidation.test.js` sobre los esquemas del paquete PE: documentos de ejemplo válidos; campo obligatorio faltante; tipo de dato erróneo; parte exigida ausente; impuesto no admitido; nota de crédito sin referencia; incoherencia `net + tax ≠ total`; `taxAmount` que no coincide con `mulRate(base, tasa vigente)`; tipo no vigente → `CATALOG_NOT_EFFECTIVE`; guía de remisión → `DOCUMENT_TYPE_NOT_ACCOUNTABLE`
- [ ] T082 [US6] Implementar `src/domain/accounting/documentValidation.js` (`validateDocument`) según [contracts/domain-api.md §2](contracts/domain-api.md). Hacer pasar T081.
- [ ] T083 [P] [US6] Escribir `src/domain/accounting/__tests__/perspective.test.js` e implementar `src/domain/accounting/perspective.js` (`resolvePerspective`): receptor = tenant → `RECEIVED`; emisor = tenant → `ISSUED`; `fixedPerspective` → ese valor si el tenant es el emisor; tenant ausente → `DOCUMENT_NOT_FOR_TENANT`
- [ ] T084 [P] [US6] Escribir `src/domain/accounting/__tests__/templateSelection.test.js` e implementar `src/domain/accounting/templateSelection.js` (`selectTemplate`) según research R-09: `TENANT` sobre `PACK`, prioridad, `applicability` falsa descartada, `NO_TEMPLATE`, `AMBIGUOUS_TEMPLATE` y traza de candidatas
- [ ] T085 [US6] Escribir `src/domain/accounting/__tests__/interpretation.test.js` e implementar `src/domain/accounting/interpretation.js` (`interpretDocument`) según [contracts/domain-api.md §7](contracts/domain-api.md): la factura de mercadería + flete sin clasificar llega a `PE.RECEIVED.INVOICE.PURCHASE_MIXED` con 8 líneas cuadradas (Debe = Haber = 130 800); cada motivo detiene el proceso en su etapa (`stoppedAt`) con la traza acumulada; la misma entrada da el mismo resultado dos veces (SC-007)
- [ ] T086 [P] [US6] Agregar a `SAMPLE_DOCUMENTS` los casos negativos de [data-model.md §10](data-model.md): nota de crédito sin referencia, factura en USD (para FX, con `fxRateMilli` sugerido 3745) y guía de remisión
- [ ] T087 [US6] Implementar `src/services/accounting/simulationService.js` (`listSampleDocuments`, `simulateDocument`) y, en `src/services/accounting/index.js`, el objeto `accountingEngine` (`getInterpretationContext`, `interpret`, `getTemplateVersion`, `recordTemplateUsage`) según [contracts/services.md §5–§6](contracts/services.md). `candidatesFor` devuelve las versiones con activación `ACTIVE` en el tenant (tanto `PACK` como `TENANT`).
- [ ] T088 [P] [US6] Escribir `src/services/accounting/__tests__/simulationService.test.js`: la simulación de cada documento de ejemplo coincide con su `expected`; tras simular, `templateUsage` no cambia (FR-024); `MAKER` → `FORBIDDEN`
- [ ] T089 [P] [US6] Crear `src/components/accounting/SimulationTrace.jsx`: pasos numerados (Esquema, Perspectiva, Clasificación, Selección, Evaluación) con ✔ / ⏸ y su detalle (errores de esquema, regla que clasificó cada línea, candidatas con su condición, plantilla y versión elegidas, origen de cada cuenta) y `EntryLinesTable` al final
- [ ] T090 [US6] Crear `src/data/jurisdictions/__fixtures__/xxPack.js` (paquete ficticio `XX` con un tipo `SERVICE_BILL`, un impuesto `SALES_TAX` de 1000 bp, dos roles, un libro y una plantilla) y `src/domain/accounting/__tests__/agnosticism.test.js`. El test (a) interpreta un documento `XX` de punta a punta con el mismo motor, y (b) recorre con `fs` los archivos de `src/domain/accounting/` (excluyendo `__tests__`) y falla si encuentra `RUC`, `IGV`, `PCGE`, `SUNAT`, `'PEN'`, `COMPRA`, `VENTA` o un literal numérico de 4 a 7 dígitos entre comillas (posible código de cuenta) (SC-002, SC-003)
- [ ] T091 [US6] Crear `src/views/SimuladorContableView.jsx` (selector de documento de ejemplo, campo opcional para pegar un canónico JSON, tipo de cambio opcional, botón "Simular", `SimulationTrace`) y registrarla en `src/components/Sidebar.jsx` y `src/App.jsx` (ícono `FlaskConical`, solo `ADMIN`)

**Checkpoint**: E6 reproducible; el test de agnosticismo pasa.

---

## Phase 9: User Story 7 — Versionar una plantilla ya usada (Priority: P2)

**Goal**: RD-10 completo: las versiones con uso no se editan; se crea una nueva versión con diff.

**Independent Test**: quickstart E7 pasos 1–2.

- [ ] T092 [P] [US7] Escribir `src/domain/accounting/__tests__/templateDiff.test.js`: línea agregada, eliminada y modificada (lado, cuenta, importe, condición, dimensiones) y cambios de cabecera (terna, prioridad, aplicabilidad, libro, glosa), con frases como "Línea 'vat': importe cambió" o "Prioridad: 0 → 10"
- [ ] T093 [US7] Implementar `src/domain/accounting/templateDiff.js` (`diffVersions`). Hacer pasar T092.
- [ ] T094 [P] [US7] Escribir `src/domain/accounting/__tests__/templateLifecycle.versioning.test.js`: `canEdit` falso si la versión tiene uso > 0 o es `PUBLISHED`; `nextVersionFrom` crea `v(n+1)` `DRAFT` con líneas y casos copiados y `lastTestRun: null`; la versión origen no cambia (comparación profunda)
- [ ] T095 [US7] Completar `canEdit` y agregar `nextVersionFrom` en `src/domain/accounting/templateLifecycle.js`. Hacer pasar T094.
- [ ] T096 [US7] Implementar en `src/services/accounting/templateService.js`: `createTemplateVersion` (calcula `diffFromPrevious` al guardar el borrador nuevo), `getTemplateDiff`, `retireTemplate`, `markTemplateUsedForDemo` (solo con `demoSettings.demoMode`) y la escritura del uso en `accountingEngine.recordTemplateUsage` (`<tenantId>:templateUsage` + `global:templateUsageIndex`, evento `TEMPLATE_USAGE_RECORDED`); y que `saveTemplateDraft` devuelva `NOT_EDITABLE` según `canEdit`. Agregar las pruebas en `src/services/accounting/__tests__/templateService.versioning.test.js`.
- [ ] T097 [US7] Crear `src/components/accounting/VersionHistory.jsx` (versiones con autor, fecha, estado por empresa, uso y diff desplegable; botones "Crear nueva versión" y "Marcar como usada (demo)") e integrarlo como pestaña de `TemplateEditor.jsx`

**Checkpoint**: E7 pasos 1–2 reproducibles.

---

## Phase 10: User Story 8 — Auditar la configuración contable (Priority: P3)

**Goal**: el Auditor reconstruye el historial de la configuración sin poder escribir.

**Independent Test**: quickstart E7 paso 3.

- [ ] T098 [P] [US8] Escribir `src/services/accounting/__tests__/audit.test.js`: cada operación de escritura de los servicios genera exactamente un evento con `userId`, `role`, `tenantId`, `traceId`, `action`, `entityType`, `entityId` y `detail`; todas las escrituras con rol `AUDITOR` → `FORBIDDEN` + `ACTION_DENIED`
- [ ] T099 [US8] Implementar `listMappingVersions` en `accountMappingService.js` y `listConfigAudit(ctx, { actionPrefix?, from?, to? })` (lectura de `<tenantId>:auditLog` filtrada a las acciones de R-15; permiso `VIEW_CONFIG_AUDIT`) en `src/services/accounting/catalogService.js`. Hacer pasar T098.
- [ ] T100 [US8] Crear `src/components/accounting/ConfigAuditLog.jsx` (tabla filtrable por acción y fecha; detalle en `Modal`) y llenar la pestaña **Bitácora** de `ConfiguracionContableView.jsx` (visible para `ADMIN` y `AUDITOR`)
- [ ] T101 [US8] Revisar las 3 vistas con el rol `AUDITOR`: ningún botón de escritura visible; los servicios rechazan igual si se invocan (el control real está en el servicio)

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T102 [P] Revisar `src/components/Sidebar.jsx` y `src/App.jsx`: no quedan entradas de las vistas eliminadas (`PlantillasGlobalesView`, `PlantillasEmpresaView`); las 3 vistas nuevas son visibles para los roles correctos
- [ ] T103 [P] Actualizar la sección 4 de `AGENTS.md` (árbol de `src/`) con `domain/accounting/`, `domain/shared/`, `data/jurisdictions/` y `services/accounting/`
- [ ] T104 Ejecutar `npx vitest run` (todo en verde, incluido `agnosticism.test.js`) y `npm run build` (sin errores ni advertencias nuevas)
- [ ] T105 Reproducir en `npm run dev` los escenarios E1–E8 de [quickstart.md](quickstart.md) y anotar en este archivo cualquier desviación
- [ ] T106 Verificar persistencia y reset: recargar conserva mapa, reglas, plantillas y activaciones; "Reset a datos demo" vuelve a la semilla (empresa `02` con 2 roles sin mapear)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (F1)** → **Foundational (F2)** → historias.
- **US1 (F3)**: solo depende de F2.
- **US2 (F4)**: depende de F2 (usa el plan ampliado y el paquete).
- **US3 (F5)**: depende de F2; su `getMappingImpact` mejora cuando existe US2, pero no la bloquea.
- **US4 (F6)**: depende de **US2** (mapa para resolver cuentas) y de **US3** (plantillas base y servicio).
- **US5 (F7)**: depende de F2; puede ir en paralelo con US3 y US4.
- **US6 (F8)**: depende de **US4** (evaluación y activaciones) y de **US5** (clasificación).
- **US7 (F9)**: depende de US3 y US4.
- **US8 (F10)**: depende de que existan los servicios de escritura (US2–US7).
- **Polish (F11)**: al final.

```text
F1 → F2 ─┬─ US1
         ├─ US2 ─┐
         ├─ US3 ─┼─ US4 ─┬─ US6
         └─ US5 ─┘       ├─ US7
                         └─ US8 → Polish
```

### Dentro de cada historia

Pruebas (deben fallar) → dominio → datos semilla → servicio (con sus pruebas) → componentes → vista.

### Parallel Opportunities

- F1: T003–T006 en paralelo.
- F2: T008 ∥ T009 ∥ T013 ∥ T015 ∥ T016 ∥ T019 ∥ T020.
- Con F2 terminada: US1, US2, US3 y US5 pueden avanzar en paralelo (archivos distintos).
- Componentes marcados [P] dentro de una historia (p. ej. T026 ∥ T027 ∥ T028; T050 ∥ T051 ∥ T054).

## Parallel Example: User Story 4

```text
En paralelo:
  T056 documentos de ejemplo      (src/data/jurisdictions/pe/sampleDocuments.js)
  T057 balance + test             (src/domain/accounting/balance.js)
  T058 test de evaluación         (src/domain/accounting/__tests__/templateEvaluation.test.js)
  T060 test del runner            (src/domain/accounting/__tests__/testRunner.test.js)
  T064 test de activación         (src/domain/accounting/__tests__/templateLifecycle.activation.test.js)
Luego, en orden: T059 → T061 → T062 → T063 → T065 → T066 → T067 → T068 → T069–T072
```

## Implementation Strategy

### MVP (US1 → US4)

1. F1 + F2.
2. US1 (catálogo visible) → US2 (mapa) → US3 (editor) → US4 (evaluación, pruebas, activación).
3. **Detenerse y validar**: T063 en verde (las 9 plantillas base reproducen la SDD §21.4) y E1–E4 del quickstart.

### Entrega incremental

4. US5 (clasificación) → US6 (simulación + agnosticismo) → US7 (versionado) → US8 (auditoría) → Polish.
5. Cada historia se valida con su escenario del quickstart antes de pasar a la siguiente.

## Notes

- [P] = archivos distintos y sin dependencias pendientes.
- No integrar código de dominio con pruebas en rojo (constitución V).
- Commits solo si el usuario los pide (AGENTS.md §11).
- Si una tarea exige algo que contradice el SDD §20 o un contrato, detenerse y reportarlo en lugar de improvisar.
