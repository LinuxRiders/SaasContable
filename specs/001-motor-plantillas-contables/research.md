# Research: Configuración Contable y Motor de Plantillas por Tipo de Documento

**Feature**: 001-motor-plantillas-contables · **Fecha**: 2026-09-22

Decisiones técnicas que resuelven las incógnitas del plan. Cada una: **Decisión**, **Justificación** y **Alternativas descartadas**.

---

## R-01 · Dónde vive el Paquete de Jurisdicción

- **Decisión**: el paquete es **dato estático versionado** en `src/data/jurisdictions/<código>/`, registrado en `src/data/jurisdictions/index.js` (`{ PE: pePack }`). No se guarda en `localStorage`. El dominio nunca lo importa: los servicios lo resuelven por `empresa.jurisdictionCode` y lo **inyectan** como argumento a las funciones puras.
- **Justificación**: el paquete es de solo lectura para el tenant (FR-003) y su publicación es una tarea de plataforma (Assumptions). Guardarlo en `localStorage` solo añadiría riesgo de desincronización con la semilla. La inyección mantiene el dominio agnóstico (RD-14) y hace trivial probarlo con un paquete de prueba.
- **Alternativas**: sembrarlo en `localStorage` (descartado: duplica la fuente de verdad); importarlo desde el dominio (descartado: acopla el núcleo a Perú).

## R-02 · Plantillas de paquete y plantillas de tenant

- **Decisión**: las plantillas `PACK` son parte del paquete (dato estático, inmutable; una versión nueva solo llega con una versión nueva del paquete). Las plantillas `TENANT` (propias o duplicadas de una `PACK`) se guardan en `contableos:v1:<tenantId>:templates`. Las activaciones se guardan en `<tenantId>:templateActivations`, y el uso por versión en `<tenantId>:templateUsage` (`{ "<templateId>@<version>": count }`).
- **Justificación**: RD-10 se cumple por construcción para `PACK`; para `TENANT` se aplica el ciclo de versiones. Separar el uso permite contar el uso de plantillas `PACK` sin mutarlas.
- **Alternativas**: un catálogo global mutable de plantillas (el modelo anterior; descartado porque mezclaba catálogo, versiones y activación en un mismo objeto).

## R-03 · Representación de importes y tasas

- **Decisión**:
  - Importes: enteros en unidades mínimas (`*Minor`). La cantidad de decimales por moneda sale de una tabla ISO 4217 mínima en `src/domain/shared/currencies.js` (estándar internacional, no de jurisdicción).
  - Tasas de impuesto: enteros en **puntos básicos** (`rateBp`: 18 % = 1800).
  - Tipos de cambio: enteros en **milésimas** (`rateMilli`, como ya usa `fx.js`).
  - `mulRate(amountMinor, rateBp) = roundHalfUp(amountMinor × rateBp / 10000)`.
  - La conversión FX usa `convert()` de `fx.js`, una vez por línea.
- **Justificación**: la constitución prohíbe la aritmética flotante acumulativa. Con escalas enteras explícitas, cada redondeo es único y trazable.
- **Alternativas**: decimales como string con una librería de precisión (descartado: dependencia nueva innecesaria).

## R-04 · Lenguaje de expresiones

- **Decisión**: AST JSON con cuatro formas de nodo: `{ "const": v }`, `{ "field": "<ruta>" }`, `{ "line": "<ruta>" }` y `{ "fn": "<nombre>", "args": [...], "prop"?: "<propiedad>" }`. Los argumentos primitivos (string, number, boolean) equivalen a `const`. Lista blanca cerrada de funciones (ver [contracts/expression-language.md](contracts/expression-language.md)), profundidad máxima 12 y validación estática de tipos y rutas contra el esquema del tipo de documento. El evaluador es un intérprete recursivo puro.
- **Justificación**: coincide con la notación de la SDD §21.4. Es serializable, fácil de construir desde un editor visual y fácil de validar sin escribir un parser de texto.
- **Alternativas**: mini-lenguaje textual con parser propio (descartado: más código y más errores para un prototipo); `eval`/`Function` (descartado: inseguro y no determinista).

## R-05 · Editor visual de expresiones

- **Decisión**: un **constructor estructurado**: el Admin elige un nodo (campo del esquema, impuesto, retención, operación aritmética, comparación…) desde listas filtradas por el esquema y el tipo esperado, y completa sus argumentos. Existe un modo "JSON avanzado" de solo lectura para inspección. No se escribe texto libre.
- **Justificación**: el spec pide "sin código" (HU-01). El constructor garantiza expresiones válidas por construcción y solo ofrece campos que el esquema define (US3-1, US3-3).
- **Alternativas**: editor de texto con autocompletado (descartado: requiere parser).

