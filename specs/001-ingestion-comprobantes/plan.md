# Plan de Implementación: Ingestión de Comprobantes y Bandeja de Asientos Borrador

**Rama**: `001-ingestion-comprobantes` | **Fecha**: 2026-09-21 (revisado el mismo día por integración) | **Spec**: [spec.md](spec.md)
**Entrada**: especificación de `specs/001-ingestion-comprobantes/spec.md` (con las 16 aclaraciones del 2026-09-21 y 2026-09-22)
**Constitución**: v1.0.0 (`docs/constitution.md`)
**Specs relacionadas (existentes)**: `specs/empresas/`, `specs/catalogo-cuentas/`

**Artefactos de este plan**: [research.md](research.md) (decisiones R-01 a R-25) ·
[data-model.md](data-model.md) · [contracts/services.md](contracts/services.md) ·
[contracts/comprobante-json.md](contracts/comprobante-json.md) · [quickstart.md](quickstart.md)

> Cada sección indica entre corchetes los requisitos que cubre, por ejemplo **[RF-03]**. La
> matriz completa de cobertura está en la [sección 9](#9-matriz-de-cobertura-de-requisitos).

---

## Resumen

Se agrega al prototipo un subsistema de ingestión que recibe facturas electrónicas (XML UBL 2.1
de SUNAT o JSON), guarda la evidencia sin cambios, descarta duplicados por hash, interpreta el
comprobante a un documento estándar, convierte USD a PEN, genera un asiento borrador aplicando
las **reglas de la versión activa** de una plantilla activada para la empresa y lo valida contra
el **catálogo de cuentas** y los **periodos de la empresa activa**. Si todo está bien, el asiento
queda "Pendiente de aprobación"; si no, va a una bandeja donde el Maker lo completa o lo cancela.

Incluye además el **motor de plantillas**: el Admin crea plantillas en un banco global con un
editor visual de reglas (condiciones Y/O/NO y acciones sobre cuentas, centros de costo, etiquetas y
prorrateos), las prueba con casos de prueba obligatorios, las versiona de forma inmutable y las
activa por empresa.

**Integración con lo existente**: la ingestión usa la sesión del login (usuario y rol), la
empresa y el periodo que el usuario eligió al entrar, el catálogo `planesPorEmpresa`, los
`periodos` y las `plantillasActivasIds` de cada empresa. Para que el catálogo y los periodos
sobrevivan a la recarga, el `AccountingContext` pasa a persistir empresas, catálogos y sesión por
el mismo repositorio que la ingestión.

**Enfoque técnico**: dominio puro en JavaScript (`src/domain/ingestion/`), servicios asíncronos
simulados (`src/services/ingestion/`) y un repositorio único sobre localStorage que comparten la
ingestión y el `AccountingContext` (este último, mediante un adaptador síncrono). Las reglas son
un árbol JSON evaluado por un intérprete puro (`src/domain/templates/`), sin `eval`. La UI son
tres vistas nuevas en el menú de la empresa, dos vistas de plantillas (banco global y activación
por empresa) que reemplazan a `PlantillasView`, y dos modales.

## Contexto técnico

| Aspecto | Valor |
|---|---|
| **Lenguaje** | JavaScript (ES2022, ES modules) con tipos en JSDoc `@typedef` |
| **Dependencias de ejecución** | React 18.3, lucide-react (existentes). Ninguna nueva |
| **Dependencias de desarrollo nuevas** | `vitest`, `happy-dom` (ver Complexity Tracking) |
| **APIs nativas** | Web Crypto (`crypto.subtle.digest`, `crypto.randomUUID`), `DOMParser`, `localStorage`, evento `storage` |
| **Almacenamiento** | localStorage, claves `contableos:v1:<tenantId>:<colección>` (R-07). Incluye ahora `empresas`, `chartOfAccounts` por empresa y `session` |
| **Integración** | `AccountingContext` (sesión, empresa y periodo activos, `planesPorEmpresa`, `empresas`), `LoginView`, `BackupsView`, `Sidebar` del modo empresa |
| **Pruebas** | Vitest: unitarias del dominio y de integración de servicios con almacenamiento en memoria |
| **Plataforma** | Navegador moderno de escritorio (Chrome, Edge o Firefox actuales) |
| **Tipo de proyecto** | SPA front-end con backend simulado |
| **Rendimiento** | Lote de 20 comprobantes con resumen en menos de 5 s (RNF-02); se estima unos 1.0 s con la latencia simulada |
| **Restricciones** | Sin servidor; 5 a 10 MB de localStorage; como máximo 50 comprobantes por lote y 1 MB por archivo |
| **Escala** | 4 empresas semilla con unas 70 cuentas cada una; unos cientos de comprobantes por empresa en la demo |

No quedan incógnitas técnicas: todas se resolvieron en [research.md](research.md).

## Constitution Check (antes del diseño)

| Principio | Cómo se cumple | Estado |
|---|---|---|
| **I. Backend simulado** | Servicios `async` con latencia, contrato espejo del SDD §12 y errores `{code,message,details}`. Solo el repositorio toca localStorage: se corrige además el acceso directo que hoy hacen `AccountingContext` (sesión) y `BackupsView` (`localStorage.clear()`) (R-17, R-18). Claves namespaced y versionadas; un solo reinicio | ✅ |
| **II. Invariantes reales** | RD-01, RD-03, RD-04, RD-08, RD-09, RD-10 (versiones inmutables, R-22) y RD-12 implementados en el dominio; cuentas validadas contra el catálogo real de la empresa; máquina de estados estricta; montos en céntimos. RD-05, RD-07 y RD-11 no aplican aún | ✅ |
| **III. Dominio puro / ACL** | `src/domain/ingestion/` sin React ni localStorage; recibe catálogo, periodos y plantillas como datos; reloj, IDs y SHA-256 inyectados; parsers Strategy → `CanonicalDocument`; evaluador de reglas puro sobre JSON (`src/domain/templates/`), sin `eval` ni código dinámico | ✅ |
| **IV. Identidad simulada** | Se usa el login simulado existente; `ctx {tenantId,userId,role,activePeriod}` en cada servicio; permisos y periodo validados en el servicio; auditoría con el usuario real de la sesión; el Admin administra plantillas y no opera la bandeja (segregación de funciones del SDD §14) | ✅ (R-13) |
| **V. Pruebas con Vitest** | Pruebas por cada regla del dominio (sección 8), incluidas las de catálogo, periodos, evaluador de reglas, prorrateo y ciclo de vida de versiones; cada plantilla semilla tiene al menos un caso y cada regla semilla está cubierta (RNF-11 del SDD) | ✅ |
| **VI. Stack acotado** | Sin router, gestor de estado, UI kit ni TypeScript; solo dos dependencias de desarrollo | ✅ (ver Complexity Tracking) |
| **VII. Coherencia** | Se reutilizan la sesión, las empresas, los periodos, el catálogo y las plantillas existentes, sin duplicarlos. Los cambios a archivos existentes son acotados y están justificados en Complexity Tracking. Compras, Ventas, Tesorería, Conciliación y Libros no cambian (Compras y Ventas siguen con `mockPlantillas`, R-25). `PlantillasView` se reemplaza por las dos vistas de plantillas que pide la spec de Empresas (RF-106). La publicación al Libro Diario no aplica (CA-13.3) | ✅ |

**Resultado**: se aprueba. Los cambios a módulos existentes los pide explícitamente la spec
(CA-15.6, CA-18.1b, CA-18.2, RF-19 a RF-23), así que cumplen la excepción de la constitución VII.

---

## 1. Estructura de módulos

### Documentación

```text
specs/001-ingestion-comprobantes/
├── spec.md
├── plan.md              ← este archivo
├── research.md          ← decisiones R-01 … R-25
├── data-model.md        ← entidades nuevas y existentes que se leen
├── quickstart.md        ← guía de validación (ingestión e integración)
├── contracts/
│   ├── services.md      ← API de servicios mock, errores, permisos, adaptador del contexto
│   └── comprobante-json.md
├── checklists/requirements.md
└── tasks.md             ← lo genera /speckit-tasks
```

### Código fuente — nuevo

```text
src/
├── domain/ingestion/                    # Lógica pura, sin React ni almacenamiento (Const. III)
│   ├── types.js                         # @typedef de todas las entidades ........ [RF-02..RF-17]
│   ├── money.js                         # céntimos, parseo de decimales, half-up, tolerancia [RF-07, RF-09, RNF-01]
│   ├── dedup.js                         # clave normalizada + hash (sha256 inyectado) ...... [RF-03]
│   ├── parsers/
│   │   ├── registry.js                  # Strategy: detecta el formato → parser ... [RF-04, RF-05]
│   │   ├── ublInvoiceParser.js          # XML UBL 2.1 → CanonicalDocument (R-05) .. [RF-04, RF-05]
│   │   └── jsonInvoiceParser.js         # JSON (contrato) → CanonicalDocument ..... [RF-04, RF-05]
│   ├── canonical.js                     # validación del documento estándar ....... [RF-04, RF-05]
│   ├── classify.js                      # compra / venta / no pertenece (RUC de la empresa) [RF-06]
│   ├── fx.js                            # resolución de tasa (R-12) y conversión (R-02) ... [RF-07]
│   ├── accounts.js                      # normaliza cuentas del catálogo; reglas existe/U/CC; CC por defecto (R-16) [CA-08.4, CA-08.5, RF-09]
│   ├── periods.js                       # fecha → {ejercicio, mes}; abierto/cerrado; periodo activo (R-15) [CA-09.4, CA-09.5]
│   ├── templates.js                     # activaciones por empresa, migración desde plantillasActivasIds, plantillas ofrecidas (R-11) [CA-01.2b, CA-01.2c, CA-23.3]
│   ├── translator.js                    # documento + versión + catálogo → asiento usando domain/templates/evaluator (R-21) [RF-08, RF-20]
│   ├── validator.js                     # motivos de bandeja (tabla RF-09) ......... [RF-09]
│   ├── stateMachine.js                  # transiciones permitidas ................. [RF-14, RF-12]
│   ├── staging.js                       # acciones permitidas por motivo, cambios admitidos, atraso > 48 h [RF-10, RF-11]
│   ├── permissions.js                   # mapeo de roles de sesión + matriz rol × acción (R-13) [RF-15]
│   ├── audit.js                         # construcción de AuditEvent .............. [RF-17]
│   └── pipeline.js                      # orquesta un comprobante: resultado + escrituras + eventos [RF-01..RF-09]
│
├── domain/templates/                    # Motor de plantillas, puro (Const. III)
│   ├── schema.js                        # validación estructural de Template, Rule, Condition, Action, SplitPart, TestCase (data-model §4.3–4.4) [CA-19.5]
│   ├── conditions.js                    # evaluación de condiciones: comparadores, Y/O/NO, normalización de texto (R-20) [CA-19.3]
│   ├── evaluator.js                     # reglas de comprobante y línea, prioridad, prorrateo, agrupación, appliedRules (R-21) [RF-20]
│   ├── lifecycle.js                     # estados DRAFT/ACTIVE/RETIRED, editar → nueva versión, condiciones de activación (R-22) [RF-21, RF-22]
│   ├── testRunner.js                    # ejecuta casos de prueba, compara líneas sin orden, cobertura por regla (R-22) [CA-21.2, CA-21.3]
│   ├── templateAccounts.js              # cuentas usadas por una versión; validación contra un catálogo (R-23) [CA-19.6, CA-23.2]
│   └── diff.js                          # resumen legible de diferencias entre versiones [CA-22.3]
│
├── services/
│   ├── storage/
│   │   ├── repository.js                # único acceso a localStorage: claves, append-only,
│   │   │                                #   upsert versionado, cuota, reinicio .... [RF-02, RF-16, RF-17, RF-18]
│   │   ├── accountingStore.js           # adaptador síncrono para AccountingContext (R-18) [CA-18.1b]
│   │   └── memoryStorage.js             # adaptador en memoria para pruebas
│   └── ingestion/
│       ├── serviceKit.js                # latencia, autorización, periodo de solo lectura, errores, reloj/ids [Const. I, IV, RF-15, CA-09.5]
│       ├── ingestionService.js          # ingestBatch, listSampleCatalog, getBatch, listBatches,
│       │                                #   queryIntakeResults, getRawPayload, listTemplates [RF-01..RF-09]
│       ├── stagingService.js            # queryStaging, getJournalEntry, updateStagingEntries,
│       │                                #   revalidateEntries, cancelEntry ...... [RF-10, RF-11, RF-12]
│       ├── approvalQueryService.js      # queryPendingApproval .................... [RF-13]
│       ├── traceService.js              # getTraceability ......................... [RF-17]
│       ├── demoService.js               # siembra y reinicio únicos (R-17), interruptor de tipo de cambio [RF-18]
│       ├── templateService.js           # banco de plantillas y activación por empresa (contracts §Banco de plantillas) [RF-19..RF-23]
│       └── index.js                     # fachada pública
│
├── data/                                # Semillas nuevas
│   ├── mockComprobantesDemo.js          # catálogo de ≥ 14 ejemplos XML/JSON (quickstart) ... [CA-18.4]
│   ├── mockTiposCambio.js               # tasas venta 2026-06-01..2026-09-30 (R-12) .. [RF-07]
│   ├── mockCategoriasPlantilla.js       # TPL-* → PL-* (fuente de las activaciones iniciales, R-11) [CA-23.3]
│   ├── mockPlantillasReglas.js          # semilla del banco: PL-01..PL-06 v1 ACTIVE con un caso cada una + PL-07 con 3 reglas y sus casos (R-11) [Const. V]
│   └── mockIngestionSeed.js             # 1 asiento en bandeja con stagedAt de −72 h (demo de atraso) [CA-10.4]
│
├── hooks/
│   └── useIngestionContext.js           # arma ctx desde useAccounting(): sesión, empresa y periodo activos (R-13) [CA-15.5]
│
├── components/ingestion/
│   ├── BatchSummary.jsx                 # resumen del lote ......................... [CA-01.4]
│   ├── ReasonBadges.jsx                 # motivos con color y texto ................ [RF-09, RF-10]
│   ├── EntryDetailModal.jsx             # líneas, documento, evidencia original .... [CA-10.3, CA-02.4, CA-07.5]
│   ├── TraceabilityModal.jsx            # línea de tiempo por traceId .............. [RF-17]
│   ├── ReadOnlyPeriodBanner.jsx         # aviso de periodo cerrado ................. [CA-09.5]
│   └── DemoControls.jsx                 # interruptor de caída, reinicio, uso de almacenamiento [RF-18]
│
├── components/templates/
│   ├── TemplateEditor.jsx               # cabecera, defaults, pestañas Reglas / Casos de prueba / Historial [CA-19.1, CA-19.2]
│   ├── RuleList.jsx                     # lista ordenable por prioridad, agregar/eliminar regla [CA-19.2]
│   ├── ConditionBuilder.jsx             # filas campo–operador–valor y grupos Y/O/NO anidados [CA-19.3]
│   ├── ActionEditor.jsx                 # acciones de comprobante o de línea, con selector de cuentas del PCGE [CA-19.4]
│   ├── SplitEditor.jsx                  # partes del prorrateo con % y suma en vivo [CA-19.4, CA-19.5]
│   ├── TestCasesPanel.jsx               # casos (documento + asiento esperado), botón Probar, resultados y cobertura [RF-21]
│   ├── VersionHistory.jsx               # versiones, estados, diferencias, quién activó [RF-22]
│   └── AccountWarnings.jsx              # advertencias de cuentas contra un catálogo [CA-23.2]
│
└── views/
    ├── IngestionView.jsx                # carga (archivos + catálogo), plantilla filtrada, resumen,
    │                                    #   pestañas Recibidos/Fallidos/Duplicados/Rechazados [RF-01..RF-06]
    ├── BandejaView.jsx                  # bandeja: filtros, selección múltiple, completar,
    │                                    #   cambiar plantilla, revalidar, cancelar ......... [RF-10, RF-11, RF-12]
    ├── PendientesAprobacionView.jsx     # solo lectura, marca de tasa provisional ...... [RF-13]
    ├── PlantillasGlobalesView.jsx       # banco global: lista, crear, editar borrador, probar, activar, retirar (Admin; Auditor lee) [RF-19, RF-21, RF-22]
    └── PlantillasEmpresaView.jsx        # activación por empresa con advertencias de cuentas (Admin; Auditor lee) [RF-23]
```

Las pruebas van junto al código, en `src/domain/ingestion/__tests__/`,
`src/domain/templates/__tests__/` y `src/services/**/__tests__/`.

### Código fuente — archivos existentes que cambian

| Archivo | Cambio | Motivo |
|---|---|---|
| `src/context/AccountingContext.jsx` | `empresas`, `planesPorEmpresa` y `sesionUsuario` se inicializan desde `accountingStore` y se guardan cuando cambian; `iniciarSesion` reconoce `revisor_luis` (Checker) y `auditora_ana` (Auditor); se quita el acceso directo a `localStorage`; se expone `recargarDesdeAlmacenamiento()` para después del reinicio | CA-18.1b, CA-15.6, R-10, R-13, R-15, R-18, Const. I |
| `src/views/LoginView.jsx` | Dos botones de acceso rápido nuevos: Checker y Auditor | CA-15.6 |
| `src/views/BackupsView.jsx` | "Reset a datos semilla" llama a `demoService.resetDemoData` y a `recargarDesdeAlmacenamiento()`, en lugar de `localStorage.clear()` | R-17, CA-18.2, Const. I |
| `src/data/mockPlanContable.js` | Se agregan: `659` (sintética) y `6591101` (de uso, exige CC, amarres 9411101/7911101, sin amarre3), para la demo de HU-03; y `61`, `611` (sintéticas) y `6111101` "Variación de mercaderías" (de uso, sin CC), que **faltan hoy** aunque 6011101 las usa como amarre Haber | R-11; corrige un defecto de la semilla (R-19) |
| `src/data/mockPlantillas.js` | Se agrega PL-06 "Otros Gastos de Gestión por CC" (compra, base 6591101, exige CC, sin CC por defecto) | R-11 |
| `src/components/Sidebar.jsx` | Grupo "INGESTIÓN" en el menú **del modo empresa**: [I1], [I2], [I3] | RNF-08 |
| `src/App.jsx` | 3 casos nuevos en `renderView` y `tabTitles`; `plantillas` → `PlantillasEmpresaView`, `plantillas_globales` → `PlantillasGlobalesView` | RNF-08, R-25 |
| `src/views/PlantillasView.jsx` | Se elimina: sus dos rutas pasan a las vistas nuevas | R-25 |
| `src/domain/ingestion/templates.js`, `src/domain/ingestion/translator.js` (ya existen en versión plana) | Se reescriben: activaciones por empresa y traducción con el evaluador de reglas | R-11, R-21 |

`Header.jsx` ya no cambia: la identidad sale del login y el Header ya muestra el rol.

**Decisión de estructura**: se mantiene el proyecto único y se agregan las carpetas `domain/`,
`services/` y `hooks/`. La integración reutiliza el estado existente en vez de duplicarlo.

### Dependencias entre capas

```text
views / components ──► hooks/useIngestionContext ──► AccountingContext (sesión, empresa, periodo)
        │
        └──► services/ingestion (fachada) ──► domain/ingestion
                          │
                          └──► services/storage/repository ──► localStorage
AccountingContext ──► services/storage/accountingStore ──► repository   (empresas, catálogos, sesión)
BackupsView ──► services/ingestion/demoService.resetDemoData
```

Reglas:
- El dominio no importa nada de `services/` ni de React.
- Las vistas no importan `domain/` salvo funciones de formato.
- Nadie fuera de `services/storage/` usa `localStorage`.
- Los servicios leen empresas, catálogos y plantillas del repositorio, nunca del estado de
  React.

## 2. Flujo de procesamiento de un comprobante · [RF-01 a RF-09, RF-17]

Descripción del pipeline (`pipeline.js`), sin código. Cada paso emite un evento de auditoría
con el mismo `traceId`.

**Antes del lote** [CA-01.2b, CA-01.2c, CA-09.5, RF-15]: se valida el rol (MAKER), que el
periodo activo esté ABIERTO en la empresa persistida y que la plantilla sea de una categoría
activa. Se leen **una sola vez** la empresa (RUC, periodos), su catálogo normalizado (R-16) y la
plantilla.

1. **Recepción** [RF-02]: se asignan `traceId` y `receivedAt`, y se calcula `contentSha256`. Si
   el archivo pesa más de 1 MB → `FAILED` ("archivo excede 1 MB") y no se guarda el contenido.
2. **Interpretación** [RF-04, RF-05]: el registro de parsers elige XML o JSON. El parser produce
   el documento estándar y `canonical.js` aplica las 7 validaciones en orden. Si alguna falla →
   `FAILED` con el motivo legible.
3. **Pertenencia** [RF-06]: compra o venta según el RUC de la empresa activa; si no es ninguno →
   `REJECTED_NOT_TENANT`.
4. **Duplicado** [RF-03]: hash de la clave contra `dedupIndex` y los hashes ya vistos en el lote
   → `DUPLICATE` o `DUPLICATE_WITH_DIFF`. *Desviación justificada del SDD (P-01)*: el SDD detecta
   duplicados antes de interpretar, pero la clave solo existe tras interpretar; la evidencia se
   guarda antes que nada, así que RD-01 se mantiene.
5. **Tipo de cambio** [RF-07]: si la moneda es USD, se resuelve la tasa según R-12. Sin tasa →
   `NO_FX_RATE` y el asiento se crea sin líneas.
6. **Traducción** [RF-08, RF-20, CA-08.2, CA-08.4, CA-08.5]: con la **versión activa** de la
   plantilla y el **catálogo de la empresa**, el evaluador (R-21):
   - aplica la primera regla de comprobante que se cumple (IGV, contrapartida, CC y etiquetas por
     defecto);
   - por cada línea, la primera regla de línea que se cumple (cuenta base, CC, etiquetas o
     prorrateo); lo que ninguna regla fije sale de `defaults`;
   - reparte la base PEN (R-02) entre las líneas y los prorrateos, llevando el residuo a la última
     parte, y agrupa por cuenta, CC y lado;
   - agrega IGV (si es mayor que 0), contrapartida y los destinos por cada cuenta base que tenga
     `amarre1` y `amarre2`.

   El CC sigue la prioridad regla > plantilla > `amarre3`. Cada línea guarda su `ruleId`, y el
   asiento guarda `templateVersion` y `appliedRules`.
7. **Validación** [RF-09]: se reúnen **todos** los motivos: consistencia de montos (R-03), cuadre,
   periodo según `empresa.periodos` (R-15), plantilla que no corresponde, y por cada línea: cuenta
   inexistente, no imputable o sin centro de costo exigido (R-16). Sin motivos →
   `PENDING_APPROVAL`; con motivos → `PENDING_INPUT`, con `stagedAt = now`.
8. **Confirmación** (R-08): escrituras en orden (evidencia → documento → índice → asiento →
   auditoría) y el item se agrega al resumen.

**Recalcular o revalidar desde la bandeja** [RF-11, CA-11.3, CA-11.7]: se vuelven a leer del
repositorio el catálogo, los periodos, las activaciones y la **versión activa vigente** de la
plantilla (R-24; si no hay → `TEMPLATE_INACTIVE`), se repiten los pasos 5 a 7 sobre el documento guardado
y se hace la transición `PENDING_INPUT → DRAFT → (PENDING_APPROVAL | PENDING_INPUT)`, subiendo
`entityVersion`. Así, un cambio en el Catálogo (por ejemplo, marcar una cuenta como de uso) o la
reapertura de un periodo se reflejan al revalidar.

## 3. Modelo de datos JSON

Las definiciones completas están en [data-model.md](data-model.md). Abajo, el ejemplo de **una
factura de compra en USD procesada con el servicio de tipo de cambio caído**: USD 1,000.00 = base
847.46 + IGV 152.54, con la plantilla **PL-07** (con reglas). Su regla de línea "FLETE" envía la
línea a 6311101 con CC-LOGISTICA; la cuenta 6311101 del catálogo de la empresa 01 tiene amarres
9411101/7911101. Resultado: pendiente de aprobación con tasa provisional.

Cálculo (R-02): tasa provisional 3.751 (del 2026-09-14).
Total PEN = round(100000 × 3751 / 1000) = **375100**.
IGV PEN = round(15254 × 3751 / 1000) = round(57217.75) = **57218**.
Base PEN = 375100 − 57218 = **317882**.
Debe = 317882 + 57218 + 317882 = 692982 = Haber = 375100 + 317882 ✔.

Claves en localStorage y un registro de ejemplo de cada una. Los datos existentes se muestran
recortados.

```json
{
  "contableos:v1:global:session": {
    "usuarioId": "contador_maria", "nombre": "María Contador", "rol": "Maker",
    "codigoEstudio": "ESTUDIO-01", "autenticado": true, "fechaAcceso": "2026-09-21T14:55:00.000Z"
  },

  "contableos:v1:global:empresas": [{
    "id": "01", "ruc": "20450656934", "abreviatura": "PACHATUSANTREK SAC",
    "plantillasActivasIds": ["TPL-COMPRA-01", "TPL-VENTA-01", "TPL-SERV-01"],
    "periodos": [
      { "ejercicio": "2026", "mes": 8, "nombrePeriodo": "AGOSTO_2026", "estado": "CERRADO" },
      { "ejercicio": "2026", "mes": 9, "nombrePeriodo": "SETIEMBRE_2026", "estado": "ABIERTO" }
    ]
  }],

  "contableos:v1:01:chartOfAccounts": [
    { "codigo": "6311101", "descripcion": "TRANSPORTE DE CARGA Y SERVICIOS LOGÍSTICOS", "esCuentaU": true, "requiereCC": true, "amarre1": "9411101", "amarre2": "7911101", "amarre3": "CC-LOGISTICA" },
    { "codigo": "4011101", "descripcion": "IGV - CUENTA PROPIA (CRÉDITO Y DÉBITO FISCAL)", "esCuentaU": true, "requiereCC": false },
    { "codigo": "4212101", "descripcion": "FACTURAS, BOLETAS Y OTROS POR PAGAR - EMITIDAS", "esCuentaU": true, "requiereCC": false },
    { "codigo": "9411101", "descripcion": "GASTOS ADMINISTRATIVOS GENERALES", "esCuentaU": true, "requiereCC": true },
    { "codigo": "7911101", "descripcion": "CARGAS IMPUTABLES A CUENTAS DE COSTOS Y GASTOS", "esCuentaU": true, "requiereCC": false }
  ],

  "contableos:v1:global:templates": [{
    "templateId": "PL-07", "code": "COMPRA_SERVICIOS_REGLAS", "name": "Servicios varios con reglas",
    "operationType": "COMPRA", "createdBy": "SEED", "createdAt": "2026-09-21T14:50:00.000Z", "retiredAt": null,
    "versions": [{
      "version": 1, "status": "ACTIVE", "basedOnVersion": null,
      "defaults": { "baseAccount": "6591101", "taxAccount": "4011101", "counterpartAccount": "4212101",
                    "appliesIgv": true, "requiresCostCenter": true, "defaultCostCenter": "CC-ADMIN" },
      "documentRules": [],
      "lineRules": [
        { "ruleId": "R-FLETE", "name": "Fletes", "priority": 1,
          "when": { "op": "contains", "field": "line.description", "value": "FLETE" },
          "then": { "baseAccount": "6311101", "costCenter": "CC-LOGISTICA" } },
        { "ruleId": "R-SERV-BASICOS", "name": "Luz y agua", "priority": 2,
          "when": { "op": "or", "args": [
            { "op": "contains", "field": "line.description", "value": "LUZ" },
            { "op": "contains", "field": "line.description", "value": "AGUA" } ] },
          "then": { "baseAccount": "6361101", "costCenter": "CC-ADMIN" } },
        { "ruleId": "R-SEGUROS", "name": "Seguros prorrateados", "priority": 3,
          "when": { "op": "contains", "field": "line.description", "value": "SEGURO" },
          "then": { "split": [
            { "account": "6511101", "costCenter": "CC-ADMIN", "basisPoints": 6000 },
            { "account": "6511101", "costCenter": "CC-LOGISTICA", "basisPoints": 4000 } ] } }
      ],
      "testCases": [
        { "caseId": "TC-FLETE", "name": "Flete S/ 100",
          "document": { "issuer": { "fiscalId": "20555555551", "name": "TRANSPORTES ANDINOS DEMO SAC" },
                        "receiver": { "fiscalId": "20450656934", "name": "PACHATUSANTREK SAC" },
                        "issueDate": "2026-09-10",
                        "lines": [{ "description": "FLETE LIMA - CUSCO", "amountCents": 10000, "taxCode": "IGV" }],
                        "taxableBaseCents": 10000, "exemptBaseCents": 0, "igvCents": 1800, "totalCents": 11800 },
          "expectedLines": [
            { "side": "D", "accountCode": "6311101", "costCenter": "CC-LOGISTICA", "functionalAmountCents": 10000 },
            { "side": "D", "accountCode": "4011101", "costCenter": null, "functionalAmountCents": 1800 },
            { "side": "H", "accountCode": "4212101", "costCenter": null, "functionalAmountCents": 11800 },
            { "side": "D", "accountCode": "9411101", "costCenter": "CC-LOGISTICA", "functionalAmountCents": 10000 },
            { "side": "H", "accountCode": "7911101", "costCenter": null, "functionalAmountCents": 10000 } ] }
      ],
      "lastTestRun": { "at": "2026-09-21T14:50:00.000Z", "by": "SEED", "allPassed": true, "uncoveredRuleIds": [], "results": [] },
      "createdBy": "SEED", "createdAt": "2026-09-21T14:50:00.000Z", "updatedAt": "2026-09-21T14:50:00.000Z",
      "activatedBy": "SEED", "activatedAt": "2026-09-21T14:50:00.000Z", "diffFromPrevious": null, "usageCount": 1
    }]
  }],

  "contableos:v1:01:templateActivations": [
    { "templateId": "PL-07", "active": true, "activatedBy": "MIGRATION", "activatedAt": "2026-09-21T14:55:10.000Z", "accountWarnings": [] }
  ],

  "contableos:v1:01:rawPayloads": [{
    "id": "b7e1c0d2-5a9f-4c11-9a0e-2f4d6c8e1a01",
    "tenantId": "01",
    "traceId": "4f2a9c1e-7b3d-4e8a-9f10-6c5b2d1e0a77",
    "batchId": "a1d4e7f0-2c3b-4d5e-8f9a-0b1c2d3e4f50",
    "receivedAt": "2026-09-21T15:04:12.381Z",
    "source": "SAMPLE_CATALOG",
    "fileName": "F001-00000456.json",
    "contentType": "json",
    "sizeBytes": 612,
    "content": "{ \"tipoDocumento\": \"01\", \"serieNumero\": \"F001-00000456\", … }",
    "contentSha256": "9c1f…e04b",
    "outcome": "ACCEPTED",
    "outcomeReason": null,
    "duplicateOfDocumentId": null
  }],

  "contableos:v1:01:documents": [{
    "id": "d3c2b1a0-9e8f-4a7b-8c6d-5e4f3a2b1c09",
    "tenantId": "01",
    "traceId": "4f2a9c1e-7b3d-4e8a-9f10-6c5b2d1e0a77",
    "rawPayloadRef": "b7e1c0d2-5a9f-4c11-9a0e-2f4d6c8e1a01",
    "deduplicationHash": "5e0a…71cd",
    "type": "01",
    "documentNumber": "F001-00000456",
    "issueDate": "2026-09-15",
    "currency": "USD",
    "issuer":   { "fiscalId": "20555555551", "name": "TRANSPORTES ANDINOS DEMO SAC" },
    "receiver": { "fiscalId": "20450656934", "name": "PACHATUSANTREK SAC" },
    "operationType": "COMPRA",
    "lines": [{ "lineNo": 1, "description": "Flete Cusco - Puno", "amountCents": 84746, "taxCode": "IGV" }],
    "taxableBaseCents": 84746,
    "exemptBaseCents": 0,
    "igvCents": 15254,
    "totalCents": 100000,
    "receivedAt": "2026-09-21T15:04:12.381Z"
  }],

  "contableos:v1:01:dedupIndex": {
    "5e0a…71cd": "d3c2b1a0-9e8f-4a7b-8c6d-5e4f3a2b1c09"
  },

  "contableos:v1:01:journalEntries": [{
    "id": "e9f8a7b6-c5d4-4e3f-a2b1-c0d9e8f7a6b5",
    "tenantId": "01",
    "traceId": "4f2a9c1e-7b3d-4e8a-9f10-6c5b2d1e0a77",
    "canonicalDocRef": "d3c2b1a0-9e8f-4a7b-8c6d-5e4f3a2b1c09",
    "batchId": "a1d4e7f0-2c3b-4d5e-8f9a-0b1c2d3e4f50",
    "state": "PENDING_APPROVAL",
    "operationType": "COMPRA",
    "templateId": "PL-07",
    "templateVersion": 1,
    "appliedRules": [{ "scope": "LINE", "ruleId": "R-FLETE", "ruleName": "Fletes", "lineNo": 1 }],
    "issueDate": "2026-09-15",
    "accountingPeriod": "2026-09",
    "currency": "USD",
    "fx": { "rateMilli": 3751, "rateDate": "2026-09-14", "provisional": true },
    "provisionalFxRate": true,
    "lines": [
      { "lineNo": 1, "side": "D", "accountCode": "6311101", "description": "Flete Cusco - Puno",          "costCenter": "CC-LOGISTICA", "originalAmountCents": 84746,  "functionalAmountCents": 317882, "role": "BASE", "ruleId": "R-FLETE", "sourceLineNos": [1] },
      { "lineNo": 2, "side": "D", "accountCode": "4011101", "description": "IGV - Crédito fiscal 18%",    "costCenter": null,           "originalAmountCents": 15254,  "functionalAmountCents": 57218,  "role": "TAX", "ruleId": null, "sourceLineNos": [] },
      { "lineNo": 3, "side": "H", "accountCode": "4212101", "description": "Proveedores - TRANSPORTES ANDINOS DEMO SAC", "costCenter": null, "originalAmountCents": 100000, "functionalAmountCents": 375100, "role": "COUNTERPART", "ruleId": null, "sourceLineNos": [] },
      { "lineNo": 4, "side": "D", "accountCode": "9411101", "description": "Destino del gasto",           "costCenter": "CC-LOGISTICA", "originalAmountCents": null,   "functionalAmountCents": 317882, "role": "DEST_DEBIT", "ruleId": "R-FLETE", "sourceLineNos": [1] },
      { "lineNo": 5, "side": "H", "accountCode": "7911101", "description": "Cargas imputables a costos y gastos", "costCenter": null,   "originalAmountCents": null,   "functionalAmountCents": 317882, "role": "DEST_CREDIT", "ruleId": "R-FLETE", "sourceLineNos": [1] }
    ],
    "pendingReasons": [],
    "analyticTags": {},
    "stagedAt": null,
    "cancellation": null,
    "entityVersion": 1,
    "createdBy": "contador_maria",
    "createdAt": "2026-09-21T15:04:12.402Z",
    "updatedAt": "2026-09-21T15:04:12.402Z"
  }],

  "contableos:v1:01:auditLog": [{
    "id": "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
    "tenantId": "01",
    "traceId": "4f2a9c1e-7b3d-4e8a-9f10-6c5b2d1e0a77",
    "at": "2026-09-21T15:04:12.402Z",
    "userId": "SYSTEM",
    "role": "SYSTEM",
    "action": "MOVED_TO_PENDING_APPROVAL",
    "entityType": "JournalEntry",
    "entityId": "e9f8a7b6-c5d4-4e3f-a2b1-c0d9e8f7a6b5",
    "detail": { "provisionalFxRate": true, "fxRateDate": "2026-09-14", "batchStartedBy": "contador_maria" }
  }],

  "contableos:v1:01:batches": [{
    "id": "a1d4e7f0-2c3b-4d5e-8f9a-0b1c2d3e4f50",
    "tenantId": "01",
    "createdBy": "contador_maria",
    "createdAt": "2026-09-21T15:04:12.300Z",
    "templateId": "PL-07",
    "templateVersion": 1,
    "itemCount": 1,
    "summary": { "received": 1, "accepted": 1, "duplicates": 0, "failed": 0, "rejected": 0, "pendingInput": 0, "pendingApproval": 1 },
    "items": [{ "rawPayloadId": "b7e1c0d2-5a9f-4c11-9a0e-2f4d6c8e1a01", "fileName": "F001-00000456.json", "outcome": "ACCEPTED", "journalEntryId": "e9f8a7b6-c5d4-4e3f-a2b1-c0d9e8f7a6b5" }]
  }],

  "contableos:v1:global:demoSettings": { "fxServiceDown": true, "latencyMs": 150, "perItemLatencyMs": 40 },
  "contableos:v1:global:meta": { "schemaVersion": 1, "seededAt": "2026-09-21T14:50:00.000Z" }
}
```

Los hashes aparecen abreviados (`…`) solo por legibilidad. `fxRates` sigue data-model §5.

## 4. Integración con el prototipo existente · [CA-08.5, CA-09.4, CA-09.5, CA-15.5, CA-15.6, CA-01.2b, CA-18.1b, CA-18.2]

| Pieza existente | Cómo la usa la ingestión | Cambio necesario |
|---|---|---|
| Login y `sesionUsuario` | `userId` y rol del `ctx`; autor de los eventos de auditoría | Dos usuarios demo nuevos; la sesión se guarda por el repositorio (R-13) |
| `empresaActiva` | `tenantId` y RUC para la pertenencia | Ninguno |
| `ejercicioActivo` / `periodoActivo` | `ctx.activePeriod`; el servicio verifica su estado en el repositorio (solo lectura si está CERRADO) | Ninguno |
| `empresa.periodos` | Periodo del asiento según su fecha de emisión (R-15) | Se persisten (`empresas`) |
| `planesPorEmpresa[empresaId]` | Cuentas, uso (U), exigencia de CC, `amarre1/2/3` (R-16) | Se persisten (`chartOfAccounts`) |
| `empresa.plantillasActivasIds` | Fuente de las activaciones iniciales por empresa (R-11, CA-23.3) | Ninguno (mapeo en `mockCategoriasPlantilla.js`) |
| `mockPlantillas` (global) | Semilla de PL-01..PL-06 v1 del banco; Compras y Ventas siguen usándolo tal cual (R-25) | Se agrega PL-06 |
| `PlantillasView.jsx` (solo lectura) | Reemplazada por `PlantillasGlobalesView` y `PlantillasEmpresaView` (spec de Empresas RF-106) | Se elimina (R-25) |
| `mockPlanContable` | Semilla PCGE de cada empresa | Se agregan 659 y 6591101 |
| Reset de `BackupsView` | Mismo reinicio que la ingestión | Llama a `resetDemoData` (R-17) |
| `utils/accountingEngine.js` | Se reutilizan sus **reglas** (existe, U, CC) en `domain/ingestion/accounts.js`; no su código, porque usa flotantes y recalcula el IGV | Ninguno |

**Sincronización entre pestañas**: si en otra pestaña se edita el catálogo o se cierra un
periodo, el `AccountingContext` de esta pestaña no se entera hasta recargar (limitación
aceptada). En cambio, los servicios de ingestión **siempre** leen el estado vigente del
repositorio, así que las validaciones nunca usan datos viejos (RNF-04).

## 5. Pantallas y navegación · [RF-01, RF-10, RF-13, RF-15, RF-17, RF-18, CA-09.5, RNF-08]

Las tres vistas aparecen solo en el **menú del modo empresa** (spec de Empresas, RF-102).

| Vista | Contenido | Roles |
|---|---|---|
| **[I1] Ingestión de Comprobantes** | Zona para subir archivos, selector del catálogo de ejemplos, **plantilla filtrada por la empresa** (con aviso si no hay filtro), botón Procesar, `BatchSummary`, pestañas Recibidos / Fallidos / Duplicados / Rechazados, `DemoControls` | MAKER opera; AUDITOR y ADMIN leen |
| **[I2] Bandeja de Excepciones** | `MetricCard` por motivo y de atrasados; filtros; tabla con selección múltiple; Completar CC y etiquetas, Cambiar plantilla (filtrada), Revalidar, Cancelar; resultado por asiento | MAKER opera; AUDITOR y ADMIN leen |
| **[I3] Pendientes de Aprobación** | Tabla en solo lectura; marca "requiere revisión humana" | MAKER, CHECKER, AUDITOR, ADMIN |
| **Modales** | `EntryDetailModal` (líneas con la descripción de cada cuenta tomada del catálogo, moneda y tasa, **regla aplicada por línea y versión de plantilla**, documento, evidencia original); `TraceabilityModal` | Según la matriz de permisos |
| **Plantillas Globales** (menú global, ruta existente `plantillas_globales`) | Lista del banco (estado, versión activa, borrador, uso); `TemplateEditor` con reglas de comprobante y de línea, casos de prueba, Probar, Activar, Editar (nueva versión), Retirar, historial con diferencias | ADMIN opera; AUDITOR lee |
| **Plantillas de la Empresa** (menú de empresa, ruta existente `plantillas`) | Plantillas con versión activa, interruptor Activa/Inactiva por empresa, `AccountWarnings` contra el catálogo de la empresa | ADMIN opera; AUDITOR lee; MAKER ve solo las activas |

Si el periodo activo está CERRADO, [I1] e [I2] muestran `ReadOnlyPeriodBanner` y desactivan las
acciones (CA-09.5). Los botones se ocultan según el rol, pero el control real está en el
servicio (RNF-04).

## 6. Decisiones técnicas

Resumen. El detalle y la justificación completa están en [research.md](research.md).

| # | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| R-01 | Montos en céntimos enteros; tasas en milésimas | Exactitud (RNF-01, Const. II) | Floats con `toFixed`; `decimal.js` |
| R-02 | Convertir total e IGV; derivar la base PEN = total − IGV | Cuadre garantizado; cumple RD-09 | Llevar el residuo de redondeo a 676/776 |
| R-03 | Consistencia de montos en la moneda original, tolerancia 0.01 | No mezcla el error del emisor con el redondeo propio | Evaluar después de convertir |
| R-04 | SHA-256 (Web Crypto) de la clave normalizada, más un índice por empresa | Fiel al SDD, nativo, O(1) | Comparar la clave en texto plano |
| R-05 | `DOMParser` nativo con mapeo UBL por namespace | Sin dependencias | `fast-xml-parser`; regex |
| R-06 | `happy-dom` solo en las pruebas del parser UBL | Node no trae `DOMParser` | `jsdom`; parser falso |
| R-07 | Repositorio único sobre localStorage, con manejo de cuota | Const. I; degradación controlada | IndexedDB |
| R-08 | Escrituras ordenadas con la evidencia primero | Nunca hay un asiento sin evidencia | Undo-log |
| R-09 | `entityVersion` + `expectedVersion` + evento `storage` | Conflictos reales entre pestañas | "Gana el último" |
| **R-10** | **Catálogo por empresa persistido en el repositorio; los servicios lo leen de ahí** | Una sola fuente; sobrevive a la recarga; la revalidación usa el catálogo real | Inyectar `getPlanContable()`; copiar cuentas en cada asiento |
| **R-11** | **Banco global versionado + activación explícita por empresa (migrada desde `plantillasActivasIds`); PL-06, PL-07 y la cuenta 6591101 en la semilla** | Decisión del 2026-09-22; reutiliza el modelo de empresas; demo de HU-03 y de reglas | Filtro por categorías; plantillas por empresa |
| R-12 | Tasas venta por día hábil; interruptor de caída determinista | CA-07.3, CA-07.4, RNF-06 | Caídas aleatorias |
| **R-13** | **Identidad desde el login existente + usuarios demo Checker y Auditor; Admin = solo lectura** | Una sola identidad | Selector propio en el Header |
| R-14 | Latencia fija configurable | RNF-02 | Latencia aleatoria |
| **R-15** | **Periodos desde `empresa.periodos` persistidos; solo lectura verificada en el servicio** | Sin calendario duplicado; RNF-04 | Calendario propio; confiar en el estado que envía la UI |
| **R-16** | **Adaptador que normaliza las cuentas (`requiereCC` o `requiereCentroCostos`) y reglas del motor existente** | El campo tiene dos nombres en el código actual | Llamar a `generarAsientoContable` (usa floats y recalcula IGV) |
| **R-17** | **Un único reinicio (`resetDemoData`), usado también por Copias de Seguridad** | Coherencia; elimina `localStorage.clear()` | Dos reinicios distintos |
| **R-18** | **Adaptador síncrono `accountingStore` para el contexto** | Lectura síncrona al montar, sin conocer claves | Contexto llamando a servicios asíncronos |
| **R-19** | **Completar el PCGE semilla con 61/611/6111101** | El amarre de 6011101 apuntaba a una cuenta inexistente | Quitar el amarre de 6011101 |
| **R-20** | **Reglas como árbol JSON (`when` y `then`) con reglas de comprobante y de línea** | Es el ASTTemplate del SDD, apto para un editor visual, sin `eval` | Expresiones de texto; JSON Logic (dependencia) |
| **R-21** | **Gana la primera regla por prioridad; prorrateo en puntos básicos con residuo a la última parte** | Determinista y cuadra siempre (RD-09) | Aplicar todas las reglas; porcentajes con decimales |
| **R-22** | **Borrador → pruebas en verde con cobertura por regla → activa; editar crea una versión nueva** | RD-10 y la RNF-11 del SDD | Vista previa sin bloqueo; varias versiones activas |
| **R-23** | **Cuentas validadas contra el PCGE (error) y contra la empresa (advertencia)** | Decisión del 2026-09-22 | Bloquear por empresa; validar solo al procesar |
| **R-24** | **Recalcular con la versión activa vigente; `TEMPLATE_INACTIVE` si ya no hay** | Decisión del 2026-09-22 (K7) | Recalcular con la versión original |
| **R-25** | **Compras y Ventas sin cambios; `PlantillasView` reemplazada por dos vistas** | No rompe módulos existentes; cumple la RF-106 de Empresas | Migrar Compras y Ventas al motor de reglas |
| P-01 | Detectar duplicados después de interpretar | La clave requiere campos interpretados; RD-01 se mantiene | Hashear el contenido crudo |
| P-02 | Tres vistas separadas en el menú de la empresa | Una entrada por tarea y rol | Una vista única con pestañas |
| P-03 | Los servicios devuelven `{ok,error}` en lugar de rechazar la Promise | La UI trata los errores de negocio sin `try/catch` | Lanzar excepciones tipadas |

## 7. Siembra y datos de demostración · [RF-18, CA-18.1b, CA-18.2]

- **Al iniciar la app**, si falta `meta` o su esquema no coincide, `demoService` siembra:
  - Globales: `empresas` (desde `mockEmpresas`, con sus periodos y plantillas activas),
    `templates` (banco desde `mockPlantillasReglas.js`: PL-01..PL-06 v1 ACTIVE con un caso cada
    una y PL-07 con reglas y sus casos; todas con `lastTestRun` en verde), `fxRates` y
    `demoSettings`.
  - Las `templateActivations` **no** se siembran: se crean con la migración perezosa desde
    `plantillasActivasIds` la primera vez que se consultan (R-11).
  - Por empresa: `chartOfAccounts` (copia de `mockPlanContable`) y la semilla de ingestión (un
    asiento en bandeja con `stagedAt = seededAt − 72 h`, solo en la empresa 01).
- **`AccountingContext`** lee `empresas`, catálogos y sesión desde `accountingStore`. Si faltan
  (primer arranque), usa la misma semilla, así que el comportamiento de hoy se conserva.
- **`resetDemoData`** borra todo lo que empieza por `contableos:v1:` salvo la sesión, vuelve a
  sembrar y el contexto se recarga (R-17).
- **Catálogo de ejemplos** (`mockComprobantesDemo.js`): vive en código y cubre los 14 escenarios
  del [quickstart](quickstart.md). Sus RUC y razones sociales son ficticios (RNF-07); los
  receptores y emisores propios usan los RUC de las empresas semilla.

## 8. Estrategia de pruebas · [Const. V, RNF-11 del SDD]

**Herramienta**: Vitest. Script `test` = `vitest run`. Entorno `node` por defecto; `happy-dom`
solo en las pruebas del parser UBL (R-06). Reloj, IDs y latencia se inyectan: la latencia es 0 y
el reloj es fijo.

### 8.1 Pruebas unitarias del dominio (obligatorias)

| Archivo bajo prueba | Casos mínimos | Cubre |
|---|---|---|
| `money.js` | parseo de `"847.46"` → 84746; rechazo de 3 decimales y de texto; half-up en .5; tolerancia ≤ 1 | RNF-01 |
| `dedup.js` | normalización; misma clave → mismo hash; distinta empresa → distinto hash | RF-03, CA-16.3 |
| `ublInvoiceParser.js` | factura válida; `CreditNote` y código 03 → no soportado; falta RUC; XML mal formado; bases 1000/9997/9998 | RF-04, RF-05, CA-04.4 |
| `jsonInvoiceParser.js` | válido; JSON roto; obligatorio faltante; monto inválido; serie normalizada | RF-04, RF-05 |
| `canonical.js` | las 7 validaciones en orden de precedencia | RF-05 |
| `classify.js` | receptor = empresa → compra; emisor = empresa → venta; ninguno → rechazo | RF-06 |
| `fx.js` | tasa exacta; fin de semana y servicio caído → anterior provisional; sin tasa previa → `NO_FX_RATE`; ejemplo de la sección 3; propiedad Debe = Haber en 1,000 facturas USD aleatorias con semilla fija | RF-07, RD-09 |
| **`accounts.js`** | normaliza `requiereCC` y `requiereCentroCostos` (ambos, uno solo, ninguno); `amarre3` vacío → sin CC por defecto; amarres incompletos (solo `amarre1`) → sin líneas de destino; reglas: inexistente, no U, falta CC por cuenta y por plantilla | CA-08.4, RF-09, R-16 |
| **`periods.js`** | 2026-09-15 en setiembre ABIERTO → abierto; agosto CERRADO → cerrado; mes ausente → no abierto; periodo activo CERRADO → solo lectura | CA-09.4, CA-09.5 |
| **`templates.js`** | migración: `TPL-COMPRA-01` → PL-01; `TPL-SERV-01` → PL-02, PL-03, PL-06, PL-07; `TPL-VENTA-01` → PL-04, PL-05; lista vacía → sin activaciones; ofrecidas = activas para la empresa con versión ACTIVE y no retiradas; plantilla no ofrecida → `TEMPLATE_NOT_ACTIVE` | CA-01.2b, CA-01.2c, CA-23.3 |
| `translator.js` | **los casos de prueba de cada plantilla semilla (PL-01 a PL-07)** producen su asiento esperado con el catálogo semilla; el mismo documento con dos catálogos distintos (con y sin amarres) da asientos distintos; prioridad del CC regla > plantilla > `amarre3`; IGV 0 → sin línea de IGV; `templateVersion`, `appliedRules` y `ruleId` por línea | RF-08, RF-20, CA-08.2, CA-08.4, RD-10 |
| **`templates/schema.js`** | plantilla válida; cada error de data-model §4.3–4.4 (campo u operador desconocido, valor vacío, `between` invertido, campo `line.*` en regla de comprobante, prorrateo que suma 9999 o 10001, una sola parte, prioridad repetida, acción vacía) con su ruta | CA-19.5 |
| **`templates/conditions.js`** | cada comparador; texto sin distinguir mayúsculas ni tildes; Y/O/NO anidados; campos de comprobante y de línea | CA-19.3 |
| **`templates/evaluator.js`** | gana la primera por prioridad; sin regla → defaults; regla de comprobante cambia IGV y contrapartida; prorrateo 60/40 de 10001 → 6000 y 4001; prorrateo de 1 céntimo en 3 partes → partes de 0 omitidas; agrupación de partes iguales; destinos por cada cuenta base; propiedad: Debe = Haber en 1,000 documentos aleatorios con reglas aleatorias válidas (semilla fija); determinismo | RF-20, CA-20.1–20.5, RD-09 |
| **`templates/lifecycle.js`** | editar DRAFT permitido; editar ACTIVE o RETIRED → nueva versión DRAFT v(max+1); un solo DRAFT; activar sin `lastTestRun` vigente, con casos fallidos, con reglas sin cubrir o sin casos → `TEMPLATE_NOT_READY`; activar pasa la ACTIVE anterior a RETIRED; retirar | RF-21, RF-22 |
| **`templates/testRunner.js`** | caso que pasa; caso con monto distinto; líneas en otro orden → pasa; asiento descuadrado → falla; `uncoveredRuleIds` correcto | CA-21.2, CA-21.3 |
| **`templates/templateAccounts.js`** y **`templates/diff.js`** | cuentas de defaults, reglas y prorrateos; inexistente y no imputable contra un catálogo; diferencias de cuenta, CC, prioridad y reglas agregadas o quitadas en texto legible | CA-19.6, CA-23.2, CA-22.3 |
| `validator.js` | cada motivo por separado, incluido `ACCOUNT_NOT_POSTABLE`; varios motivos a la vez; tolerancia 0.01 frente a 0.02; amarre que apunta a una cuenta inexistente | RF-09, RD-03, RD-12 |
| `stateMachine.js` | las 4 transiciones válidas; todas las inválidas rechazadas | RF-14, CA-12.2, CA-12.3 |
| `staging.js` | acciones permitidas como intersección de motivos; campos prohibidos; atraso con 48 h exactas = no, 48 h + 1 min = sí | RF-10, RF-11, CA-10.4 |
| `permissions.js` | mapeo Maker/Checker/Auditor/Admin/desconocido; matriz completa de [contracts/services.md](contracts/services.md) | RF-15, CA-15.2 |
| `pipeline.js` | orden de eventos y resultado por cada tipo de comprobante; duplicado dentro del lote | RF-01..RF-09, CA-03.5 |

### 8.2 Pruebas de integración de servicios y almacenamiento (con `memoryStorage`)

- `ingestBatch` con los 14 ejemplos del catálogo → estado y motivo esperados (CF-04).
- 5 cargas del mismo comprobante → 1 asiento y 4 duplicados (CF-02).
- Todo asiento en `PENDING_APPROVAL` cuadra (CF-03).
- Lote de 51 → `BATCH_TOO_LARGE` sin escrituras; archivo de más de 1 MB → fallido y el resto
  continúa.
- Plantilla no activada para la empresa o sin versión activa → `TEMPLATE_NOT_ACTIVE` sin escrituras.
- **`templateService`**: crear → DRAFT v1; guardar inválido → `TEMPLATE_INVALID`; modificar una
  versión ACTIVE → `TEMPLATE_NOT_EDITABLE`; probar y activar (CF-10); editar una versión activa →
  DRAFT v2; activar v2 → v1 RETIRED y los asientos existentes conservan la v1 (CF-11);
  `setCompanyTemplateActivation` con advertencias; MAKER, CHECKER y AUDITOR → `FORBIDDEN` en las
  operaciones de escritura; eventos en `global:auditLog` y en el `auditLog` de la empresa.
- **Recalcular con la versión vigente**: asiento con v1 en la bandeja, se activa la v2 y
  `revalidateEntries` lo recalcula con la v2 y emite `TEMPLATE_VERSION_CHANGED`; con la plantilla
  desactivada → `TEMPLATE_INACTIVE` (R-24).
- Periodo activo CERRADO en el repositorio → `PERIOD_READ_ONLY` en las 4 operaciones de
  escritura, sin cambios, con `ACTION_DENIED` en la auditoría (CA-09.5).
- **Catálogo vigente**: se procesa un asiento que cae en `ACCOUNT_NOT_POSTABLE`; se cambia el
  catálogo en el repositorio; `revalidateEntries` lo hace avanzar (CA-08.5, CA-11.7).
- **Periodo reabierto**: asiento con `PERIOD_CLOSED`; se cambia el estado en `empresas`;
  `revalidateEntries` lo hace avanzar.
- `updateStagingEntries` en lote con resultados mixtos (CF-05, CA-11.5); `expectedVersion`
  desactualizado → `CONFLICT` (CA-11.6).
- Cada operación con cada rol no permitido → `FORBIDDEN` y `ACTION_DENIED` (CF-07); rol ADMIN =
  AUDITOR; rol desconocido → todo denegado.
- Acceso a un id de otra empresa → `NOT_FOUND` (RF-16).
- La evidencia y la auditoría no tienen operación de modificación o borrado (CA-02.3, CA-17.3).
- `QuotaExceededError` simulado → fallido `STORAGE_FULL` con la evidencia intacta.
- `getTraceability` devuelve la secuencia esperada para HU-06, con el `userId` de la sesión
  (CF-06).
- **`accountingStore`**: guardar y cargar empresas, catálogo y sesión devuelve lo mismo; sin datos
  → semilla (CA-18.1b).
- `resetDemoData` deja el estado idéntico al sembrado, **incluidos catálogos y periodos**, y
  conserva la sesión (CF-08, R-17).

### 8.3 Validación manual de la UI

Con [quickstart.md](quickstart.md): los 14 escenarios de ingestión, los 11 de integración
(I-1 a I-11), los 14 del motor de plantillas (P-1 a P-14) y los controles transversales. Según la constitución V, los componentes React no
llevan pruebas automáticas.

### 8.4 Gates antes de dar la feature por terminada

`npm run build` ✔ · `npm test` ✔ · quickstart completo ✔ · la recarga conserva el estado
(incluido el catálogo) y el reinicio vuelve a la semilla ✔ · Compras, Ventas y Catálogo de
Cuentas siguen funcionando ✔.

## 9. Matriz de cobertura de requisitos

| Requisito | Dominio | Servicio / almacenamiento | UI | Pruebas |
|---|---|---|---|---|
| RF-01 Carga (CA-01.1..6, 01.2b, 01.2c) | `pipeline`, `parsers/registry`, `templates` | `ingestBatch`, `listSampleCatalog`, `listTemplates` | IngestionView, BatchSummary | 8.1 pipeline, templates; 8.2 límites, plantilla no activa |
| RF-02 Evidencia | `pipeline` (paso 1) | `repository` append-only, `getRawPayload` | EntryDetailModal, TraceabilityModal | 8.2 sin mutadores; cuota |
| RF-03 Duplicados | `dedup`, `pipeline` | `ingestBatch`, `queryIntakeResults` | pestaña Duplicados | 8.1 dedup; 8.2 CF-02 |
| RF-04 Interpretación | `parsers/*`, `canonical` | `ingestBatch` | EntryDetailModal | 8.1 parsers, canonical |
| RF-05 Fallidos | `canonical`, `parsers/*` | `queryIntakeResults` | pestaña Fallidos | 8.1; 8.2 catálogo |
| RF-06 Pertenencia | `classify` | `ingestBatch` (RUC de la empresa persistida) | pestaña Rechazados | 8.1 classify |
| RF-07 Tipo de cambio | `fx`, `money` | `ingestBatch`, `setFxServiceDown` | EntryDetailModal, DemoControls | 8.1 fx |
| RF-08 Borrador (CA-08.1..08.5) | `translator`, `accounts`, `templates/evaluator` | lectura de `chartOfAccounts`, `templates` y `templateActivations` | EntryDetailModal | 8.1 translator, accounts, evaluator |
| RF-09 Validación (CA-09.1..09.5) | `validator`, `accounts`, `periods`, `money` | `ingestBatch`, `updateStagingEntries`, `serviceKit` (solo lectura) | ReasonBadges, ReadOnlyPeriodBanner | 8.1 validator, periods; 8.2 periodo cerrado y reabierto |
| RF-10 Bandeja | `staging` | `queryStaging`, `getJournalEntry` | BandejaView | 8.1 staging |
| RF-11 Completar y recalcular | `staging`, `pipeline` (pasos 5-7) | `updateStagingEntries`, `revalidateEntries` (catálogo y periodos vigentes) | BandejaView | 8.2 catálogo vigente, lote, conflicto |
| RF-12 Cancelación | `stateMachine` | `cancelEntry` | BandejaView | 8.1; 8.2 |
| RF-13 Pendientes | — | `queryPendingApproval` | PendientesAprobacionView | 8.2 CF-03 |
| RF-14 Estados | `stateMachine` | todos los que escriben | — | 8.1 stateMachine |
| RF-15 Permisos (CA-15.1..15.6) | `permissions` | `serviceKit.authorize`; login (usuarios demo) | LoginView, botones por rol | 8.1 permissions; 8.2 CF-07 |
| RF-16 Aislamiento | `dedup` (tenant en la clave) | `repository` (claves por empresa), `NOT_FOUND` | useIngestionContext | 8.2 aislamiento |
| RF-17 Trazabilidad | `audit` | `getTraceability`, auditLog append-only | TraceabilityModal | 8.2 CF-06 |
| RF-18 Persistencia y demo (CA-18.1..18.4, 18.1b) | — | `repository`, `accountingStore`, `demoService` | DemoControls, BackupsView | 8.2 accountingStore, reinicio; quickstart I-5 |
| RF-19 Editor de plantillas | `templates/schema`, `templates/conditions`, `templates/templateAccounts` | `createTemplate`, `saveTemplateDraft`, `getTemplate`, `listTemplateBank` | PlantillasGlobalesView, TemplateEditor, RuleList, ConditionBuilder, ActionEditor, SplitEditor | 8.1 schema, conditions; 8.2 templateService |
| RF-20 Evaluación de reglas | `templates/evaluator`, `translator` | `ingestBatch`, `revalidateEntries` | EntryDetailModal (regla por línea) | 8.1 evaluator, translator |
| RF-21 Pruebas y activación | `templates/testRunner`, `templates/lifecycle` | `runTemplateTests`, `activateTemplateVersion` | TestCasesPanel | 8.1 testRunner, lifecycle; 8.2 CF-10 |
| RF-22 Versionado inmutable | `templates/lifecycle`, `templates/diff` | `editTemplate`, `deleteTemplateDraft`, `retireTemplate` | VersionHistory | 8.1 lifecycle, diff; 8.2 CF-11 |
| RF-23 Activación por empresa | `ingestion/templates`, `templates/templateAccounts` | `listCompanyTemplateActivations`, `setCompanyTemplateActivation`, `listTemplates` | PlantillasEmpresaView, AccountWarnings | 8.1 templates; 8.2 templateService |
| RNF-01 Exactitud | `money`, `fx` | — | — | 8.1 propiedad Debe = Haber |
| RNF-02 Tiempo | — | `serviceKit` (R-14) | estados de carga | quickstart |
| RNF-03 Aislamiento de fallos | `pipeline` | `ingestBatch` | — | 8.2 lote mixto |
| RNF-04 Controles efectivos | `permissions`, `stateMachine`, `periods` | validación en el servicio con datos vigentes | — | 8.2 FORBIDDEN / PERIOD_READ_ONLY / INVALID_TRANSITION |
| RNF-05 Idioma | textos de motivos | mensajes de error | todas las vistas | revisión manual |
| RNF-06 Determinismo | reloj e IDs inyectados | interruptor explícito | DemoControls | 8.1 con reloj fijo |
| RNF-07 Datos ficticios | — | — | — | revisión de semillas |
| RNF-08 Consistencia visual | — | — | Sidebar del modo empresa, theme.css, Modal, MetricCard | quickstart |

Todos los RF-01 a RF-23 (incluidos CA-01.2b, CA-01.2c, CA-08.5, CA-09.5, CA-11.3, CA-15.2b,
CA-15.5, CA-15.6 y CA-18.1b) y RNF-01 a RNF-08 tienen al menos un módulo responsable y una
verificación.

## Constitution Check (después del diseño)

Se revisó tras la fase 1 y la integración, sin violaciones nuevas:

- La lógica de negocio está en el dominio; los servicios orquestan y persisten (I, III).
- El dominio recibe catálogo, periodos y plantillas como datos (III).
- La integración **reduce** violaciones existentes de la constitución I: el acceso directo a
  localStorage en `AccountingContext` y en `BackupsView`.
- Los cambios a archivos existentes son los mínimos que pide la spec y están listados (VII).

**Estado**: ✅ aprobado.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Cuota de localStorage (ahora también con catálogos y empresas) | Unas 70 cuentas por empresa ocupan pocos KB; límite de 1 MB por archivo; manejo de `STORAGE_FULL`; indicador de uso (R-07) |
| Campo de CC con dos nombres (`requiereCC` / `requiereCentroCostos`) | Normalización en `accounts.js` (R-16). Deuda técnica: unificar el nombre en `ModalCuenta` en una feature del catálogo |
| Contexto desactualizado entre pestañas (catálogo o periodos editados en otra) | Los servicios leen siempre del repositorio; la UI se actualiza al recargar |
| Cambiar la persistencia del `AccountingContext` puede romper vistas existentes | Misma forma de datos y mismas funciones; la carga cae en la semilla actual; quickstart §5 "Módulos existentes" |
| Empresas nuevas creadas con catálogo "en blanco" | Todo comprobante cae en "cuenta inexistente": comportamiento esperado y explicado por el motivo |
| Diferencias de versión UBL entre emisores | El parser exige solo los campos de CA-04.2 |
| Editor de reglas complejo de usar | Formularios guiados (campo, operador y valor según el tipo), suma del prorrateo en vivo, errores con la ruta de la regla; casos de prueba obligatorios antes de activar |
| Reglas mal configuradas generan asientos incorrectos en masa (riesgo del SDD) | Pruebas obligatorias por regla (R-22), versiones inmutables y asientos que muestran la regla aplicada |
| Divergencia entre las plantillas de Compras/Ventas (`mockPlantillas`) y el banco | Documentado como fuera de alcance (R-25); ambas parten de la misma semilla |

## Complexity Tracking

| Adición o cambio | Por qué se necesita | Alternativa más simple descartada porque |
|---|---|---|
| `vitest` (desarrollo) | Framework de pruebas obligatorio por la constitución V | No hay alternativa |
| `happy-dom` (desarrollo) | `DOMParser` en las pruebas del parser UBL (R-06) | `jsdom` es más pesada; un parser falso no prueba el mapeo |
| Persistencia en `AccountingContext` | CA-18.1b: el catálogo y los periodos deben sobrevivir a la recarga | Dejarlo en memoria contradice la aclaración del 2026-09-21 |
| Usuarios demo en `LoginView` / `iniciarSesion` | CA-15.6: sin Checker ni Auditor no se demuestran HU-06 ni HU-07 | Un selector propio duplicaría la identidad (descartado en la aclaración) |
| `BackupsView` llama a `resetDemoData` | CA-18.2 y constitución I | Dos reinicios distintos dejarían datos inconsistentes |
| Cuentas 659/6591101 y plantilla PL-06 en los mocks globales | Demo de HU-03 con la regla de CC por defecto que incluye `amarre3` | Quitar el `amarre3` de una cuenta existente altera datos de otros módulos |
| Reemplazar `PlantillasView` por dos vistas | La spec (RF-19 a RF-23) y la spec de Empresas (RF-106) piden un banco editable y una activación por empresa; la vista actual es de solo lectura | Mantenerla mostraría plantillas distintas de las que usa la ingestión |
| Carpeta `src/domain/templates/` separada | El motor de plantillas es un subdominio con 7 módulos y sus pruebas; separado de la ingestión se prueba y se reutiliza mejor (lo usará también la aprobación) | Meterlo en `domain/ingestion/` mezcla responsabilidades |
| Cuentas 61/611/6111101 en `mockPlanContable` | El amarre Haber de 6011101 apunta a 6111101, que no existe: toda compra con PL-01 caería en "cuenta inexistente" (y el motor actual de Compras también falla) (R-19) | Quitar los amarres de 6011101 cambia la contabilidad de la compra de mercaderías |
