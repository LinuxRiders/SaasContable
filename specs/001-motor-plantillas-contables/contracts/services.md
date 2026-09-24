# Contrato: Servicios Mock de Configuración Contable

**Feature**: 001-motor-plantillas-contables · **Implementación**: `src/services/accounting/` · **Punto de entrada**: `src/services/accounting/index.js`

Reglas comunes (constitución I y IV):

- Toda función es `async`, recibe primero `ctx = { tenantId, userId, role }` y aplica la latencia de `demoSettings`.
- Retorno: `{ ok: true, data }` o `{ ok: false, error: { code, message, details } }` (helpers `ok`/`fail` de `serviceKit.js`).
- Validan `ctx` (`validateCtx`), el permiso (`authorize`) y el tenant (RD-08: nunca devuelven datos de otro tenant).
- Toda escritura registra un evento en `<tenantId>:auditLog` (research R-15).
- El paquete del tenant se resuelve por `empresa.jurisdictionCode` en el registro `src/data/jurisdictions/index.js`.
- Códigos de error: `VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `EXPRESSION_INVALID`, `ACTIVATION_BLOCKED`, `NOT_EDITABLE`, `NO_JURISDICTION_PACK`.

## 1. `catalogService`

| Operación | Permiso | Entrada | Salida |
|---|---|---|---|
| `getJurisdictionPack(ctx)` | `VIEW_ACCOUNTING_CONFIG` | — | resumen del paquete (código, versión, conteos) |
| `listDocumentTypes(ctx, { date? })` | `VIEW_ACCOUNTING_CONFIG` | fecha de vigencia (por defecto, hoy según el reloj inyectado) | tipos vigentes con familia, códigos oficiales, perspectivas, `generatesEntry` y libro |
| `getDocumentTypeSchema(ctx, { code, date? })` | `VIEW_ACCOUNTING_CONFIG` | | `DocumentTypeDefinition` completo |
| `listTaxes(ctx, { date })` | `VIEW_ACCOUNTING_CONFIG` | | impuestos y retenciones con la tasa vigente a la fecha (o `null`) |
| `listOperationTypes(ctx)`, `listAccountRoles(ctx)`, `listLegalBooks(ctx)` | `VIEW_ACCOUNTING_CONFIG` | | catálogos |

## 2. `accountMappingService`

| Operación | Permiso | Entrada | Salida |
|---|---|---|---|
| `getAccountMapping(ctx)` | `VIEW_ACCOUNTING_CONFIG` | | versión activa, con cada rol, calificador, cuenta y descripción de la cuenta, más `unmappedRoles` |
| `getMappingImpact(ctx)` | `VIEW_ACCOUNTING_CONFIG` | | por rol sin mapear o inválido: plantillas activas o activables afectadas (FR-012) |
| `saveAccountMapping(ctx, { expectedVersion, entries })` | `EDIT_ACCOUNT_MAPPING` | | nueva versión o `VALIDATION_ERROR` con errores por entrada; `CONFLICT` si `expectedVersion` no coincide |
| `suggestMapping(ctx)` | `EDIT_ACCOUNT_MAPPING` | | entradas sugeridas por precarga, sin guardar |
| `listMappingVersions(ctx)` | `VIEW_CONFIG_AUDIT` | | historial con `changedRoles` |

## 3. `classificationRuleService`

| Operación | Permiso | Entrada | Salida |
|---|---|---|---|
| `listClassificationRules(ctx, { status? })` | `VIEW_ACCOUNTING_CONFIG` | | reglas |
| `saveClassificationRule(ctx, { rule })` | `EDIT_CLASSIFICATION_RULES` | regla nueva o editada (`status` `ACTIVE` o `PROPOSED`) | regla con versión nueva; `EXPRESSION_INVALID` |
| `setClassificationRuleStatus(ctx, { ruleId, status })` | `EDIT_CLASSIFICATION_RULES` | `ACTIVE` o `RETIRED` | regla actualizada |
| `testClassification(ctx, { document })` | `SIMULATE` | canónico | resultado de `classify` con traza |

La creación de reglas `PROPOSED` desde la bandeja del Maker la agrega el spec 003 con su propio permiso.

## 4. `templateService`

| Operación | Permiso | Entrada | Salida |
|---|---|---|---|
| `listTemplates(ctx, { documentTypeCode?, scope?, includeRetired? })` | `VIEW_ACCOUNTING_CONFIG` | | plantillas `PACK` del paquete + `TENANT` del tenant, con su estado de activación en el tenant y el uso por versión |
| `getTemplate(ctx, { templateId })` | `VIEW_ACCOUNTING_CONFIG` | | plantilla con versiones, activaciones del tenant y uso |
| `createTemplate(ctx, { definition })` | `EDIT_TEMPLATES` | terna, nombre, código, líneas… | plantilla `TENANT` v1 `DRAFT` |
| `duplicateTemplate(ctx, { templateId, version })` | `EDIT_TEMPLATES` | plantilla `PACK` o `TENANT` | plantilla `TENANT` nueva v1 `DRAFT` con `duplicatedFrom` |
| `saveTemplateDraft(ctx, { templateId, version, definition })` | `EDIT_TEMPLATES` | | versión actualizada; `EXPRESSION_INVALID`/`VALIDATION_ERROR` con `errors[]`; `NOT_EDITABLE` si no es `DRAFT` |
| `createTemplateVersion(ctx, { templateId, fromVersion })` | `EDIT_TEMPLATES` | | nueva versión `DRAFT` con `diffFromPrevious` al guardar |
| `runTemplateTests(ctx, { templateId, version })` | `RUN_TEMPLATE_TESTS` | | `TestRun` persistido en la versión (para `TENANT`) o en `<tenantId>:packTestRuns` (para `PACK`) |
| `activateTemplate(ctx, { templateId, version })` | `ACTIVATE_TEMPLATES` | | activación; `ACTIVATION_BLOCKED` con `errors[]` (pruebas, cuentas, ambigüedad, retirada) |
| `deactivateTemplate(ctx, { templateId })` | `ACTIVATE_TEMPLATES` | | activación `INACTIVE` |
| `retireTemplate(ctx, { templateId })` | `EDIT_TEMPLATES` | solo `TENANT` | plantilla retirada y activaciones desactivadas |
| `getTemplateDiff(ctx, { templateId, fromVersion, toVersion })` | `VIEW_ACCOUNTING_CONFIG` | | frases de diff |
| `markTemplateUsedForDemo(ctx, { templateId, version })` | `EDIT_TEMPLATES` | solo con `demoSettings.demoMode = true` | incrementa el uso para demostrar RD-10 antes de que exista el spec 003 |

## 5. `simulationService`

| Operación | Permiso | Entrada | Salida |
|---|---|---|---|
| `listSampleDocuments(ctx)` | `SIMULATE` | | documentos de ejemplo del paquete (id, título, tipo, formato de origen, resultado esperado) |
| `simulateDocument(ctx, { document \| sampleId, fxRateMilli? })` | `SIMULATE` | | salida de `interpretDocument` con traza completa; **no persiste nada** (FR-024) |

## 6. API para los specs 002 y 003 (`accountingEngine`)

Exportada desde `src/services/accounting/index.js` para que el traductor la use sin duplicar lógica (FR-029). Recibe `ctx` y aplica el aislamiento por tenant.

| Operación | Descripción |
|---|---|
| `getInterpretationContext(ctx)` | paquete, plan de cuentas, mapa activo, reglas `ACTIVE`, `tenantFiscalId`, moneda funcional y una función `candidatesFor(terna)` sobre las activaciones `ACTIVE` del tenant |
| `interpret(ctx, { document, fxRateMilli })` | `interpretDocument` con el contexto anterior |
| `getTemplateVersion(ctx, { templateId, version })` | versión exacta (para trazabilidad) |
| `recordTemplateUsage(ctx, { templateId, version })` | incrementa `templateUsage` e índice global; lo llama el spec 003 al crear un asiento |

## 7. Permisos (matriz en `permissions.js`)

| Operación | ADMIN | MAKER | CHECKER | AUDITOR |
|---|---|---|---|---|
| `VIEW_ACCOUNTING_CONFIG` | ✔ | ✔ | ✔ | ✔ |
| `VIEW_CONFIG_AUDIT` | ✔ | | | ✔ |
| `EDIT_ACCOUNT_MAPPING`, `EDIT_CLASSIFICATION_RULES`, `EDIT_TEMPLATES`, `RUN_TEMPLATE_TESTS`, `ACTIVATE_TEMPLATES`, `SIMULATE` | ✔ | | | |

Un rechazo por permiso registra `ACTION_DENIED` en la bitácora (comportamiento existente de `authorize`).
