---
description: "Lista de tareas de implementación de 001 Ingestión de Comprobantes (incluye el motor de plantillas)"
---

# Tasks: Ingestión de Comprobantes, Bandeja de Asientos Borrador y Motor de Plantillas

**Entrada**: documentos de diseño de `specs/001-ingestion-comprobantes/`
**Prerrequisitos**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/services.md](contracts/services.md),
[contracts/comprobante-json.md](contracts/comprobante-json.md), [quickstart.md](quickstart.md)

**Regenerado el 2026-09-22** para incluir el motor de plantillas con reglas (HU-08 a HU-10,
RF-19 a RF-23, research R-20 a R-25). Las tareas ya hechas conservan su marca `[x]`. Se
**desmarcaron** solo las tareas hechas cuyo contenido cambia con el nuevo alcance:

- T015: el mapeo también incluye PL-07.
- T049 y T050: son las antiguas T034 y T035, pruebas de plantillas y traductor planos.

Los IDs se renumeraron para seguir el orden de ejecución.

**Pruebas**: se incluyen porque las exigen la constitución V (Vitest para todo el dominio) y la
definición de terminado de la spec. Se escriben **antes** de la implementación de cada historia y
deben fallar primero. Los componentes React no llevan pruebas automáticas.

**Organización**: una fase por historia de usuario (HU-01 a HU-10 → US1 a US10), en orden de
prioridad, más una fase fundacional del motor de plantillas que necesita la traducción.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: historia a la que pertenece (US1…US10).
- Rutas relativas a la raíz del repositorio. Estructura de un solo proyecto (`src/`), según
  plan §1.

## Reglas que aplican a TODAS las tareas

- Nada fuera de `src/services/storage/` usa `localStorage` (constitución I).
- `src/domain/ingestion/` y `src/domain/templates/` no importan React ni `services/`; reciben
  reloj, IDs y SHA-256 inyectados (constitución III). Las reglas se interpretan como datos
  JSON, sin `eval` ni `new Function`.
- Montos en céntimos enteros, tasas en milésimas y prorrateos en puntos básicos (R-01, R-21).
- Los servicios devuelven `{ ok, data }` o `{ ok: false, error: { code, message, details } }` y
  validan rol, empresa y periodo en el propio servicio ([contracts/services.md](contracts/services.md)).
- Textos para el usuario en español; identificadores del dominio en inglés (constitución VII).

---

## Phase 1: Setup (infraestructura compartida)

**Propósito**: herramientas de prueba y tipos base.

- [x] T001 Agregar `vitest` y `happy-dom` como `devDependencies` y el script `"test": "vitest run"` en package.json; ejecutar `npm install`
- [x] T002 Configurar Vitest en vite.config.js: bloque `test` con `environment: 'node'` e `include: ['src/**/__tests__/**/*.test.js']`, sin cambiar la configuración actual de React ni del puerto 5173
- [x] T003 [P] Crear src/domain/ingestion/types.js con los `@typedef` JSDoc de RawPayload, CanonicalDocument, FinancialLine, JournalEntry, EntryLine, PendingReason, TemplateVersion, IngestionBatch, AuditEvent, DemoSettings, NormalizedAccount e IngestionCtx, con los campos y enums de data-model.md §1 a §7

---

## Phase 2: Foundational (prerrequisitos que bloquean todo)

**Propósito**: repositorio único, persistencia del contexto existente, datos semilla corregidos,
identidad desde el login, dominio transversal (dinero, estados, permisos, periodos, auditoría) y
vistas vacías enrutadas.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta terminar esta fase y la Phase 2b.

### Pruebas de la fundación (primero, deben fallar)

- [x] T004 [P] Pruebas del repositorio en src/services/storage/**tests**/repository.test.js: claves `contableos:v1:<tenantId>:<colección>`; aislamiento entre empresas; las colecciones append-only (`rawPayloads`, `auditLog`) no exponen actualizar ni borrar; `upsertVersioned` rechaza con `CONFLICT` si `expectedVersion` no coincide; `QuotaExceededError` → error `STORAGE_FULL`; `clearNamespace({ keepSession: true })` borra todo `contableos:v1:*` salvo `global:session`; `usageBytes()`
- [x] T005 [P] Pruebas de accountingStore en src/services/storage/**tests**/accountingStore.test.js: guardar y cargar `empresas`, `chartOfAccounts` por empresa y `session` devuelve lo mismo; sin datos, `loadEmpresas` devuelve `null` y `loadChartOfAccounts` devuelve `null`
- [x] T006 [P] Pruebas de dinero en src/domain/ingestion/**tests**/money.test.js: `"847.46"` → 84746; rechaza 3 decimales, texto y vacío; half-up en .5; `withinTolerance(a, b, 1)`; `formatPEN(123456)` → `"S/ 1,234.56"` (plan §8.1)
- [x] T007 [P] Pruebas de la máquina de estados en src/domain/ingestion/**tests**/stateMachine.test.js: permitidas `DRAFT→PENDING_INPUT`, `DRAFT→PENDING_APPROVAL`, `PENDING_INPUT→DRAFT`, `PENDING_INPUT→CANCELLED`; cualquier otra, incluidas `CANCELLED→*` y `PENDING_APPROVAL→CANCELLED`, lanza o devuelve `INVALID_TRANSITION` (RF-14)
- [x] T008 [P] Pruebas de permisos en src/domain/ingestion/**tests**/permissions.test.js: mapeo `Maker`→MAKER, `Checker`→CHECKER, `Auditor`→AUDITOR, `Admin`→ADMIN, otro→UNKNOWN (R-13); la matriz completa rol × operación de contracts/services.md, con ADMIN igual a AUDITOR y UNKNOWN denegado en todo
- [x] T009 [P] Pruebas de periodos en src/domain/ingestion/**tests**/periods.test.js: `issueDate` → `{ ejercicio, mes }` y `accountingPeriod "YYYY-MM"`; 2026-09 ABIERTO → abierto; 2026-08 CERRADO → cerrado; mes ausente → no abierto; `isReadOnly(empresa, activePeriod)` es verdadero si el periodo activo está CERRADO (R-15)

### Implementación de la fundación

