# Contrato: Lenguaje de Expresiones

**Feature**: 001-motor-plantillas-contables · **SDD**: §20.8.3 · **Implementación**: `src/domain/accounting/expressions/`

Lenguaje puro, determinista y sin efectos secundarios, que usan las plantillas (importes, condiciones, cuentas calificadas, dimensiones, glosas), las reglas de clasificación y las reglas de coherencia de los esquemas.

## 1. Formas de nodo

| Forma | Ejemplo | Significado |
|---|---|---|
| Primitivo | `"VAT"`, `1800`, `true`, `null` | Literal (equivale a `{ "const": ... }`) |
| `const` | `{ "const": "CC-ADMIN" }` | Literal explícito |
| `field` | `{ "field": "totals.netMinor" }` | Valor del documento por ruta |
| `line` | `{ "line": "amountMinor" }` | Valor de la línea actual; solo con `forEachDocumentLine` o en reglas `LINE` |
| `fn` | `{ "fn": "taxAmount", "args": ["VAT"] }` | Llamada a función de la lista blanca |
| `fn` + `prop` | `{ "fn": "party", "args": ["ISSUER"], "prop": "fiscalId" }` | Propiedad del objeto que devuelve la función |

Rutas válidas en `field`: `series`, `number`, `issueDate`, `dueDate`, `currency`, `perspective`, `operationTypeCode`, `documentTypeCode`, `totals.<netMinor|taxMinor|withheldMinor|totalMinor|payableMinor>`, `fields.<clave del esquema>`. En `line`: `lineNo`, `description`, `itemCode`, `quantity`, `unitPriceMinor`, `amountMinor`, `operationTypeCode`, `fields.<clave de línea del esquema>`.

## 2. Tipos

`MONEY` (entero, unidades mínimas), `INT`, `RATE_BP` (entero), `BOOL`, `STRING`, `DATE` (`YYYY-MM-DD`), `NULL`. Cada campo del esquema declara su tipo (`MONEY`, `QUANTITY`→`INT`, `PERCENT`→`RATE_BP`, `CODE`/`STRING`→`STRING`, `DATE`, `BOOLEAN`→`BOOL`). El validador estático infiere el tipo de cada nodo y rechaza combinaciones inválidas.

## 3. Funciones (lista blanca cerrada)

| Grupo | Función | Firma | Notas |
|---|---|---|---|
| Impuestos | `taxAmount(code)` | STRING → MONEY | 0 si no existe |
| | `taxBase(code)` | STRING → MONEY | 0 si no existe |
| | `taxRate(code)` | STRING → RATE_BP | tasa del documento; `null` si no existe |
| | `hasTax(code)` | STRING → BOOL | |
| | `lineTaxAmount(code)` | STRING → MONEY | solo con `line` |
| Retenciones | `withholdingAmount(code)` / `withholdingBase(code)` | STRING → MONEY | 0 si no existe |
| | `hasWithholding(code)` | STRING → BOOL | |
| Partes y referencias | `party(role)` + `prop` | STRING → objeto | `prop` ∈ `fiscalId`, `fiscalIdType`, `name`, `countryCode` |
| | `reference(index)` + `prop` | INT → objeto | `prop` ∈ `documentTypeCode`, `series`, `number`, `issueDate` |
| | `hasReference()` | → BOOL | |
| Agregados | `sumLines(expr, where?)` | MONEY, BOOL → MONEY | `expr` y `where` se evalúan con cada línea como `line` |
| | `countLines(where?)` | BOOL → INT | |
| Aritmética | `add(a, b, ...)` / `sub(a, b)` | MONEY… → MONEY | enteros; sin decimales |
| | `mulRate(amount, rateBp)` | MONEY, RATE_BP → MONEY | `roundHalfUp(amount × rateBp / 10000)`, **único** redondeo |
| | `min(a, b)` / `max(a, b)` | MONEY → MONEY | |
| | `coalesce(a, b, ...)` | T… → T | primer valor no nulo |
| Comparación | `eq`, `ne` | T, T → BOOL | |
| | `gt`, `gte`, `lt`, `lte` | MONEY/INT/DATE → BOOL | |
| | `in(value, [lista])` | T, T[] → BOOL | la lista es un arreglo de primitivos |
| Lógica | `and(...)`, `or(...)` | BOOL… → BOOL | cortocircuito |
| | `not(a)` | BOOL → BOOL | |
| | `isEmpty(a)` | T → BOOL | `null`, `''` o arreglo vacío |
| Texto | `contains(text, sub)`, `startsWith(text, prefix)` | STRING → BOOL | sensibles a mayúsculas |
| | `lower(text)` | STRING → STRING | |
| | `concat(a, b, ...)` | → STRING | convierte números a texto |
| | `formatMoney(amount)` | MONEY → STRING | usa la moneda del documento |
| Fechas | `year(date)`, `month(date)` | DATE → INT | |
| | `period(date)` | DATE → STRING | `YYYY-MM` |
| | `daysBetween(a, b)` | DATE, DATE → INT | |

No existen funciones con nombre de impuesto, país o cuenta concretos.

## 4. Validación estática (al guardar)

1. Cada nodo tiene una de las formas de §1; toda `fn` está en la lista blanca.
2. Profundidad máxima: 12. Número máximo de nodos por expresión: 200.
3. Aridad y tipos de argumentos correctos; el tipo del resultado coincide con el esperado por el lugar donde se usa:
   - `amount`: MONEY
   - `emitWhen`, `applicability`, `when`, `check`: BOOL
   - `qualifierFrom`, `dimensions.*`, `glosa`, `description`: STRING
4. Toda ruta `field.fields.*` y `line.fields.*` existe en el esquema del tipo de documento de la plantilla. Todo código de `taxAmount`/`withholdingAmount` está en `allowedTaxCodes`/`allowedWithholdingCodes` del tipo.
5. `line` solo aparece donde hay contexto de línea (`forEachDocumentLine = true`, reglas `LINE`, o dentro de `sumLines`/`countLines`).

Errores: `{ code: 'EXPRESSION_INVALID', message, details: { path: 'lines[2].amount.args[0]', reason } }`.

## 5. Semántica de evaluación

- Pura: recibe `{ document, line?, pack, issueDate }` y devuelve un valor; no lee reloj, almacenamiento ni aleatoriedad.
- Un campo ausente en el documento evalúa a `null`. `add`, `sub` y `mulRate` con `null` producen el error `NULL_IN_ARITHMETIC`, que la evaluación de plantilla reporta como `MISSING_INPUT`.
- Toda aritmética es entera; `mulRate` es la única operación que redondea.
- Mismo documento + misma expresión = mismo resultado (SC-007).

## 6. Ejemplos

Importe del IGV (SDD §21.4):

```json
{ "fn": "taxAmount", "args": ["VAT"] }
```

Emitir la línea de retención solo si existe:

```json
{ "fn": "hasWithholding", "args": ["INCOME_TAX_FEES"] }
```

Cuenta de destino calificada por el centro de costo del documento:

```json
{ "kind": "ROLE", "value": "COST_DESTINATION", "qualifierFrom": { "field": "fields.costCenter" } }
```

Suma de las líneas clasificadas como gasto:

```json
{ "fn": "sumLines", "args": [
  { "line": "amountMinor" },
  { "fn": "ne", "args": [{ "line": "operationTypeCode" }, "MERCHANDISE_PURCHASE"] }
] }
```

Glosa:

```json
{ "fn": "concat", "args": ["Compra de mercadería s/ ", { "field": "series" }, "-", { "field": "number" }] }
```