## R-06 · Plan de cuentas, cuentas de detalle y dimensiones

- **Decisión**: se usa el plan por tenant ya sembrado en `<tenantId>:chartOfAccounts` (desde `mockPlanContable.js`). Cuenta de detalle = `esCuentaU === true`. Cuenta activa = `activo !== false` (campo nuevo, por defecto activo). `requiereCC === true` ⇒ la línea debe traer la dimensión `costCenter` (si falta: `MISSING_DIMENSION`). `mockPlanContable.js` se **amplía** con las cuentas de detalle de 7 dígitos que exigen las plantillas base (lista en [data-model.md](data-model.md) §8).
- **Justificación**: reutiliza el módulo Plan Contable sin refactorizarlo (constitución VII); solo agrega datos (FR-033).
- **Alternativas**: un plan paralelo para el motor (descartado: dos fuentes de verdad).

## R-07 · Precarga del mapa de cuentas

- **Decisión**: para cada rol, se toma la **primera cuenta de detalle activa, en orden de código**, cuyo código empieza por la cuenta sugerida del paquete (p. ej. sugerida `4212` → `4212101`). Si no hay ninguna, el rol queda sin mapear. Para roles con calificador (p. ej. `COST_DESTINATION`), la precarga usa la tabla `qualifierSuggestions` del paquete (p. ej. `CC-ADMIN → 94`, `CC-VENTAS → 95`, `CC-LOGISTICA → 95`) con la misma regla de prefijo. La precarga se ejecuta en la semilla y cuando el Admin pide "Precargar sugerencias"; nunca pisa asignaciones existentes.
- **Justificación**: es determinista y explicable (FR-010), y respeta el plan real de la empresa.
- **Alternativas**: un mapeo manual completo (descartado: poco práctico para la demo).

## R-08 · Clasificación

- **Decisión**: función pura `classify(document, { rules, pack })` que devuelve el tipo de operación del documento y de cada línea, la traza de reglas evaluadas y los motivos. Orden (SDD §20.4): (1) valor explícito del origen, (2) reglas `ACTIVE` por prioridad descendente y, a igual prioridad, por `id` ascendente, (3) única operación admitida por el tipo de documento y la perspectiva (`documentType.operationTypesByPerspective`), (4) las líneas sin regla heredan el tipo del documento y el tipo final del documento sale de sus líneas: si coinciden, ese; si difieren, el compuesto del paquete (`pack.mixedOperationTypes[perspective]`), (5) si el documento o alguna línea queda sin tipo, `CLASSIFICATION_REQUIRED`. Una regla cuyo tipo no está admitido para el tipo de documento y la perspectiva se ignora y queda en la traza. Las condiciones usan el mismo lenguaje de expresiones; las reglas `LINE` tienen `line` en el contexto.
- **Justificación**: una sola semántica de condiciones en todo el motor; es determinista (RD-16).
- **Alternativas**: reglas con operadores propios (descartado: segundo lenguaje).

## R-09 · Selección de plantilla

- **Decisión**: función pura `selectTemplate(document, { candidates })` que recibe las plantillas activas del tenant con la misma terna (las obtiene el servicio), evalúa `applicability`, ordena por (`scope` `TENANT` > `PACK`, `priority` desc) y devuelve `{ template }`, `NO_TEMPLATE` o `AMBIGUOUS_TEMPLATE`, más la traza.
- **Justificación**: el dominio no accede a almacenamiento (constitución III); la regla de orden es explícita y comprobable.

## R-10 · Pruebas y activación

- **Decisión**: el resultado de una ejecución de pruebas se guarda en la versión con `lastTestRun = { at, contentHash, results[] }`, donde `contentHash` es el SHA-256 del JSON canónico (claves ordenadas) de la definición de la versión (terna, aplicabilidad, líneas, glosa, requiredInputs, casos). La activación exige que el `contentHash` actual coincida con el de `lastTestRun` y que todos los resultados sean `PASS`. En las plantillas `PACK`, las pruebas se ejecutan con el mapa de la empresa al activar.
- **Justificación**: impide activar una versión modificada después de probarla (FR-026).
- **Alternativas**: re-ejecutar siempre al activar (se hace además, como verificación final, sin persistir).