- [x] T010 Implementar src/services/storage/repository.js según R-07, R-08 y R-09: recibe un objeto tipo `Storage` (por defecto `window.localStorage`); expone `getCollection`, `setCollection`, `appendOnly(tenantId, name, items)`, `readAppendOnly`, `upsertVersioned(tenantId, name, entity, expectedVersion)`, `getGlobal`, `setGlobal`, `clearNamespace({ keepSession })` y `usageBytes`; traduce `QuotaExceededError` a `STORAGE_FULL`; no expone ninguna operación para modificar o borrar `rawPayloads` ni `auditLog` (hace pasar T004)
- [x] T011 [P] Implementar src/services/storage/memoryStorage.js: objeto en memoria con la interfaz de `Storage` (`getItem`, `setItem`, `removeItem`, `key`, `length`, `clear`) y una opción para simular `QuotaExceededError` al superar N bytes
- [x] T012 Implementar src/services/storage/accountingStore.js (R-18), síncrono, sobre repository.js: `loadEmpresas`, `saveEmpresas`, `loadChartOfAccounts(empresaId)`, `saveChartOfAccounts(empresaId, cuentas)`, `loadSession`, `saveSession`, `clearSession` (hace pasar T005)
- [x] T013 [P] Agregar a src/data/mockPlanContable.js las cuentas `61` "VARIACIÓN DE INVENTARIOS" y `611` "MERCADERÍAS" (sintéticas, `esCuentaU: false`), `6111101` "VARIACIÓN DE MERCADERÍAS" (de uso, `requiereCC: false`), `659` "OTROS GASTOS DE GESTIÓN" (sintética) y `6591101` "OTROS GASTOS DE GESTIÓN - DIVERSOS" (de uso, `requiereCC: true`, `amarre1: "9411101"`, `amarre2: "7911101"`, `amarre3: ""`), con los mismos campos que las cuentas vecinas (R-11, R-19)
- [x] T014 [P] Agregar a src/data/mockPlantillas.js la plantilla `PL-06` con `codigo: "COMPRA_OTROS_GASTOS_CC"`, `nombre: "Otros Gastos de Gestión por Centro de Costo"`, `tipoOperacion: "COMPRA"`, `cuentaBase: "6591101"`, `cuentaImpuesto: "4011101"`, `cuentaObligacion: "4212101"`, `aplicaIGV: true`, `tasaIGV: 0.18`, `requiereCC: true` y sin `ccDefault` (R-11)
- [x] T015 [P] Actualizar src/data/mockCategoriasPlantilla.js (ya existe) como **fuente de las activaciones iniciales** (R-11, CA-23.3): mapeo `TPL-COMPRA-01 → [PL-01]`, `TPL-SERV-01 → [PL-02, PL-03, PL-06, PL-07]` (**agrega PL-07**), `TPL-VENTA-01 → [PL-04, PL-05]`; exportar `templateIdsForActiveIds(plantillasActivasIds)` y mantener `categoriaDePlantilla(templateId)`, que ya usa demoService
- [x] T016 Implementar la siembra y el reinicio en src/services/ingestion/demoService.js (R-17, plan §7): `ensureSeeded(repo, clock)` siembra `empresas` desde mockEmpresas, `chartOfAccounts` por empresa desde mockPlanContable, `templates` globales v1 desde mockPlantillas (con `category`, `requiresCostCenter`, `defaultCostCenter` y `usageCount: 0`), `demoSettings` `{ fxServiceDown: false, latencyMs: 150, perItemLatencyMs: 40 }` y `meta { schemaVersion: 1, seededAt }` si falta `meta` o el esquema no coincide; `resetDemoData(ctx)` hace `clearNamespace({ keepSession: true })`, vuelve a sembrar y registra `DEMO_RESET`; `getDemoSettings(ctx)` devuelve también `storageUsageBytes`
- [x] T017 Modificar src/context/AccountingContext.jsx (R-10, R-13, R-15, R-18): llamar a `ensureSeeded` antes del primer render; inicializar `empresas`, `planesPorEmpresa` y `sesionUsuario` con `accountingStore` (si es `null`, usar la semilla actual); guardar con `saveEmpresas` y `saveChartOfAccounts` en `useEffect` cuando cambian; reemplazar los tres usos directos de `localStorage` de la sesión por `loadSession`, `saveSession` y `clearSession`; `iniciarSesion` reconoce además `revisor_luis` (rol `Checker`, "Luis Revisor") y `auditora_ana` (rol `Auditor`, "Ana Auditora"); exponer `recargarDesdeAlmacenamiento()`, que vuelve a leer empresas y catálogos; no cambiar la firma de ninguna función existente
- [x] T018 [P] Agregar en src/views/LoginView.jsx dos botones de acceso rápido, "Entrar como Checker" (`revisor_luis`) y "Entrar como Auditor" (`auditora_ana`), junto a los existentes, con el mismo estilo (CA-15.6)
- [x] T019 Modificar src/views/BackupsView.jsx: el botón "Reset a datos semilla" llama a `resetDemoData` de la fachada de ingestión y luego a `recargarDesdeAlmacenamiento()` del contexto, en lugar de `localStorage.clear()`; ajustar el texto de advertencia (conserva la sesión) (R-17)
- [x] T020 [P] Implementar src/domain/ingestion/money.js: `parseDecimalToCents`, `roundHalfUpDiv(numerator, denominator)`, `withinTolerance`, `sumCents`, `formatPEN`, `formatMoney(cents, currency)` (hace pasar T006)
- [x] T021 [P] Implementar src/domain/ingestion/stateMachine.js: tabla de transiciones permitidas de data-model §8 y `assertTransition(from, to)` que devuelve `INVALID_TRANSITION` (hace pasar T007)
- [x] T022 [P] Implementar src/domain/ingestion/permissions.js: `mapSessionRole(rol)`, la matriz de contracts/services.md y `can(role, operation)` (hace pasar T008)
- [x] T023 [P] Implementar src/domain/ingestion/periods.js: `toAccountingPeriod(issueDate)`, `isPeriodOpen(empresa, issueDate)` e `isReadOnly(empresa, activePeriod)` sobre `empresa.periodos` (hace pasar T009)
- [x] T024 [P] Implementar src/domain/ingestion/audit.js: `buildAuditEvent({ id, at, tenantId, traceId, userId, role, action, entityType, entityId, detail })` con la lista de acciones de data-model §7
- [x] T025 Implementar src/services/ingestion/serviceKit.js: `withLatency(settings)`, `validateCtx(ctx, repo)` (empresa conocida → si no, `VALIDATION_ERROR`), `authorize(ctx, operation)` (→ `FORBIDDEN` y evento `ACTION_DENIED`), `assertWritablePeriod(ctx, repo)` (lee la empresa persistida → `PERIOD_READ_ONLY` y `ACTION_DENIED`), `ok(data)`, `fail(code, message, details)`, y reloj e IDs inyectables (`crypto.randomUUID` por defecto)
- [x] T026 Crear src/services/ingestion/index.js como fachada pública: crea el repositorio por defecto y reexporta las operaciones de demoService; cada historia agrega aquí sus operaciones
- [x] T027 [P] Crear src/hooks/useIngestionContext.js: arma `{ tenantId: empresaActiva.id, userId: sesionUsuario.usuarioId, role: mapSessionRole(sesionUsuario.rol), activePeriod: { ejercicio: ejercicioActivo, nombrePeriodo: periodoActivo }, readOnly }` a partir de `useAccounting()`; `readOnly` es verdadero si el rol no es MAKER o si el periodo activo está CERRADO (R-13, CA-15.5)
- [x] T028 [P] Crear src/components/ingestion/ReadOnlyPeriodBanner.jsx: aviso "El periodo {periodo} está cerrado: la ingestión está en solo lectura", con los tokens de alerta de src/theme.css (CA-09.5)
- [x] T029 Crear las vistas mínimas src/views/IngestionView.jsx, src/views/BandejaView.jsx y src/views/PendientesAprobacionView.jsx (título y contenedor), agregar en src/components/Sidebar.jsx el grupo "INGESTIÓN" **solo en el menú del modo empresa** con `ingestion` [I1], `bandeja` [I2] y `pendientes` [I3] (íconos de lucide-react), y en src/App.jsx los tres casos de `renderView` y sus `tabTitles`

**Checkpoint**: `npm run build` y `npm test` en verde; se puede entrar con los 4 usuarios; el
catálogo, las empresas y la sesión sobreviven a F5; "Reset a datos semilla" funciona sin cerrar la
sesión; el módulo Compras con PL-01 ya no falla por 6111101; las tres vistas vacías aparecen en
el menú de la empresa.

---

## Phase 2b: Foundational — núcleo del motor de plantillas (bloquea la traducción)

**Propósito**: el modelo de plantillas con reglas (R-20), su validación, el evaluador (R-21),
el ejecutor de casos de prueba (R-22), la validación de cuentas (R-23), la semilla del banco
(PL-01..PL-07) y los permisos del Admin. La traducción de US1 usa el evaluador, así que esta fase
bloquea US1.

**⚠️ CRÍTICO**: US1 no puede empezar hasta terminar esta fase.

### Pruebas del núcleo (primero, deben fallar)

- [x] T030 [P] Crear src/domain/templates/types.js con los `@typedef` JSDoc de Template, TemplateVersion, TemplateDefaults, Rule, Condition (grupo, negación, comparación), DocumentAction, LineAction, SplitPart, TestCase, TestRunResult y TemplateActivation, con los campos, enums y restricciones de data-model.md §4.1 a §4.5
- [x] T031 [P] Pruebas de estructura en src/domain/templates/**tests**/schema.test.js: plantilla válida → sin errores; cada error de data-model §4.3–§4.4 devuelve su **ruta** (por ejemplo, `lineRules[0].when.args[1].field`): campo u operador desconocido, valor vacío, `between` con min > max, campo `line.*` en una regla de comprobante, grupo Y/O con menos de 2 argumentos, prioridad repetida en el grupo, acción vacía, `split` con una sola parte, `split` que suma 9999 o 10001, `split` combinado con `baseAccount`, cuenta vacía, `code` inválido, caso de prueba sin `expectedLines` (CA-19.5)
- [x] T032 [P] Pruebas de condiciones en src/domain/templates/**tests**/conditions.test.js: cada comparador (`contains`, `startsWith`, `equals`, `gt`, `gte`, `lt`, `lte`, `between`, `in`) sobre cada tipo de campo; texto sin distinguir mayúsculas ni tildes ("Fleté" contiene "FLETE"); Y/O/NO anidados en 3 niveles; campos de comprobante (`issuer.fiscalId`, `currency`, `totalCents`, `issueDate`, `operationType`) y de línea (`line.description`, `line.amountCents`, `line.taxCode`) (CA-19.3)
- [x] T033 [P] Pruebas del evaluador en src/domain/templates/**tests**/evaluator.test.js (R-21): sin reglas → `defaults`; gana la primera por `priority`; empate de prioridad imposible (lo impide el schema); una regla de comprobante cambia `taxAccount` y `counterpartAccount`; CC regla > plantilla > `amarre3`; etiquetas combinadas de comprobante y línea; reparto de la base PEN entre líneas con residuo a la última; prorrateo 6000/4000 de 10001 → 6000 y 4001; prorrateo de 1 céntimo en 3 partes → dos partes de 0 omitidas; agrupación de partes con igual lado, cuenta y CC; destinos por cada cuenta base con `amarre1` y `amarre2`; `ruleId` por línea, `sourceLineNos` y `appliedRules`; determinismo (misma entrada → misma salida); propiedad: Debe = Haber en 1,000 documentos pseudoaleatorios con reglas válidas aleatorias (semilla fija) (RF-20, RD-09)
- [x] T034 [P] Pruebas de cuentas de plantillas en src/domain/templates/**tests**/templateAccounts.test.js: `accountsUsed(version)` reúne las cuentas de `defaults`, de las acciones y de cada `split` sin repetir; `validateAccounts(version, index)` devuelve `NOT_FOUND` y `NOT_POSTABLE` por cuenta contra un catálogo normalizado (R-23, CA-19.6, CA-23.2)
- [x] T035 [P] Pruebas del ejecutor de casos en src/domain/templates/**tests**/testRunner.test.js: caso que pasa; monto distinto → falla; líneas en otro orden → pasa; asiento descuadrado → falla con `balanced: false`; cuenta inexistente en el PCGE → `accountErrors`; `uncoveredRuleIds` lista las reglas que no aplicaron en ningún caso; **todos los casos de todas las plantillas de src/data/mockPlantillasReglas.js pasan y cubren sus reglas con mockPlanContable** (constitución V)
- [x] T036 [P] Ampliar src/domain/ingestion/**tests**/permissions.test.js con las operaciones de plantillas de contracts/services.md: `LIST_TEMPLATE_BANK` para AUDITOR y ADMIN; `EDIT_TEMPLATES` (crear, guardar borrador, editar, eliminar borrador, probar, activar, retirar) y `SET_COMPANY_TEMPLATE_ACTIVATION` solo para ADMIN; MAKER y CHECKER sin acceso al banco; ADMIN sigue sin `INGEST`, `UPDATE_STAGING`, `REVALIDATE` ni `CANCEL` (CA-15.2b)

