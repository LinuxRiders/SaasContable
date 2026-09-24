# Research: Motor de Plantillas AST

**Feature**: 001-motor-plantillas-ast
**Date**: 2026-09-22
**Status**: Completo

## Decisiones Técnicas

### 1. Estructura del AST (Árbol de Reglas)

**Decision**: Usar un formato JSON con nodos tipados (`condition`, `action`, `split`) en una estructura de árbol anidado.

**Rationale**: El SDD §10.1 define `ASTTemplate.rules` como `Object (serializado)`. Un JSON con nodos tipados es evaluable recursivamente, serializable, y difable. Es el formato más natural para un editor visual que produce y consume árboles.

**Alternatives considered**:

- DSL textual (ej. `IF doc.type == "FACTURA" THEN debit(6011)`) — rechazado porque requeriría un parser textual adicional, aumenta complejidad, y no es tan natural para un editor visual drag-and-drop.
- Array plano de reglas — rechazado porque no soporta anidamiento de condiciones (AND/OR) de forma natural.

**Formato de nodo AST decidido**:

```json
{
  "type": "condition",
  "field": "doc.type",
  "operator": "==",
  "value": "FACTURA",
  "children": [
    {
      "type": "action",
      "side": "debit",
      "accountCode": "6011",
      "amountField": "line.amount",
      "costCenter": null,
      "analyticTags": {}
    }
  ]
}
```

### 2. Evaluador AST como Función Pura

**Decision**: El evaluador AST vive en `src/domain/templates/evaluator.js` como función pura: `evaluate(template, canonicalDoc) → EntryLine[]`.

**Rationale**: Constitución Principio III exige que la lógica de dominio sea pura — sin React, sin localStorage, con reloj e IDs inyectados. El evaluador no necesita efectos secundarios: recibe datos, produce datos.

**Alternatives considered**:

- Evaluador como clase con estado — rechazado porque no aporta beneficio y viola el principio de funciones puras.
- Evaluador integrado en el servicio — rechazado porque mezclaría lógica de dominio con infraestructura.

### 3. Validación contra PCGE

**Decision**: La validación de cuentas es una función pura `validateAccounts(template, planContable) → ValidationResult[]` en `src/domain/templates/templateAccounts.js`.

**Rationale**: El Plan Contable ya existe como `mockPlanContable.js` con estructura `{codigo, descripcion, esCuentaU, ...}`. La validación verifica: (a) la cuenta existe, (b) es cuenta de último nivel (`esCuentaU === true`), (c) la moneda es compatible.

### 4. Versionado Inmutable (RD-10)

**Decision**: Implementar `createNewVersion(template, changes) → ASTTemplate` en `src/domain/templates/lifecycle.js`. Si `usageCount > 0`, clonar la plantilla incrementando la versión. Si `usageCount === 0`, permitir edición in-place.

**Rationale**: RD-10 del SDD lo exige explícitamente. El diff entre versiones se calcula con una función `computeDiff(oldRules, newRules) → string` en `src/domain/templates/diff.js`.

### 5. Test Runner

**Decision**: El test runner evalúa cada test case ejecutando el evaluador AST contra la entrada mock y comparando el resultado con las líneas esperadas. Vive en `src/domain/templates/testRunner.js`.

**Rationale**: NRF-11 exige test cases obligatorios. El runner compara: cuentas, montos (en céntimos para evitar floating point), lado (débito/crédito).

### 6. Persistencia

**Decision**: Las plantillas se persisten vía `src/services/storage/repository.js` usando la convención de claves `contableos:v1:<tenantId>:templates`. El servicio `src/services/ingestion/templateService.js` expone la API async.

**Rationale**: Constitución Principio I exige que localStorage se acceda solo a través del módulo de repositorio. Los servicios son async y reciben contexto `{tenantId, userId, role}`.

### 7. Datos Semilla

**Decision**: Los datos mock de plantillas se definen en `src/data/mockPlantillasReglas.js` con al menos 2 plantillas funcionales:

- `FACTURA_COMPRA_NACIONAL` — factura de compra con IGV 18%
- `NOTA_CREDITO_COMPRA` — nota de crédito que revierte la compra

**Rationale**: SC-006 exige plantillas semilla funcionales. Estas cubren los tipos de documento más comunes y sirven como referencia para testing.

## Dependencias y Compatibilidad

- **React 18**: para las vistas (PlantillasGlobalesView, PlantillasEmpresaView)
- **lucide-react**: íconos
- **Vitest**: para tests del dominio
- **theme.css**: tokens de diseño existentes
- **AccountingContext**: acceso al Plan Contable y datos de sesión
- **Sin dependencias nuevas**: todo se implementa con APIs nativas del navegador
