# Contrato: API de Dominio del Motor Contable

**Feature**: 001-motor-plantillas-contables · **Implementación**: `src/domain/accounting/` · **Consumidores**: servicios de esta feature, spec 002 (ingestión) y spec 003 (traducción y bandeja).

Todas son **funciones puras**: sin React, sin `localStorage`, sin `Date.now()` ni aleatoriedad. El paquete, el plan de cuentas, el mapa, las reglas y las plantillas se reciben como argumentos. Ninguna función menciona un país, impuesto, tipo de documento o cuenta concretos (RD-14).

Forma de retorno común: `{ ok: true, ... }` o `{ ok: false, pending: PendingReason[] }` para resultados contables, y excepciones con `code` solo para errores de programación (argumentos inválidos).

## 1. Catálogo — `catalog.js`

| Función | Entrada | Salida |
|---|---|---|
| `getDocumentType(pack, code, date)` | paquete, código, fecha | `DocumentTypeDefinition` vigente o `null` |
| `getTaxRate(pack, taxCode, date)` | paquete, código, fecha | `{ rateBp, effectiveFrom, effectiveTo }` o `null` |
| `getOperationTypes(pack, documentType, perspective)` | | códigos admitidos |
| `getAccountRole(pack, roleCode)` | | `AccountRole` o `null` |

## 2. Documento — `documentValidation.js`, `perspective.js`

| Función | Entrada | Salida |
|---|---|---|
| `validateDocument(document, { pack })` | canónico | `{ ok, pending }` con `SCHEMA_INVALID` (detalle por campo o regla), `CATALOG_NOT_EFFECTIVE` o `DOCUMENT_TYPE_NOT_ACCOUNTABLE` |
| `resolvePerspective(document, { documentType, tenantFiscalId })` | | `{ ok, perspective }` o `DOCUMENT_NOT_FOR_TENANT` |

`validateDocument` comprueba: tipo vigente, campos obligatorios y tipos de dato, partes exigidas, impuestos y retenciones admitidos, referencia exigida, reglas de coherencia con la tolerancia del esquema, y que `taxAmount ≈ mulRate(taxBase, tasa vigente)` dentro de la tolerancia (SDD §20.5).

## 3. Clasificación — `classification.js`

| Función | Entrada | Salida |
|---|---|---|
| `classify(document, { pack, documentType, rules })` | canónico con perspectiva, reglas `ACTIVE` | `{ ok, operationTypeCode, lineOperationTypes: Record<lineNo, code>, trace: [{ ruleId, scope, matched }], decidedBy: 'SOURCE'|'RULE:<id>'|'SINGLE_OPTION'|'MIXED' }` o `CLASSIFICATION_REQUIRED` |
| `applyClassification(document, result)` | | copia del documento con `operationTypeCode` en documento y líneas |

## 4. Selección — `templateSelection.js`

| Función | Entrada | Salida |
|---|---|---|
| `selectTemplate(document, { candidates })` | documento clasificado; `candidates` = `{ template, version }[]` activos para el tenant y la terna | `{ ok, template, version, trace }` o `NO_TEMPLATE` / `AMBIGUOUS_TEMPLATE` con traza |

## 5. Cuentas — `accountResolution.js`, `accountMapping.js`

| Función | Entrada | Salida |
|---|---|---|
| `resolveAccount(accountRef, { mapping, chart, qualifier, lineOperationType })` | | `{ ok, accountCode, accountRole }` o `ACCOUNT_UNRESOLVED` |
| `validateMappingEntry(entry, { pack, chart })` | | `{ ok }` o errores `ACCOUNT_NOT_FOUND`, `ACCOUNT_NOT_POSTABLE`, `ACCOUNT_INACTIVE`, `ROLE_UNKNOWN`, `QUALIFIER_NOT_ALLOWED` |
| `preloadMapping(pack, chart, existingEntries)` | | entradas sugeridas (sin pisar existentes) y lista de roles sin equivalente |
| `rolesUsedBy(templateVersion)` | | `{ roleCode, qualifiers[] }[]` y cuentas literales usadas |
| `checkTemplateAccounts(templateVersion, { mapping, chart })` | | `{ ok, unresolved: [...] }` (requisito de activación) |

## 6. Plantillas — `templateValidation.js`, `templateEvaluation.js`, `testRunner.js`, `templateDiff.js`, `templateLifecycle.js`

| Función | Entrada | Salida |
|---|---|---|
| `validateTemplateVersion(version, { pack, scope })` | | `{ ok, errors: [{ path, code, message }] }`: estructura, expresiones (contrato de expresiones §4), ≥1 `DEBIT` y ≥1 `CREDIT`, ≤1 `balancingLine`, libro existente, tipo que genera asiento, operación admitida para la perspectiva, `LITERAL` solo en `TENANT` |
| `evaluateTemplate(version, document, { pack, mapping, chart, fxRateMilli, functionalCurrency })` | documento validado y clasificado | `EvaluationResult` (data-model §12); algoritmo de la SDD §20.8.3 |
| `checkBalance(lines)` | | `{ ok, debitMinor, creditMinor }` |
| `runTests(version, { pack, tenantMapping, chart, functionalCurrency })` | | `TestRun` sin `at` ni `contentHash` (los agrega el servicio) |
| `diffVersions(prev, next)` | | frases en español |
| `contentForHash(version)` | | JSON canónico (claves ordenadas) de la definición, para `contentHash` |
| `canEdit(template, version, usageTotal, activations)` | | `{ editable, reason }` |
| `nextVersionFrom(version, { createdBy, createdAt })` | | nueva versión `DRAFT` |
| `checkActivation({ template, version, lastTestRun, currentHash, accountCheck, activeInTenant })` | | `{ ok, errors }`: pruebas presentes y en verde para el hash actual, cuentas resueltas, sin empate de terna + alcance + prioridad, plantilla no retirada |

## 7. Orquestación pura — `interpretation.js`

| Función | Entrada | Salida |
|---|---|---|
| `interpretDocument(document, { pack, tenantFiscalId, rules, candidatesFor, mapping, chart, fxRateMilli, functionalCurrency })` | `candidatesFor(terna)` devuelve candidatas | `{ ok, entry: { lines, glosa, legalBookCode, templateId, templateVersion, perspective, operationTypeCode }, trace }` o `{ ok: false, pending, trace, stoppedAt: 'SCHEMA'|'PERSPECTIVE'|'CLASSIFICATION'|'SELECTION'|'EVALUATION' }` |

`interpretDocument` ejecuta los pasos 1, 2, 3, 6 y 7 del §5.4 del SDD en orden y se detiene en el primer paso con pendientes, devolviendo la traza completa hasta ese punto. Los pasos 4 (tributos) y 5 (FX) se resuelven dentro de la validación de esquema (tasas vigentes) y de la evaluación (`fxRateMilli` recibido). La simulación de esta feature y el traductor del spec 003 usan esta misma función.