### Implementación del núcleo

- [x] T037 [P] Implementar src/domain/templates/schema.js: `validateTemplateVersion(version, { operationType })` y `validateTemplateHeader({ code, name, operationType, defaults })`, que devuelven `{ ok, errors: { path, message }[] }` con mensajes en español (hace pasar T031)
- [x] T038 [P] Implementar src/domain/templates/conditions.js: `normalizeText`, `readField(field, doc, line)` y `evaluateCondition(condition, doc, line)` según R-20 (hace pasar T032)
- [x] T039 Implementar src/domain/templates/evaluator.js: `evaluateTemplate({ version, document, functionalAmounts: { baseCents, igvCents, totalCents, lineBaseCents[] }, accountIndex })` → `{ lines: EntryLine[], appliedRules, analyticTags }` según R-21 (reglas de comprobante, luego de línea; prorrateo en puntos básicos; agrupación; destinos desde `accountIndex`; CC por prioridad); usa `conditions.js` y `money.js`; sin conocer tipos de cambio (recibe los montos PEN ya calculados) (hace pasar T033; depende de T038)
- [x] T040 [P] Implementar src/domain/templates/templateAccounts.js: `accountsUsed(version)` y `validateAccounts(version, accountIndex)`, reutilizando `buildAccountIndex` y `normalizeAccount` de src/domain/ingestion/accounts.js (hace pasar T034)
- [x] T041 Implementar src/domain/templates/testRunner.js: `runTestCases(version, pcgeIndex)` → `{ allPassed, uncoveredRuleIds, results[] }`; para cada caso calcula los montos PEN del documento (sin conversión: son casos en PEN), llama a `evaluateTemplate`, compara las líneas sin importar el orden (lado, cuenta, CC, monto), verifica el cuadre y valida cuentas con `validateAccounts` (hace pasar T035; depende de T039, T040)
- [x] T042 [P] Ampliar src/domain/ingestion/permissions.js con las operaciones `LIST_TEMPLATE_BANK`, `EDIT_TEMPLATES` y `SET_COMPANY_TEMPLATE_ACTIVATION` según la matriz de contracts/services.md, sin cambiar lo existente (hace pasar T036)
- [x] T043 [P] Crear src/data/mockPlantillasReglas.js (R-11, data-model §4.6): exporta `buildTemplateBankSeed(mockPlantillas, clock)`, que devuelve PL-01 a PL-06 como `Template` con una `version: 1` `ACTIVE` cuyos `defaults` salen de los campos planos (`cuentaBase`, `cuentaImpuesto`, `cuentaObligacion`, `aplicaIGV`, `requiereCC`, `ccDefault`), sin reglas y con **un caso de prueba** cada una (una línea de S/ 100.00 con IGV S/ 18.00 y sus `expectedLines` calculadas con los amarres del PCGE semilla); y **PL-07 "Servicios varios con reglas"** (compra; `defaults` 6591101 / 4011101 / 4212101, exige CC, CC por defecto CC-ADMIN) con las reglas de línea `R-FLETE`, `R-SERV-BASICOS` y `R-SEGUROS` de plan §3 y un caso por regla; todas con `lastTestRun` en verde, `createdBy: "SEED"` y `usageCount: 0`
- [x] T044 Actualizar src/services/ingestion/demoService.js: la siembra de `templates` (hoy en formato plano, T016) pasa a usar `buildTemplateBankSeed` (formato Template con `versions`); en `ensureSeeded`, si `global:templates` existe pero no tiene el formato nuevo (sin `versions`), se vuelve a sembrar solo el banco; `resetDemoData` lo siembra igual; las `templateActivations` **no** se siembran (migración perezosa, T059) (R-11, R-17)

**Checkpoint**: `npm test` en verde con las pruebas T031 a T036; el banco semilla tiene PL-01 a
PL-07, todas sus pruebas pasan y todas sus reglas están cubiertas.

---

## Phase 3: User Story 1 - Cargar un lote de facturas (Priority: P1) 🎯 MVP

**Goal**: el Maker sube facturas PEN (XML UBL o JSON) o elige ejemplos, con una plantilla
**activada para la empresa**, y obtiene asientos borrador generados por las reglas de la versión
activa y validados contra el catálogo y los periodos de la empresa, con un resumen del lote y
listas de fallidos y rechazados (HU-01; RF-01, RF-02, RF-04 a RF-09, RF-20).

**Independent Test**: como `contador_maria`, en PACHATUSANTREK / Setiembre 2026, cargar 3
compras PEN válidas con PL-01 → resumen con 3 pendientes de aprobación; cada asiento tiene
Debe 6011101 + 4011101 = Haber 4212101 y los amarres 2011101/6111101 del catálogo. Con PL-07, una
línea "FLETE…" va a 6311101 con CC-LOGISTICA y el detalle muestra la regla (quickstart escenarios
1, 7 a 13).

### Tests for User Story 1 ⚠️

- [x] T045 [P] [US1] Pruebas del parser JSON en src/domain/ingestion/**tests**/jsonInvoiceParser.test.js: el ejemplo de contracts/comprobante-json.md → CanonicalDocument esperado; JSON roto; cada obligatorio faltante; monto con 3 decimales; serie `F1-123` normalizada a `F001-00000123`; `tributo` EXO/INA
- [x] T046 [P] [US1] Pruebas del parser UBL en src/domain/ingestion/**tests**/ublInvoiceParser.test.js con `// @vitest-environment happy-dom`: factura UBL 2.1 válida (mapeo de R-05); raíz `CreditNote` → no soportado; `InvoiceTypeCode` 03 → no soportado; falta RUC del emisor; XML mal formado; bases con esquemas 1000/9997/9998
- [x] T047 [P] [US1] Pruebas de canonical y classify en src/domain/ingestion/**tests**/canonical.test.js y src/domain/ingestion/**tests**/classify.test.js: las 7 validaciones de data-model §2 en orden de precedencia; receptor = RUC de la empresa → COMPRA; emisor = RUC de la empresa → VENTA; ninguno → `REJECTED_NOT_TENANT`
- [x] T048 [P] [US1] Pruebas de cuentas en src/domain/ingestion/**tests**/accounts.test.js (R-16): normaliza `requiereCC`, `requiereCentroCostos`, ambos y ninguno; `amarre3` vacío → sin CC por defecto; solo `amarre1` → sin destino; reglas `ACCOUNT_NOT_FOUND`, `ACCOUNT_NOT_POSTABLE` y `MISSING_COST_CENTER` (por cuenta y por plantilla); CC por defecto: plantilla > `amarre3`
- [x] T049 [P] [US1] **Reescribir** src/domain/ingestion/**tests**/templates.test.js para la activación por empresa (R-11, data-model §4.5): migración perezosa desde `plantillasActivasIds` (`TPL-COMPRA-01` → PL-01; `TPL-SERV-01` → PL-02, PL-03, PL-06, PL-07; `TPL-VENTA-01` → PL-04, PL-05; lista vacía → sin activaciones); `offeredTemplates(bank, activations)` = activas para la empresa con versión `ACTIVE` y sin `retiredAt`; `resolveActiveVersion(bank, templateId)`; plantilla no ofrecida → `TEMPLATE_NOT_ACTIVE` (CA-01.2b, CA-01.2c, CA-23.3)
- [x] T050 [P] [US1] **Reescribir** src/domain/ingestion/**tests**/translator.test.js para el traductor con reglas: cada caso de prueba de las plantillas semilla PL-01 a PL-07 (mockPlantillasReglas) produce su asiento esperado con mockPlanContable; el mismo documento con dos catálogos (con y sin amarres) da asientos distintos; IGV 0 → sin línea de IGV; venta (contrapartida D, base H, IGV H); el asiento lleva `templateId`, `templateVersion`, `appliedRules` y `ruleId` por línea (RF-08, RF-20, RD-10)
      -- [x] T051 [P] [US1] Pruebas del validador en src/domain/ingestion/**tests**/validator.test.js: cada motivo solo (`UNBALANCED`, `INCONSISTENT_AMOUNTS`, `PERIOD_CLOSED`, `TEMPLATE_MISMATCH`, `MISSING_COST_CENTER`, `ACCOUNT_NOT_FOUND`, `ACCOUNT_NOT_POSTABLE`); varios a la vez; tolerancia 0.01 frente a 0.02 (R-03); amarre que apunta a una cuenta inexistente