## R-11 · Versionado y diff

- **Decisión**: solo las plantillas `TENANT` tienen ciclo `DRAFT → ACTIVE → SUPERSEDED | RETIRED` por versión. Editar una versión con uso > 0 crea `v(n+1)` en `DRAFT` copiando líneas y casos. El diff se calcula por `id` de línea: agregadas, eliminadas y modificadas (lado, cuenta, importe, condición, dimensiones), más cambios de cabecera (terna, prioridad, aplicabilidad, libro, glosa). Se expresa en frases en español. El mapa de cuentas y las reglas se versionan por documento completo (`version` incremental + `changedRoles` / `changedRules`).
- **Justificación**: RD-10 y RF-08, con diffs legibles para el Auditor (US7-4).

## R-12 · Permisos

- **Decisión**: los servicios nuevos usan `authorize(ctx, operation)` de `serviceKit.js` con operaciones nuevas en la matriz de `permissions.js`: `VIEW_ACCOUNTING_CONFIG` (todos los roles), `EDIT_ACCOUNT_MAPPING`, `EDIT_CLASSIFICATION_RULES`, `EDIT_TEMPLATES`, `RUN_TEMPLATE_TESTS`, `ACTIVATE_TEMPLATES` y `SIMULATE` (solo `ADMIN`), y `VIEW_CONFIG_AUDIT` (`ADMIN`, `AUDITOR`). Se elimina el *bypass* de `assertRole` que daba al `ADMIN` acceso total: el Admin de Plantillas no es Maker ni Checker (FR-030, RD-05).
- **Justificación**: el spec anterior daba permisos totales al Admin, lo que contradice la SoD del SDD §14.

## R-13 · Esquema de datos y reset

- **Decisión**: `meta.schemaVersion` sube a `2`. Si al iniciar el valor no es `2`, se limpia el espacio de nombres (conservando la sesión) y se vuelve a sembrar todo. La semilla contable (`seedAccountingConfig`) siembra, por empresa: el plan de cuentas ampliado, el mapa de cuentas precargado (la empresa `02` con al menos un rol sin mapear), las reglas de clasificación de ejemplo y la activación de las 9 plantillas base en la empresa `01`, con sus pruebas ejecutadas en la semilla.
- **Justificación**: los datos persistidos por la versión anterior tienen otra forma; migrarlos no aporta nada en un prototipo.

## R-14 · Documentos de ejemplo para simulación

- **Decisión**: los documentos canónicos de ejemplo (uno por plantilla base, más los negativos) viven en `src/data/jurisdictions/pe/sampleDocuments.js` como `CanonicalDocument` ya construidos, con `extraction.sourceFormat` variado (`XML`, `JSON`, `IMAGE`, `FORM`) para ejercitar el contrato del spec 002. Los mismos objetos alimentan los casos de prueba de las plantillas base.
- **Justificación**: la simulación no depende de la ingestión (spec 002), pero el contrato se prueba con datos realistas.

## R-15 · Auditoría

- **Decisión**: se reutiliza `buildAuditEvent` y `<tenantId>:auditLog` (append-only), con acciones nuevas: `ACCOUNT_MAPPING_SAVED`, `CLASSIFICATION_RULE_SAVED`, `CLASSIFICATION_RULE_STATUS_CHANGED`, `TEMPLATE_CREATED`, `TEMPLATE_DUPLICATED`, `TEMPLATE_DRAFT_SAVED`, `TEMPLATE_VERSION_CREATED`, `TEMPLATE_TESTS_RUN`, `TEMPLATE_ACTIVATED`, `TEMPLATE_DEACTIVATED` y `TEMPLATE_RETIRED`. Las acciones del modelo anterior que ya no aplican se eliminan de la lista permitida. Las acciones sobre plantillas `PACK` se registran en el tenant donde se activan.

## R-16 · Estado de partida del código (limpieza previa)

- **Decisión**: antes de este plan se eliminó el código construido sobre el modelo "compra/venta" (ver plan §Estado de partida). Se conservan como infraestructura agnóstica: `src/domain/ingestion/{money,fx,audit,periods,stateMachine,permissions}.js`, `src/services/ingestion/{serviceKit,demoService}.js`, `src/services/storage/*` y `src/hooks/useIngestionContext.js`. Esta feature crea `src/domain/accounting/` para el núcleo nuevo y no reintroduce nada del modelo anterior.
- **Justificación**: evitar que el implementador reutilice por error piezas con el modelo viejo.
