# Contratos de Servicio: Motor de Plantillas AST

**Feature**: 001-motor-plantillas-ast
**SDD Reference**: §12 Contratos de API (Abstractos), §10.1 ITemplateRepository

## Convención General

Todos los servicios:

- Son funciones `async` que retornan `Promise<Result>`
- Reciben un contexto `ctx = { tenantId, userId, role }` como primer argumento
- Retornan `{ ok: true, data: ... }` en éxito o `{ ok: false, error: { code, message, details } }` en error
- Códigos de error estándar: `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`
- Simulan latencia configurable (modo prototipo)

## 1. Gestión del Catálogo Global de Plantillas

### `listTemplateBank(ctx, options) → TemplateSummary[]`

Lista todas las plantillas del catálogo global.

| Parámetro                | Tipo    | Descripción                                      |
| ------------------------ | ------- | ------------------------------------------------ |
| `ctx.role`               | String  | `ADMIN` obligatorio                              |
| `options.includeRetired` | Boolean | Si incluir plantillas retiradas (default: false) |

**Retorna**: Array de resúmenes con `{ templateId, code, name, operationType, activeVersion, draftVersion, retired, versionsCount }`.

### `createTemplate(ctx, payload) → Template`

Crea una plantilla nueva con versión 1 en DRAFT.

| Parámetro               | Tipo   | Restricción         | Descripción                                                       |
| ----------------------- | ------ | ------------------- | ----------------------------------------------------------------- |
| `ctx.role`              | String | `ADMIN`             | Validación de rol                                                 |
| `payload.code`          | String | NOT NULL, unique    | Código de la plantilla (ej. "FACTURA_COMPRA")                     |
| `payload.name`          | String | NOT NULL            | Nombre legible                                                    |
| `payload.operationType` | String | `COMPRA` \| `VENTA` | Tipo de operación                                                 |
| `payload.defaults`      | Object | NOT NULL            | Cuentas por defecto (baseAccount, taxAccount, counterpartAccount) |

**Errores**: `VALIDATION_ERROR` (campos faltantes), `CONFLICT` (código duplicado), `FORBIDDEN` (rol no Admin).

### `getTemplate(ctx, { templateId }) → Template`

Obtiene una plantilla completa con todas sus versiones.

### `saveTemplateDraft(ctx, { templateId, version, draft }) → TemplateVersion`

Guarda cambios en un borrador existente.

**Errores**: `CONFLICT` (versión no es DRAFT), `NOT_FOUND`, `VALIDATION_ERROR` (esquema inválido).

### `editTemplate(ctx, { templateId }) → TemplateVersion`

Inicia la edición de una plantilla. Si la versión activa tiene `usageCount > 0`, crea una nueva versión DRAFT (RD-10). Si `usageCount === 0`, permite editar la versión actual.

### `activateTemplateVersion(ctx, { templateId, version }) → TemplateVersion`

Activa una versión específica. Requiere: ≥1 test case exitoso, cuentas validadas contra PCGE.

**Errores**: `VALIDATION_ERROR` (tests no pasan, cuentas inválidas), `NOT_FOUND`.

### `deleteTemplateDraft(ctx, { templateId, version }) → { deleted: boolean }`

Elimina un borrador no publicado.

### `retireTemplate(ctx, { templateId }) → Template`

Retira una plantilla del catálogo.

## 2. Test Runner

### `runTemplateTests(ctx, { templateId, version }) → TestRunResult`

Ejecuta todos los test cases de una versión.

**Retorna**:

```javascript
{
  allPassed: boolean,
  uncoveredRuleIds: string[],  // Reglas sin cobertura
  results: [
    {
      testCaseId: string,
      name: string,
      passed: boolean,
      balanced: boolean,     // Σ Débitos === Σ Créditos
      lineMatches: [         // Detalle por línea esperada
        { expected: EntryLine, actual: EntryLine | null, match: boolean }
      ],
      error: string | null
    }
  ]
}
```

## 3. Activación por Empresa (Tenant)

### `listCompanyTemplateActivations(ctx) → ActivationSummary[]`

Lista plantillas con estado de activación para la empresa del contexto.

| Parámetro      | Tipo   | Descripción                     |
| -------------- | ------ | ------------------------------- |
| `ctx.tenantId` | String | Empresa (implícito en contexto) |
| `ctx.role`     | String | `ADMIN` o `AUDITOR`             |

**Retorna**: Array con `{ templateId, code, name, operationType, activeVersion, active, accountWarnings[] }`.

### `setCompanyTemplateActivation(ctx, { templateId, active }) → TemplateActivation`

Activa o desactiva una plantilla para una empresa.

| Parámetro            | Tipo    | Descripción          |
| -------------------- | ------- | -------------------- |
| `ctx.role`           | String  | `ADMIN` obligatorio  |
| `payload.templateId` | String  | ID de la plantilla   |
| `payload.active`     | Boolean | Activar o desactivar |

**Retorna**: `{ templateId, active, activatedBy, activatedAt, accountWarnings[] }`.

## 4. Interfaz de Dominio (para specs posteriores)

### `getActiveTemplate(tenantId, documentType) → ASTTemplate | null`

Interfaz que usará el Motor de Traducción (spec 003). Devuelve la plantilla activa para un tenant y tipo de documento, o `null` si no hay ninguna activa.

### `getTemplateByVersion(tenantId, documentType, version) → ASTTemplate | null`

Para trazabilidad: recuperar la versión exacta de plantilla usada en un asiento.

### `listTemplates(tenantId) → ASTTemplate[]`

Lista todas las plantillas activas de un tenant (para la vista del Maker).