- [x] T052 [P] [US1] Pruebas del pipeline en src/domain/ingestion/**tests**/pipeline.test.js con reloj e IDs fijos: resultado y secuencia de eventos para válido, archivo de más de 1 MB, dañado, faltante, otra empresa, periodo cerrado, montos inconsistentes, plantilla que no corresponde y falta de CC; con PL-07, un documento con líneas "FLETE" y "SEGURO" da las líneas y `appliedRules` esperados (RF-01..RF-09, RF-20, salvo duplicados y USD)
      -- [x] T053 [P] [US1] Pruebas de integración de ingestión en src/services/ingestion/**tests**/ingestionService.test.js con `memoryStorage` y latencia 0: `listTemplates` devuelve solo las activadas para la empresa con versión activa y crea las activaciones iniciales si no existen; empresa sin activaciones → `templates: []` y `companyHasActivations: false`; los ejemplos PEN del catálogo terminan en el estado y motivo esperados (CF-04 parcial); lote de 51 → `BATCH_TOO_LARGE` sin escrituras; lote vacío o sin plantilla → `VALIDATION_ERROR`; plantilla no activada o sin versión activa → `TEMPLATE_NOT_ACTIVE`; rol distinto de MAKER → `FORBIDDEN` con `ACTION_DENIED`; periodo activo CERRADO → `PERIOD_READ_ONLY`; `QuotaExceededError` → `STORAGE_FULL` con la evidencia intacta; id de otra empresa → `NOT_FOUND`; todo asiento en `PENDING_APPROVAL` cuadra (CF-03); `usageCount` de la versión usada sube

### Implementation for User Story 1

- [x] T054 [P] [US1] Implementar src/domain/ingestion/parsers/jsonInvoiceParser.js según contracts/comprobante-json.md (hace pasar T045)
- [x] T055 [P] [US1] Implementar src/domain/ingestion/parsers/ublInvoiceParser.js con `DOMParser` y namespaces UBL 2.1 según el mapeo de research.md R-05 (hace pasar T046)
- [x] T056 [US1] Implementar src/domain/ingestion/parsers/registry.js (Strategy): detecta xml, json o desconocido por extensión y contenido; formato desconocido → fallido "formato no soportado"; registrar parsers sin tocar el traductor (depende de T054, T055)
- [x] T057 [P] [US1] Implementar src/domain/ingestion/canonical.js y src/domain/ingestion/classify.js (hace pasar T047)
- [x] T058 [P] [US1] Implementar src/domain/ingestion/accounts.js: `normalizeAccount`, `buildAccountIndex(catalogo)`, `defaultCostCenter(template, baseAccount)` y `checkLineAccounts(lines, index, template)` (hace pasar T048)
- [x] T059 [P] [US1] **Reescribir** src/domain/ingestion/templates.js (hoy filtra por categorías): `initialActivations(empresa, clock)` (migración perezosa desde `plantillasActivasIds` con T015), `offeredTemplates(bank, activations)`, `resolveActiveVersion(bank, templateId)` y `assertTemplateOffered(...)` → `TEMPLATE_NOT_ACTIVE` (hace pasar T049; depende de T015)
- [x] T060 [US1] **Reescribir** src/domain/ingestion/translator.js para usar el evaluador: `translateToJournalEntry(document, { template, version }, accountIndex, deps)` calcula los montos PEN (en esta historia, solo PEN: base, IGV y total tal cual; reparto de la base entre líneas según R-21), llama a `evaluateTemplate` y arma el asiento con IGV (si es mayor que 0), contrapartida, líneas base y destinos, `templateId`, `templateVersion`, `appliedRules`, `role`, `lineNo`; punto de extensión para el tipo de cambio (en esta historia, USD → sin líneas y motivo `NO_FX_RATE`) (hace pasar T050; depende de T039, T058)
- [x] T061 [US1] Implementar src/domain/ingestion/validator.js: reúne todos los motivos (R-03 consistencia, cuadre, `isPeriodOpen`, `TEMPLATE_MISMATCH`, `checkLineAccounts`) y decide `PENDING_APPROVAL` o `PENDING_INPUT` con `stagedAt` (hace pasar T051; depende de T023, T058)
- [x] T062 [US1] Implementar src/domain/ingestion/pipeline.js: `processItem({ item, ctx, empresa, catalog, template, version, deps })` → `{ rawPayload, document?, entry?, events[], summaryDelta }` siguiendo los pasos 1, 2, 3, 6, 7 y 8 de plan §2 (el paso 4 de duplicados y el 5 de tipo de cambio se agregan en US2 y US5) (hace pasar T052)
- [x] T063 [P] [US1] Crear src/data/mockComprobantesDemo.js con los ejemplos PEN del quickstart: compra válida (PL-01), venta válida (PL-04), archivo dañado, dato obligatorio faltante, otra empresa, periodo cerrado (agosto 2026), montos inconsistentes, compra PEN para usar con PL-04 (plantilla no corresponde), 5 compras distintas para PL-06, y una compra con líneas "FLETE LIMA - CUSCO", "LUZ SETIEMBRE" y "SEGURO VEHICULAR" para PL-07; mezcla de XML UBL y JSON; RUC ficticios salvo los de las empresas semilla; cada ejemplo con `sampleId`, `title`, `expectedOutcome`, `fileName`, `contentType` y `content`
- [x] T064 [US1] Implementar src/services/ingestion/ingestionService.js: `listTemplates` (contracts §Catálogos: plantillas ofrecidas y `companyHasActivations`; crea `templateActivations` con `initialActivations` si no existen), `listSampleCatalog`, `ingestBatch` (validaciones del lote en el orden de contracts/services.md, incluido `TEMPLATE_NOT_ACTIVE`; lee una vez empresa, catálogo normalizado, plantilla y **versión activa**; procesa en orden con latencia por item; escrituras en el orden de R-08; incrementa `usageCount` de la versión; guarda `IngestionBatch`), `getBatch`, `listBatches`, `queryIntakeResults` y `getRawPayload`; exportarlas en src/services/ingestion/index.js (hace pasar T053)
- [x] T065 [P] [US1] Crear src/components/ingestion/BatchSummary.jsx: tarjetas con `MetricCard` para recibidos, aceptados, duplicados, fallidos, rechazados, en bandeja y pendientes de aprobación, más la tabla de items con archivo, resultado y motivo (CA-01.4)
- [x] T066 [P] [US1] Crear src/components/ingestion/EntryDetailModal.jsx sobre src/components/Modal.jsx: cabecera del documento, líneas del asiento (cuenta y su descripción tomada del catálogo, Debe, Haber, CC y **regla aplicada** o "por defecto"), totales Debe/Haber, plantilla y **versión**, motivos, y pestaña "Contenido original" con `getRawPayload` (CA-10.3, CA-02.4, CA-20.4)
- [x] T067 [US1] Completar src/views/IngestionView.jsx: selector de plantilla con `listTemplates` (nombre, tipo de operación y versión; si `companyHasActivations` es falso, aviso "Esta empresa no tiene plantillas activas; solicítelas al administrador" y Procesar desactivado), subida de varios archivos `.xml`/`.json` (lee el contenido y `sizeBytes`), selector múltiple del catálogo de ejemplos, botón Procesar con estado de carga, `BatchSummary` del último lote, pestañas Recibidos / Fallidos / Rechazados con `queryIntakeResults` y acceso a `EntryDetailModal`; si `readOnly`, `ReadOnlyPeriodBanner` y acciones desactivadas; muestra los errores de lote del servicio en español

**Checkpoint**: US1 funciona sola. Quickstart escenarios 1, 2, 7 a 13 dan el resultado esperado
en la vista de ingestión (los que van a la bandeja se ven en el resumen), además del ejemplo con
PL-07; pruebas T045 a T053 en verde.

---

## Phase 4: User Story 2 - Evitar duplicados (Priority: P1)

**Goal**: un comprobante ya recibido (misma empresa, RUC emisor, tipo, serie-número y fecha) se
guarda como evidencia marcada "duplicado" o "duplicado con diferencias", sin asiento nuevo
(HU-02; RF-03).

**Independent Test**: cargar la compra válida PEN dos veces → 1 asiento y 1 duplicado enlazado al
original; cargar el ejemplo "duplicado con diferencias" → alerta de totales (quickstart
escenarios 5, 6 y 14; CF-02).

### Tests for User Story 2 ⚠️

- [x] T068 [P] [US2] Pruebas de duplicados en src/domain/ingestion/**tests**/dedup.test.js: normalización de la clave (espacios, mayúsculas, ceros de la serie); misma clave → mismo hash; otra empresa → otro hash (CA-16.3); SHA-256 inyectado (usar `crypto.subtle` de Node)
- [x] T069 [P] [US2] Ampliar src/domain/ingestion/**tests**/pipeline.test.js y src/services/ingestion/**tests**/ingestionService.test.js: duplicado contra el índice; `DUPLICATE_WITH_DIFF` con total distinto; dos iguales en el mismo lote (CA-03.5); duplicado de un original cancelado o fallido; 5 cargas → 1 asiento y 4 duplicados (CF-02); evento `DUPLICATE_DETECTED`

### Implementation for User Story 2

- [x] T070 [US2] Implementar src/domain/ingestion/dedup.js: `buildDedupKey(tenantId, doc)` y `dedupHash(key, sha256)` (hace pasar T068)
- [x] T071 [US2] Agregar el paso 4 (duplicados) a src/domain/ingestion/pipeline.js: consulta el índice recibido y el conjunto de hashes del lote; `DUPLICATE` o `DUPLICATE_WITH_DIFF` con `duplicateOfDocumentId` y motivo "Total X difiere del original Y"; sin documento ni asiento (depende de T070)
- [x] T072 [US2] Actualizar src/services/ingestion/ingestionService.js: carga `dedupIndex` al inicio del lote, lo actualiza en memoria y lo escribe según R-08; `queryIntakeResults` filtra por `DUPLICATE` y `DUPLICATE_WITH_DIFF` (hace pasar T069)
- [x] T073 [P] [US2] Agregar a src/data/mockComprobantesDemo.js el ejemplo "duplicado con diferencias" (misma clave que la compra válida PEN, otro total) y el lote combinado del escenario 14
- [x] T074 [US2] Agregar a src/views/IngestionView.jsx la pestaña Duplicados: resultado, motivo, alerta destacada si es `DUPLICATE_WITH_DIFF` y enlace para abrir el documento original en `EntryDetailModal`

**Checkpoint**: US1 y US2 funcionan juntas y por separado; T068 y T069 en verde.

---

## Phase 5: User Story 3 - Trabajar la bandeja de excepciones (Priority: P1)

**Goal**: el Maker ve los asientos en bandeja con sus motivos, antigüedad y atraso, los completa
(CC, etiquetas), cambia la plantilla o los revalida, individualmente o en lote, con el catálogo,
los periodos y la **versión activa vigente** de la plantilla (HU-03; RF-10, RF-11, CA-11.3, R-24).

**Independent Test**: cargar 5 compras con PL-06 → 5 en bandeja por "Falta centro de costo";
seleccionarlas, asignar CC-ADMIN → las 5 pasan a pendiente de aprobación (quickstart escenario 12
e integración I-1 a I-4, I-11; CF-05).

### Tests for User Story 3 ⚠️

- [x] T075 [P] [US3] Pruebas de bandeja en src/domain/ingestion/**tests**/staging.test.js: acciones permitidas = intersección por motivos + cancelar; `INCONSISTENT_AMOUNTS` → solo cancelar; `TEMPLATE_INACTIVE` → cambiar plantilla o cancelar; campos prohibidos (montos, cuentas, fecha, datos del comprobante) → `VALIDATION_ERROR`; atraso con 48 h exactas = no y con 48 h + 1 min = sí (CA-10.4)
- [x] T076 [P] [US3] Pruebas de integración de bandeja en src/services/ingestion/**tests**/stagingService.test.js: `queryStaging` con filtros (motivo, operación, fechas, moneda, solo atrasados); `updateStagingEntries` en lote con resultados mixtos `ADVANCED`/`STILL_PENDING`/`CONFLICT` (CA-11.5); `expectedVersion` viejo → `CONFLICT` sin cambios (CA-11.6); acción no permitida por el motivo → `ACTION_NOT_ALLOWED_FOR_REASON`; catálogo cambiado en el repositorio + `revalidateEntries` → avanza (CA-08.5, CA-11.7); periodo reabierto en `empresas` + `revalidateEntries` → avanza; **con una versión 2 activa sembrada en el repositorio, `revalidateEntries` recalcula con la v2, actualiza `templateVersion` y emite `TEMPLATE_VERSION_CHANGED`**; **plantilla desactivada para la empresa o sin versión activa → `TEMPLATE_INACTIVE` sin tocar las líneas** (R-24); CHECKER, AUDITOR y ADMIN → `FORBIDDEN`; periodo activo CERRADO → `PERIOD_READ_ONLY`; `entityVersion` sube y los eventos `STAGING_UPDATED`/`TEMPLATE_CHANGED`/`REVALIDATED` quedan registrados

### Implementation for User Story 3

- [x] T077 [US3] Implementar src/domain/ingestion/staging.js: `allowedActions(pendingReasons)` (incluye `TEMPLATE_INACTIVE`), `applyStagingUpdate(entry, update)` (solo `costCenter`, `analyticTags`, `templateId`), `ageHours(stagedAt, now)` e `isOverdue(stagedAt, now)` (hace pasar T075)
- [x] T078 [US3] Agregar a src/domain/ingestion/pipeline.js la función `recomputeEntry({ entry, document, template, version, offered, catalog, empresa, deps })`: si la plantilla no está ofrecida para la empresa o no tiene versión activa → `PENDING_INPUT` con `TEMPLATE_INACTIVE` sin tocar las líneas; si no, repite los pasos 5 a 7 con la versión activa vigente, registra el cambio de versión (`TEMPLATE_VERSION_CHANGED`) y hace `PENDING_INPUT → DRAFT → (PENDING_APPROVAL | PENDING_INPUT)` con `assertTransition` (R-24; depende de T077)
- [x] T079 [US3] Implementar src/services/ingestion/stagingService.js: `queryStaging`, `getJournalEntry`, `updateStagingEntries` y `revalidateEntries` según contracts/services.md; en cada operación lee del repositorio el catálogo, la empresa (periodos), el banco de plantillas y las `templateActivations` vigentes; `upsertVersioned` por asiento; resultado por asiento; exportarlas en src/services/ingestion/index.js (hace pasar T076)
- [x] T080 [P] [US3] Crear src/data/mockIngestionSeed.js y extender `ensureSeeded` en src/services/ingestion/demoService.js: en la empresa 01, un comprobante con su evidencia, documento y asiento `PENDING_INPUT` por `MISSING_COST_CENTER` (plantilla PL-06 v1) con `stagedAt = seededAt − 72 h`, y sus eventos de auditoría
- [x] T081 [P] [US3] Crear src/components/ingestion/ReasonBadges.jsx: una etiqueta por motivo (incluido "Plantilla no activa") con el texto en español de data-model §3 y colores de src/theme.css
- [x] T082 [US3] Completar src/views/BandejaView.jsx: `MetricCard` por motivo y de atrasados; filtros (motivo, operación, fechas, moneda, solo atrasados); tabla con selección múltiple, antigüedad y marca de atrasado; acciones "Completar CC y etiquetas", "Cambiar plantilla" (solo las ofrecidas por `listTemplates`) y "Revalidar", habilitadas según `allowedActions` y el rol; resultado por asiento tras cada acción (incluido el aviso de cambio de versión); detalle con `EntryDetailModal`; recarga al recibir el evento `storage` del navegador (R-09); `ReadOnlyPeriodBanner` si `readOnly`

**Checkpoint**: US1, US2 y US3 funcionan; quickstart escenarios 10 a 13 e integración I-1 a I-4 y
I-11 correctos; T075 y T076 en verde.

---

## Phase 6: User Story 4 - Cancelar un documento (Priority: P2)

**Goal**: el Maker cancela un asiento de la bandeja con una justificación de al menos 10
caracteres; queda Cancelado y no se puede reactivar (HU-04; RF-12).

**Independent Test**: cancelar el asiento de "montos inconsistentes" con la justificación
"Proveedor anuló" → Cancelado; volver a subir el comprobante → duplicado (quickstart §5
"Cancelación").

### Tests for User Story 4 ⚠️

- [x] T083 [P] [US4] Ampliar src/services/ingestion/**tests**/stagingService.test.js con `cancelEntry`: justificación de menos de 10 caracteres (sin contar espacios al inicio y al final) → `VALIDATION_ERROR`; asiento en `PENDING_APPROVAL` o `CANCELLED` → `INVALID_TRANSITION`; `expectedVersion` viejo → `CONFLICT`; rol no MAKER → `FORBIDDEN`; éxito → `CANCELLED` con `cancellation { reason, by, at }` y evento `ENTRY_CANCELLED`

### Implementation for User Story 4

- [x] T084 [US4] Implementar `cancelEntry` en src/services/ingestion/stagingService.js y exportarla en src/services/ingestion/index.js (hace pasar T083)
- [x] T085 [US4] Agregar a src/views/BandejaView.jsx la acción "Cancelar" (individual) con un `Modal` que pide la justificación, valida el mínimo en la UI y muestra el error del servicio

**Checkpoint**: US4 funciona sin afectar a US1 a US3; T083 en verde.

---

## Phase 7: User Story 5 - Facturas en dólares (Priority: P2)

**Goal**: las facturas en USD se convierten a PEN con la tasa venta de la fecha de emisión,
redondeando una sola vez (total e IGV; base derivada y repartida entre líneas y prorrateos según
R-21). Si el servicio está caído o no hay tasa del día, se usa la anterior, marcada provisional;
sin ninguna tasa previa, el asiento va a la bandeja (HU-05; RF-07).

**Independent Test**: cargar la compra USD con el servicio disponible y luego con el interruptor
de caída activado; comparar la tasa, los montos en PEN y la marca provisional (quickstart
escenarios 3 y 4; ejemplo de plan §3: 375100 / 57218 / 317882).

### Tests for User Story 5 ⚠️

- [x] T086 [P] [US5] Pruebas de tipo de cambio en src/domain/ingestion/**tests**/fx.test.js: tasa exacta; fin de semana → anterior y provisional; servicio caído → anterior a la fecha de emisión y provisional; sin tasa previa → `NO_FX_RATE`; ejemplo de plan §3; propiedad: Debe = Haber en 1,000 facturas USD pseudoaleatorias con semilla fija, **incluidas plantillas con prorrateo** (RNF-01, RD-09, R-21)
- [x] T087 [P] [US5] Ampliar src/domain/ingestion/**tests**/translator.test.js y src/services/ingestion/**tests**/ingestionService.test.js: asiento USD con `originalAmountCents`, `functionalAmountCents` y `fx { rateMilli, rateDate, provisional }`; el ejemplo de plan §3 con PL-07 (regla `R-FLETE`) da exactamente las líneas del JSON de plan §3; `setFxServiceDown` cambia el resultado; `revalidateEntries` de un asiento `NO_FX_RATE` avanza cuando hay tasa

### Implementation for User Story 5

- [x] T088 [P] [US5] Crear src/data/mockTiposCambio.js: tasas venta USD→PEN en milésimas por día hábil, de 2026-06-01 a 2026-09-30, sin fines de semana, con valores realistas cercanos a 3.75, incluidos 2026-09-14 = 3751 y 2026-09-15 = 3750 (R-12)
- [x] T089 [US5] Implementar src/domain/ingestion/fx.js: `resolveRate(rates, date, serviceDown)` según las 4 reglas de R-12 y `convert(cents, rateMilli)` con aritmética entera half-up (R-02) (hace pasar T086)
- [x] T090 [US5] Integrar el tipo de cambio en src/domain/ingestion/translator.js y src/domain/ingestion/pipeline.js (paso 5): convertir total e IGV, base PEN = total − IGV, repartir la base PEN entre líneas en proporción al monto original (residuo a la última) antes de llamar a `evaluateTemplate`, `originalAmountCents` en las líneas base, `provisionalFxRate`, motivo `NO_FX_RATE` si no hay tasa; `recomputeEntry` vuelve a resolver la tasa (R-02, R-21; depende de T089)
- [x] T091 [US5] Extender src/services/ingestion/demoService.js: sembrar `fxRates` globales desde mockTiposCambio y agregar `setFxServiceDown(ctx, { down })`; pasar las tasas y `fxServiceDown` a ingestionService.js y stagingService.js; exportar en src/services/ingestion/index.js (hace pasar T087)
- [x] T092 [P] [US5] Agregar a src/data/mockComprobantesDemo.js la compra USD del ejemplo de plan §3 (F001-00000456, 2026-09-15, USD 1,000.00, línea "Flete Cusco - Puno", para PL-02 o PL-07) y una compra USD con fecha anterior a la primera tasa (para `NO_FX_RATE`)
- [x] T093 [P] [US5] Crear src/components/ingestion/DemoControls.jsx: interruptor "Simular caída del servicio de tipo de cambio", botón "Reiniciar datos de demostración" con confirmación (llama a `resetDemoData` y a `recargarDesdeAlmacenamiento()`) y el uso de almacenamiento en KB; integrarlo en src/views/IngestionView.jsx (CA-18.2, CA-18.3)
- [x] T094 [US5] Mostrar en src/components/ingestion/EntryDetailModal.jsx la moneda original, el monto original por línea, la tasa, su fecha y la marca "tasa provisional" (CA-07.5)

**Checkpoint**: US5 funciona; quickstart escenarios 3 y 4 correctos; T086 y T087 en verde.

---

## Phase 8: User Story 6 - Ver la trazabilidad de un documento (Priority: P2)

**Goal**: el Auditor (y el Admin) ve en una sola vista la evidencia original, el documento
interpretado, la plantilla, la versión y las reglas aplicadas, el asiento y cada evento con fecha,
usuario real de la sesión y rol; nadie puede modificar el historial (HU-06; RF-17, CA-20.4).

**Independent Test**: como `auditora_ana`, abrir el historial del asiento del escenario 12 →
recepción → interpretación → borrador → bandeja → cambio del Maker (`contador_maria`) →
pendiente, con el mismo código de seguimiento; intentar cancelar → denegado y registrado (CF-06,
CF-07).

### Tests for User Story 6 ⚠️

- [x] T095 [P] [US6] Pruebas de trazabilidad en src/services/ingestion/**tests**/traceService.test.js: `getTraceability` devuelve evidencia, documento, asiento (con `appliedRules`), plantilla y **la versión usada** y eventos en orden ascendente con el `userId` de la sesión, incluido `TEMPLATE_VERSION_CHANGED` si hubo recálculo; CHECKER solo accede si el asiento está en `PENDING_APPROVAL`; `traceId` de otra empresa → `NOT_FOUND`; los intentos denegados de otras operaciones aparecen como `ACTION_DENIED` sin cambiar datos (CF-07)

### Implementation for User Story 6

- [x] T096 [US6] Implementar src/services/ingestion/traceService.js con `getTraceability(ctx, { traceId })` (incluye la `TemplateVersion` exacta del asiento, leída del banco) y exportarla en src/services/ingestion/index.js (hace pasar T095)
- [x] T097 [P] [US6] Crear src/components/ingestion/TraceabilityModal.jsx: línea de tiempo con fecha, usuario, rol, acción en español y detalle; secciones con la evidencia original, el documento estándar, la plantilla con su versión y las reglas aplicadas por línea, y el asiento; solo lectura
- [x] T098 [US6] Agregar la acción "Ver trazabilidad" en las filas de src/views/IngestionView.jsx y src/views/BandejaView.jsx, visible según el permiso de `getTraceability` para el rol

**Checkpoint**: US6 funciona; control transversal "Trazabilidad" y "Rol Auditor/Admin" del
quickstart correctos; T095 en verde.

---

## Phase 9: User Story 7 - Consultar pendientes de aprobación (Priority: P3)

**Goal**: Maker, Checker, Auditor y Admin ven en solo lectura los asientos pendientes de
aprobación de la empresa, con la marca "requiere revisión humana" si la tasa es provisional; nada
pasa al Libro Diario (HU-07; RF-13).

**Independent Test**: como `revisor_luis`, abrir [I3] → lista en solo lectura con el asiento USD
provisional marcado; ninguna acción disponible; Libros Contables sin cambios (quickstart §5 "Rol
Checker").

### Tests for User Story 7 ⚠️

- [x] T099 [P] [US7] Pruebas en src/services/ingestion/**tests**/approvalQueryService.test.js: `queryPendingApproval` devuelve solo `PENDING_APPROVAL` de la empresa con `requiresHumanReview = provisionalFxRate`; filtro `provisionalOnly`; UNKNOWN → `FORBIDDEN`; ninguna operación de la fachada escribe en los vouchers del `AccountingContext` (CA-13.3)

### Implementation for User Story 7

- [x] T100 [US7] Implementar src/services/ingestion/approvalQueryService.js con `queryPendingApproval` y exportarla en src/services/ingestion/index.js (hace pasar T099)
- [x] T101 [US7] Completar src/views/PendientesAprobacionView.jsx: tabla en solo lectura (código de seguimiento, operación, contraparte, serie-número, fecha, total original y en PEN, plantilla y versión, marca "requiere revisión humana"), filtro de tasa provisional, detalle con `EntryDetailModal` y trazabilidad con `TraceabilityModal` según el rol

**Checkpoint**: US1 a US7 funcionan por separado; T099 en verde.

---

## Phase 10: User Story 8 - Crear y probar una plantilla con reglas (Priority: P2)

**Goal**: el Admin crea en el banco global una plantilla con reglas de comprobante y de línea
(condiciones Y/O/NO; acciones sobre cuentas, CC, etiquetas y prorrateo) mediante formularios, le
agrega casos de prueba, la prueba y solo la puede activar con todo en verde y cada regla cubierta
(HU-08; RF-19, RF-21, CA-15.2b).

**Independent Test**: como `admin_pedro`, crear "COMPRA_ALQUILERES" con una regla de prorrateo
70/30, intentar activarla sin casos (se rechaza), agregar un caso de S/ 100.01, probar (partes
70.00 y 30.01, en verde) y activar (quickstart P-1 a P-6; CF-09, CF-10).

### Tests for User Story 8 ⚠️

- [x] T102 [P] [US8] Pruebas del ciclo de vida (creación y activación) en src/domain/templates/**tests**/lifecycle.test.js: `createTemplate` → `DRAFT v1`; `saveDraft` solo sobre `DRAFT` (si no → `TEMPLATE_NOT_EDITABLE`) y actualiza `updatedAt`; `canActivate` exige `lastTestRun` posterior a `updatedAt`, `allPassed`, `uncoveredRuleIds` vacío, al menos un caso y cuentas válidas en el PCGE (cada falta → `TEMPLATE_NOT_READY` con su detalle); `activate` pasa el `DRAFT` a `ACTIVE` y la `ACTIVE` anterior a `RETIRED`; una sola `ACTIVE` por plantilla (R-22)
- [x] T103 [P] [US8] Pruebas de integración del banco en src/services/ingestion/**tests**/templateService.test.js con `memoryStorage`: `listTemplateBank` y `getTemplate`; `createTemplate` con `code` repetido → `TEMPLATE_INVALID`; `saveTemplateDraft` inválido → `TEMPLATE_INVALID` con rutas; cuentas inexistentes en el PCGE → `data.accountErrors` sin impedir guardar; `runTemplateTests` guarda `lastTestRun`; `activateTemplateVersion` sin pruebas vigentes → `TEMPLATE_NOT_READY`, y con pruebas en verde → `ACTIVE` (CF-10); `deleteTemplateDraft`; MAKER, CHECKER y AUDITOR → `FORBIDDEN` en las escrituras, y AUDITOR puede leer; eventos en `contableos:v1:global:auditLog` (`TEMPLATE_CREATED`, `TEMPLATE_DRAFT_UPDATED`, `TEMPLATE_TESTS_RUN`, `TEMPLATE_VERSION_ACTIVATED`)

### Implementation for User Story 8

- [x] T104 [US8] Implementar src/domain/templates/lifecycle.js: `createTemplate(header, actor, clock)`, `saveDraft(template, version, draft, actor, clock)`, `canActivate(version, pcgeIndex)` → `{ ok, missing[] }`, `activate(template, version, actor, clock)` y `deleteDraft(template, version)` (hace pasar T102; depende de T037, T041)
- [x] T105 [US8] Implementar src/services/ingestion/templateService.js con `listTemplateBank`, `getTemplate`, `createTemplate`, `saveTemplateDraft`, `deleteTemplateDraft`, `runTemplateTests` y `activateTemplateVersion` según contracts/services.md §Banco de plantillas (lee y escribe `global:templates`, usa el PCGE semilla normalizado y audita en `global:auditLog`); exportarlas en src/services/ingestion/index.js (hace pasar T103)
- [x] T106 [P] [US8] Crear src/components/templates/ConditionBuilder.jsx: filas campo–operador–valor, con el operador y el control de valor según el tipo del campo (texto, monto en soles convertido a céntimos, fecha, lista, rango); grupos Y/O agregables y anidables; interruptor NO; campos `line.*` ocultos en las reglas de comprobante (CA-19.3)
- [x] T107 [P] [US8] Crear src/components/templates/ActionEditor.jsx y src/components/templates/SplitEditor.jsx: acciones de comprobante (cuenta de IGV, contrapartida, CC por defecto, etiquetas) y de línea (cuenta base, CC, etiquetas o prorrateo); selector de cuentas de uso del PCGE semilla; prorrateo con porcentajes (dos decimales, convertidos a puntos básicos), suma en vivo y bloqueo si no suma 100 % (CA-19.4, CA-19.5)
- [x] T108 [US8] Crear src/components/templates/RuleList.jsx: reglas de comprobante y de línea con nombre, prioridad (subir y bajar), agregar, duplicar y eliminar; usa `ConditionBuilder` y `ActionEditor`; muestra los errores de `validateTemplateVersion` junto a la regla (depende de T106, T107)
- [x] T109 [P] [US8] Crear src/components/templates/TestCasesPanel.jsx: alta y edición de casos (emisor, receptor, fecha, líneas con descripción, monto y tributo; IGV y total calculados con opción de editar) y de las líneas esperadas; botón "Probar" (`runTemplateTests`) con el resultado por caso (asiento obtenido frente al esperado, cuadre, reglas aplicadas) y la lista de reglas sin cubrir (CA-21.1, CA-21.2)
- [x] T110 [US8] Crear src/components/templates/TemplateEditor.jsx: cabecera (código, nombre, tipo de operación), `defaults`, pestañas "Reglas" (`RuleList`) y "Casos de prueba" (`TestCasesPanel`), "Guardar borrador" (`saveTemplateDraft`, con los errores de estructura y de cuentas), "Activar" (`activateTemplateVersion`, que muestra qué falta si responde `TEMPLATE_NOT_READY`) y "Eliminar borrador"; en solo lectura si la versión no es `DRAFT` o el rol no es ADMIN (depende de T108, T109)
- [x] T111 [US8] Crear src/views/PlantillasGlobalesView.jsx: lista del banco (`listTemplateBank`) con código, nombre, tipo, versión activa, borrador, estado y uso; "Nueva plantilla" (`createTemplate`); abre `TemplateEditor`; solo lectura para AUDITOR; y en src/App.jsx apuntar la ruta `plantillas_globales` a esta vista (R-25)

**Checkpoint**: US8 funciona; quickstart P-1 a P-6 correctos; T102 y T103 en verde.

---

## Phase 11: User Story 9 - Versionar una plantilla sin afectar lo ya registrado (Priority: P2)

**Goal**: editar una versión activa o retirada crea una nueva versión en borrador; activarla
retira la anterior con un resumen de diferencias, y los asientos existentes conservan su versión.
También se puede retirar una plantilla sin reemplazo (HU-09; RF-22).

**Independent Test**: como Admin, editar PL-07 (activa) → v2 en borrador; cambiar una regla,
probar y activar → v1 retirada con diferencias; los asientos anteriores muestran "versión 1"
(quickstart P-10 y P-11; CF-11).

### Tests for User Story 9 ⚠️

- [x] T112 [P] [US9] Pruebas de diferencias en src/domain/templates/**tests**/diff.test.js: cambio de cuenta o CC en una regla, regla agregada o quitada, prioridad cambiada, `defaults` cambiados y casos agregados, cada uno como texto legible en español; sin cambios → lista vacía (CA-22.3)
- [x] T113 [P] [US9] Ampliar src/domain/templates/**tests**/lifecycle.test.js y src/services/ingestion/**tests**/templateService.test.js: `editTemplate` sobre una `ACTIVE` → `DRAFT v(max+1)` con `basedOnVersion` y el mismo contenido, y si ya existe un `DRAFT` lo devuelve; activar la v2 → la v1 queda `RETIRED` con `diffFromPrevious` en la v2; los asientos ya guardados conservan `templateVersion: 1` (CF-11); `retireTemplate` → sin versión activa y fuera de `listTemplates` de todas las empresas; `activateTemplateVersion` sobre una plantilla retirada la reactiva y limpia `retiredAt`; eventos `TEMPLATE_DRAFT_CREATED` y `TEMPLATE_RETIRED`

### Implementation for User Story 9

- [x] T114 [US9] Implementar src/domain/templates/diff.js: `diffVersions(previous, next)` → `string[]` (hace pasar T112)
- [x] T115 [US9] Ampliar src/domain/templates/lifecycle.js (`editTemplate`, `retireTemplate`, `diffFromPrevious` al activar) y src/services/ingestion/templateService.js (`editTemplate`, `retireTemplate`); exportarlas en src/services/ingestion/index.js (hace pasar T113; depende de T114)
- [x] T116 [US9] Crear src/components/templates/VersionHistory.jsx (versiones con estado, quién y cuándo activó, diferencias y uso) e integrarlo en src/components/templates/TemplateEditor.jsx con los botones "Editar (nueva versión)" y "Retirar plantilla" (con confirmación)

**Checkpoint**: US9 funciona; quickstart P-10 a P-12 correctos (P-12 usa el recálculo de US3);
T112 y T113 en verde.

---

## Phase 12: User Story 10 - Activar plantillas por empresa (Priority: P2)

**Goal**: dentro de una empresa, el Admin activa o desactiva las plantillas del banco con versión
activa, viendo las advertencias de cuentas contra el catálogo de esa empresa; el Maker solo ve las
activadas (HU-10; RF-23).

**Independent Test**: como Admin en PACHATUSANTREK, activar COMPRA_ALQUILERES (sin
advertencias) y una plantilla con una cuenta eliminada del catálogo (con advertencia); como Maker,
verla en el selector; desactivar PL-06 y revalidar un asiento con PL-06 → "Plantilla no activa"
(quickstart P-7, P-8, P-13, I-9, I-10).

### Tests for User Story 10 ⚠️

- [x] T117 [P] [US10] Ampliar src/services/ingestion/**tests**/templateService.test.js con las activaciones: `listCompanyTemplateActivations` crea las activaciones iniciales si no existen y recalcula `accountWarnings` contra el catálogo vigente de la empresa; `setCompanyTemplateActivation` activa con advertencias sin bloquear, desactiva, y responde `TEMPLATE_NOT_ACTIVE` si la plantilla no tiene versión activa; el cambio se refleja en `listTemplates` de esa empresa y de ninguna otra (RF-16); solo ADMIN (los demás → `FORBIDDEN`, AUDITOR puede listar); no exige periodo abierto; eventos `TEMPLATE_COMPANY_ACTIVATED`/`TEMPLATE_COMPANY_DEACTIVATED` en el `auditLog` de la empresa

### Implementation for User Story 10

- [x] T118 [US10] Implementar `listCompanyTemplateActivations` y `setCompanyTemplateActivation` en src/services/ingestion/templateService.js, usando `initialActivations` (src/domain/ingestion/templates.js) y `validateAccounts` (src/domain/templates/templateAccounts.js) con el catálogo de `ctx.tenantId`; exportarlas en src/services/ingestion/index.js (hace pasar T117)
- [x] T119 [P] [US10] Crear src/components/templates/AccountWarnings.jsx: lista de cuentas con el problema ("no existe en el catálogo de la empresa" o "no es cuenta de uso"), con enlace para abrir el Catálogo de Cuentas
- [x] T120 [US10] Crear src/views/PlantillasEmpresaView.jsx: plantillas del banco con versión activa, interruptor Activa/Inactiva (`setCompanyTemplateActivation`), versión, tipo y `AccountWarnings`; solo lectura para AUDITOR; para MAKER, lista de solo lectura de las activas; en src/App.jsx apuntar la ruta `plantillas` a esta vista y **eliminar src/views/PlantillasView.jsx**, que ya no tiene rutas (R-25)

**Checkpoint**: todas las historias funcionan por separado; T117 en verde.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Propósito**: verificación final y ajustes que afectan a varias historias.

- [x] T121 Revisar que ningún archivo fuera de src/services/storage/ use `localStorage` (buscar en `src/`), que src/domain/ingestion/ y src/domain/templates/ no importen React ni `services/`, y que no haya `eval` ni `new Function`; corregir cualquier desvío (constitución I, III y VI)
- [x] T122 [P] Revisar todos los textos visibles y mensajes de error de src/views/IngestionView.jsx, src/views/BandejaView.jsx, src/views/PendientesAprobacionView.jsx, src/views/PlantillasGlobalesView.jsx, src/views/PlantillasEmpresaView.jsx, src/components/ingestion/ y src/components/templates/ para que estén en español claro e indiquen qué dato falló (RNF-05)
- [x] T123 [P] Medir con latencia por defecto un lote de 20 ejemplos en src/views/IngestionView.jsx y confirmar un resumen en menos de 5 s (RNF-02); ajustar `perItemLatencyMs` si hace falta
- [x] T124 [P] Actualizar AGENTS.md (constitución en `.specify/memory/constitution.md`; Vitest instalado y `npm test`; identidad desde el login, sin selector; carpeta `src/domain/templates/`; el Admin administra plantillas) y README.md (usuarios de demo, ingestión, banco de plantillas, "Reset a datos semilla"); anotar en specs/empresas/spec.md, en RF-106, que lo implementa `specs/001-ingestion-comprobantes`
- [x] T125 Ejecutar `npm run build` y `npm test` y corregir cualquier fallo
- [x] T126 Ejecutar completo specs/001-ingestion-comprobantes/quickstart.md (escenarios 1 a 14, integración I-1 a I-11, motor de plantillas P-1 a P-14 y controles transversales, incluidos "Módulos existentes" y "Persistencia"); registrar y corregir cualquier desvío

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. ✅ Hecha.
- **Foundational (Phase 2)**: depende de Setup. ✅ Hecha salvo T015.
- **Motor de plantillas, núcleo (Phase 2b)**: depende de Phase 2; **bloquea US1** (la traducción
  usa el evaluador) y las historias de plantillas.
- **US1 (Phase 3)**: depende de Phase 2 y 2b. Es la base del pipeline.
- **US2 (Phase 4)**: depende de US1 (extiende `pipeline.js` e `ingestionService.js`).
- **US3 (Phase 5)**: depende de US1 (necesita asientos en la bandeja). Es independiente de US2.
- **US4 (Phase 6)**: depende de US3 (`stagingService.js`, `BandejaView.jsx`).
- **US5 (Phase 7)**: depende de US1 (traductor y pipeline) y, para revalidar, de US3 (`recomputeEntry`).
- **US6 (Phase 8)**: depende de US1; se aprovecha mejor con US3 (eventos del Maker).
- **US7 (Phase 9)**: depende de US1.
- **US8 (Phase 10)**: depende de Phase 2b. Es independiente de US1 para el banco; para el caso
  de extremo a extremo (P-9) necesita US1 y US10.
- **US9 (Phase 11)**: depende de US8 (`lifecycle.js`, `templateService.js`, `TemplateEditor.jsx`);
  P-12 necesita US3.
- **US10 (Phase 12)**: depende de US8 (servicio del banco) y de US1 (`templates.js`, `listTemplates`).
- **Polish (Phase 13)**: depende de las historias que se entreguen.

### Grafo de historias

```text
Setup → Foundational → 2b Motor (núcleo) ─┬─► US1 ─┬─► US2
                                          │        ├─► US3 ─┬─► US4
                                          │        │        └─► US5 (revalidación)
                                          │        ├─► US6
                                          │        └─► US7
                                          └─► US8 ─┬─► US9
                                                   └─► US10 (también requiere US1)
```

### Dentro de cada historia

- Pruebas primero; deben fallar antes de implementar.
- Dominio → servicios → componentes → vista.
- Las tareas que editan el mismo archivo van en secuencia: `pipeline.js`, `translator.js`,
  `ingestionService.js`, `stagingService.js`, `templateService.js`, `lifecycle.js`,
  `IngestionView.jsx`, `BandejaView.jsx`, `TemplateEditor.jsx`, `App.jsx` e `index.js`.

### Parallel Opportunities

- Phase 2b: T030 a T036 en paralelo; luego T037, T038, T040, T042 y T043 en paralelo; T039
  después de T038; T041 después de T039 y T040; T044 después de T043.
- US1: todas las pruebas T049, T050, T052 y T053 en paralelo; T054, T055, T057, T058, T059,
  T063, T065 y T066 en paralelo.
- Después de US1: US2, US3, US6 y US7 en paralelo si hay varias personas.
- Después de 2b: US8 puede avanzar en paralelo con US1.
- US8: T106, T107 y T109 en paralelo (componentes distintos).

---

## Parallel Example: Phase 2b

```bash
# Pruebas del núcleo en paralelo:
Task: "Pruebas de estructura en src/domain/templates/__tests__/schema.test.js"
Task: "Pruebas de condiciones en src/domain/templates/__tests__/conditions.test.js"
Task: "Pruebas del evaluador en src/domain/templates/__tests__/evaluator.test.js"
Task: "Pruebas de cuentas de plantillas en src/domain/templates/__tests__/templateAccounts.test.js"
Task: "Pruebas del ejecutor de casos en src/domain/templates/__tests__/testRunner.test.js"

# Implementación en paralelo:
Task: "Implementar src/domain/templates/schema.js"
Task: "Implementar src/domain/templates/conditions.js"
Task: "Implementar src/domain/templates/templateAccounts.js"
Task: "Crear src/data/mockPlantillasReglas.js"
```

## Parallel Example: después de 2b y US1

```bash
Developer A: US2 (T068–T074) y US3 (T075–T082), luego US4 (T083–T085)
Developer B: US8 (T102–T111), luego US9 (T112–T116) y US10 (T117–T120)
Developer C: US5 (T086–T094), US6 (T095–T098) y US7 (T099–T101)
```

---

## Implementation Strategy

### MVP First

1. Phase 1 y Phase 2 (hechas, salvo T015).
2. Phase 2b: núcleo del motor de plantillas (el traductor ya usa reglas desde el MVP).
3. Phase 3: US1.
4. **Parar y validar**: quickstart escenarios 1, 2, 7 a 13 y el ejemplo con PL-07, más
   `npm test`.
5. Hacer la demo.

### Incremental Delivery

1. Setup + Foundational + 2b → base y motor listos.
2. US1 → carga con reglas y validación contra el catálogo (MVP).
3. US2 → sin duplicados.
4. US3 → bandeja operativa con la versión vigente (cierra las historias P1).
5. US8 → el Admin crea y prueba plantillas.
6. US10 → activación por empresa (el Maker usa plantillas nuevas).
7. US9 → versionado sin afectar lo registrado.
8. US4 + US5 + US6 → cancelación, dólares y trazabilidad.
9. US7 → vista del Checker (P3).
10. Polish → quickstart completo.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Cada tarea cita los requisitos o decisiones (RF, CA, R-xx) que debe cumplir; ante una duda, la
  fuente es el documento de diseño indicado.
- Los archivos `src/domain/ingestion/templates.js` y `src/domain/ingestion/translator.js` ya
  existen en versión plana (filtro por categorías y cuentas fijas). T059 y T060 los reescriben;
  sus pruebas planas se reemplazan en T049 y T050.
- Hacer commit después de cada tarea o grupo lógico, en la rama `001-ingestion-comprobantes`.
- No modificar Compras, Ventas, Tesorería, Conciliación ni Libros (constitución VII); los únicos
  archivos existentes que cambian son los de plan §1 "archivos existentes que cambian".
