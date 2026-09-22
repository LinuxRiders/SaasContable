# Research — 001 Ingestión de Comprobantes

**Fase 0 del plan.** Resuelve las incógnitas técnicas antes del diseño. Cada entrada tiene el
formato Decisión / Justificación / Alternativas descartadas. Las decisiones resumidas en
[plan.md](plan.md#decisiones-técnicas) remiten aquí (R-xx).

---

## R-01 — Representación de montos

- **Decisión**: todos los montos del dominio se guardan como **enteros en céntimos**
  (`amountCents`). Las tasas de cambio se guardan como **enteros en milésimas** (`rateMilli`,
  p. ej. 3.751 → `3751`), porque SUNAT publica las tasas con 3 decimales. El formato para
  mostrar (`S/ 1,180.00`) solo se aplica en la UI.
- **Justificación**: constitución II ("prohibida la aritmética flotante acumulativa") y RNF-01.
  Con enteros, las sumas son exactas y la única operación que redondea es la conversión de
  moneda.
- **Alternativas descartadas**: números decimales en coma flotante con `toFixed(2)`, como hace
  hoy `registrarCompra` (acumula error en sumas largas); una librería decimal (`decimal.js`,
  `big.js`), que es una dependencia innecesaria (constitución VI).

## R-02 — Conversión USD → PEN sin descuadre por redondeo (RD-09, RF-07)

- **Decisión**: se convierten con redondeo una sola vez (half-up) el **total** y el **IGV**. La
  **base en soles se deriva**: base PEN = total PEN − IGV PEN. Las líneas de amarre usan esa base
  derivada. Cada monto en soles se calcula una sola vez y el asiento cuadra por construcción.
  Fórmula: `round(amountCents × rateMilli / 1000)`, con aritmética entera.
- **Justificación**: si se convirtieran por separado base, IGV y total, el redondeo podría dejar
  un céntimo de diferencia. Eso mandaría a la bandeja por "descuadre" una factura válida, que el
  Maker no puede corregir (no edita montos). La derivación respeta RD-09: no hay redondeo
  acumulativo y la cuenta por pagar o cobrar coincide exactamente con el total del comprobante.
- **Alternativas descartadas**: convertir las tres cifras y llevar la diferencia a una cuenta de
  diferencia de cambio (676/776), que es contablemente incorrecto, porque no es una diferencia de
  cambio; repartir el residuo en la línea mayor, que es menos transparente para el auditor.

## R-03 — Validación de consistencia de montos en moneda original (RF-09)

- **Decisión**: la regla "montos inconsistentes" se evalúa **en la moneda del comprobante**, con
  tolerancia de 1 unidad mínima (S/ 0.01 o USD 0.01):
  - `|base gravada + base exonerada/inafecta + IGV − total| ≤ 1`
  - `|IGV − round(base gravada × 18%)| ≤ 1`
- **Justificación**: la spec expresa la tolerancia en soles pensando en facturas en PEN. En USD,
  la inconsistencia es del emisor y debe medirse en su moneda; convertir primero mezclaría el
  redondeo de la conversión con el error del documento.
- **Alternativas descartadas**: evaluar después de convertir, porque confunde el error de origen
  con el redondeo propio.

## R-04 — Hash de idempotencia (RD-04, RF-03)

- **Decisión**: la clave es `tenantId|rucEmisor|tipoDoc|serieNumero|fechaEmision`, normalizada
  (sin espacios, en mayúsculas y con la serie-número en formato `F001-00000123`). El hash es
  **SHA-256 en hexadecimal** calculado con Web Crypto (`crypto.subtle.digest`), una API asíncrona
  disponible en el navegador y en Node 18 o superior (necesario para Vitest). Se guarda además un
  índice `dedupHash → documentId` por empresa.
- **Justificación**: es lo que pide el SDD (hash criptográfico), usa una API nativa (constitución
  VI) y el índice permite encontrar el original en O(1).
- **Alternativas descartadas**: comparar la clave en texto plano, que funciona pero se aparta del
  SDD y expone datos en el índice; una librería de hash, que es innecesaria.

## R-05 — Lectura de XML UBL 2.1 (SUNAT) (RF-04)

- **Decisión**: se usa `DOMParser` nativo con consultas por namespace. Mapeo mínimo:

  | Dato estándar | Ruta UBL 2.1 (Invoice) |
  |---|---|
  | Tipo de documento | `cbc:InvoiceTypeCode` (debe ser `01`) |
  | Serie-número | `cbc:ID` |
  | Fecha de emisión | `cbc:IssueDate` |
  | Moneda | `cbc:DocumentCurrencyCode` |
  | RUC / razón social emisor | `cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID` (`schemeID="6"`) / `cac:PartyLegalEntity/cbc:RegistrationName` |
  | RUC / razón social receptor | `cac:AccountingCustomerParty/…` (misma ruta) |
  | IGV total | `cac:TaxTotal/cbc:TaxAmount` |
  | Bases por tributo | `cac:TaxTotal/cac:TaxSubtotal` con `cbc:TaxableAmount`; `cac:TaxCategory/cac:TaxScheme/cbc:ID`: `1000` = IGV (gravado), `9997` = exonerado, `9998` = inafecto |
  | Total a pagar | `cac:LegalMonetaryTotal/cbc:PayableAmount` |
  | Líneas | `cac:InvoiceLine`: `cbc:ID`, `cbc:LineExtensionAmount`, `cac:Item/cbc:Description` |

  Si la raíz es `CreditNote` o `DebitNote`, o el `InvoiceTypeCode` es distinto de `01` (por
  ejemplo, `03` = boleta), el resultado es "tipo de documento no soportado en esta versión". La
  firma digital del XML (`ext:UBLExtensions`) se ignora; no se verifica en el prototipo.
- **Justificación**: es una API nativa (constitución VI) y el mapeo cubre justo los campos
  obligatorios de CA-04.2.
- **Alternativas descartadas**: `fast-xml-parser` u otra librería (dependencia evitable);
  expresiones regulares (frágiles ante namespaces y formato).

## R-06 — `DOMParser` en las pruebas

- **Decisión**: se agrega **`happy-dom`** como dependencia de desarrollo. Solo los archivos de
  prueba del parser UBL la activan, con el comentario `@vitest-environment happy-dom`; el resto
  corre en el entorno `node`.
- **Justificación**: Node no trae `DOMParser`. Las pruebas del parser son obligatorias
  (constitución V), y `happy-dom` es liviana y solo de desarrollo.
- **Alternativas descartadas**: `jsdom`, más pesada; inyectar un parser XML falso, que no
  probaría el mapeo real.

## R-07 — Persistencia en localStorage y límite de cuota (RF-18, CA-01.6)

- **Decisión**: se usa un único repositorio con claves `contableos:v1:<tenantId>:<colección>`
  (colecciones globales con `tenantId = global`). Colecciones:
  - Por empresa: `rawPayloads`, `documents`, `dedupIndex`, `journalEntries`, `batches`,
    `auditLog`, **`chartOfAccounts`** (el catálogo de cuentas de la empresa, ver R-10) y
    **`templateActivations`** (plantillas activadas para la empresa, ver R-11).
  - Globales: **`empresas`** (incluye los periodos y las plantillas activas de cada empresa, ver
    R-15), `templates` (banco de plantillas con sus versiones, ver R-20), `auditLog` global (las
    operaciones del banco de plantillas), `fxRates`, `demoSettings`, **`session`** (ver R-13) y
    `meta`.

  Toda escritura captura `QuotaExceededError`. Si ocurre, el comprobante afectado queda
  "fallido: almacenamiento del navegador lleno" (sin escrituras parciales) y la UI sugiere
  reiniciar los datos de demostración. La vista de carga muestra el espacio usado.
- **Justificación**: localStorage da entre 5 y 10 MB por origen. El límite de 1 MB por archivo
  (aclaración D-01) cabe, pero 50 archivos grandes no. Las facturas UBL reales pesan entre 5 y
  30 KB, así que el caso normal cabe de sobra, y el caso extremo se degrada de forma controlada.
- **Alternativas descartadas**: IndexedDB (más capacidad, pero la constitución I fija
  localStorage y agrega complejidad); comprimir los payloads (complejidad sin beneficio en una
  demo).

## R-08 — Atomicidad al procesar un comprobante

- **Decisión**: cada comprobante se procesa en memoria y se confirma con **una sola escritura
  por colección afectada**, en este orden: evidencia (append-only) → documento → índice de
  duplicados → asiento → eventos de auditoría → lote. La evidencia siempre se escribe primero
  (RD-01). Si una escritura posterior falla, el comprobante queda "fallido" con la evidencia ya
  guardada y un evento de auditoría del error.
- **Justificación**: localStorage no tiene transacciones. Este orden garantiza que nunca exista
  un asiento sin su evidencia.
- **Alternativas descartadas**: un journal o undo-log para simular transacciones, que es
  excesivo para un prototipo (YAGNI).

## R-09 — Concurrencia optimista (CA-11.6)

- **Decisión**: cada asiento tiene un `entityVersion` entero. Toda operación de escritura
  recibe `expectedVersion`; si no coincide con la versión guardada, responde `CONFLICT`. Cada
  operación lee el estado fresco desde el almacenamiento, nunca desde una caché de la UI. La UI
  escucha el evento `storage` del navegador para refrescarse cuando otra pestaña escribe.
- **Justificación**: dos pestañas comparten el mismo localStorage, así que se reproduce el
  conflicto del SDD (RNF-13) con un mecanismo trivial.
- **Alternativas descartadas**: bloqueo pesimista (sin sentido sin servidor); "gana el último"
  (viola CA-11.6).

## R-10 — Catálogo de cuentas por empresa como fuente única (CA-08.5, CA-18.1b)

- **Decisión**: el catálogo de cada empresa (`planesPorEmpresa[empresaId]` del
  `AccountingContext`) pasa a persistirse en el repositorio, en
  `contableos:v1:<empresaId>:chartOfAccounts`.
  - `AccountingContext` carga su estado inicial desde el repositorio (con semilla PCGE si no
    existe) y escribe en él cada vez que cambia un catálogo: `guardarCuenta`, `eliminarCuenta`,
    `aplicarPlanContable`, `clonarPlanContable`, `agregarEmpresa`.
  - Los servicios de ingestión leen el catálogo **directamente del repositorio** por `tenantId`,
    en cada operación. No hay inyección desde React.
  - El dominio recibe el catálogo como dato, ya normalizado (R-16).
- **Justificación**: hay una sola fuente de verdad para la ingestión y para las vistas del
  catálogo. Las ediciones del usuario sobreviven a la recarga (aclaración del 2026-09-21), la
  revalidación de un asiento usa el mismo catálogo que ve el usuario, y los servicios siguen sin
  importar React (constitución III).
- **Alternativas descartadas**: inyectar `getPlanContable()` desde el contexto (la ingestión
  perdería las cuentas del usuario al recargar); guardar en cada asiento una copia de sus cuentas
  (duplica datos y la revalidación quedaría desalineada del catálogo real).
- **Impacto en código existente**: cambio acotado en `AccountingContext.jsx` (carga inicial y
  escritura por el repositorio). Las vistas del catálogo (`PlanContableView`, `ModalCuenta`,
  `ModalAuditoriaPlan`, `ModalClonarPlan`) no cambian: siguen usando las mismas funciones del
  contexto.

## R-11 — Plantillas globales versionadas y activadas por empresa (RF-08, CA-01.2b, RF-23, RD-10)

> Revisada el 2026-09-22: el filtro por categorías se reemplaza por la **activación explícita
> por empresa** (colección `templateActivations`). El mapeo de categorías sigue existiendo, pero
> solo como fuente de las activaciones iniciales.

- **Decisión**:
  1. Las plantillas viven en el **banco global** (`contableos:v1:global:templates`) con el modelo
     de R-20: identidad estable más versiones (BORRADOR, ACTIVA, RETIRADA).
  2. **Semilla**: cada plantilla de `mockPlantillas` (PL-01 a PL-06) se siembra como **versión 1
     ACTIVA**, sin reglas: sus cuentas planas pasan a `defaults`, con **un caso de prueba**
     generado (constitución V). Se siembra además **PL-07 "Servicios varios con reglas"**
     (compra) con reglas de ejemplo: "FLETE" → 6311101 con CC-LOGISTICA; "LUZ" o "AGUA" →
     6361101 con CC-ADMIN; "SEGURO" → prorrateo 60 % 6511101 con CC-ADMIN y 40 % 6511101 con
     CC-LOGISTICA. Tiene un caso de prueba por regla.
  3. **Activaciones iniciales** (CA-23.3): si una empresa no tiene la colección
     `templateActivations`, se crea la primera vez a partir de `empresa.plantillasActivasIds` con
     el mapeo existente de `mockCategoriasPlantilla.js`:

     | Plantilla activa de la empresa | Plantillas activadas |
     |---|---|
     | `TPL-COMPRA-01` | PL-01 |
     | `TPL-SERV-01` | PL-02, PL-03, PL-06, PL-07 |
     | `TPL-VENTA-01` | PL-04, PL-05 |

     Así funcionan igual las empresas semilla y las que crea `EmpresasView` con sus
     `plantillasActivasIds`. Una empresa sin `plantillasActivasIds` queda sin plantillas (aviso
     de CA-01.2b).
  4. **Cuentas nuevas en los mocks** (para la demo de HU-03): se agregan a `mockPlanContable`
     las cuentas **659** (sintética) y **6591101** (de uso, exige CC, amarres 9411101/7911101,
     **sin `amarre3`**), y se agrega **PL-06** a `mockPlantillas`. Con la regla de CC por defecto
     que incluye `amarre3`, ninguna cuenta de gasto existente produciría "falta centro de costo".
- **Justificación**: es la decisión del 2026-09-22 (banco global más activación por empresa). La
  migración perezosa reutiliza los datos que el módulo de empresas ya guarda, sin cambiar
  `EmpresasView`.
- **Alternativas descartadas**: seguir filtrando por categorías (no permite activar una plantilla
  concreta); plantillas por empresa (descartado en la aclaración); quitar el `amarre3` de una
  cuenta existente (altera datos que usan otros módulos).

## R-12 — Tasas de cambio y caída simulada (RF-07)

- **Decisión**: la tabla semilla `fxRates` tiene tasas venta USD→PEN por día hábil, de
  2026-06-01 a 2026-09-30, con huecos en fines de semana, como en la publicación real. Reglas de
  resolución:
  1. Servicio disponible y hay tasa exacta para la fecha → esa tasa, no provisional.
  2. Servicio disponible y no hay tasa exacta (por ejemplo, domingo) → la tasa más reciente
     anterior, marcada provisional. Es lo que dice CA-07.3: "no tiene tasa para esa fecha".
  3. Servicio caído (interruptor activo) → la tasa más reciente anterior **a la fecha de
     emisión**, marcada provisional.
  4. No hay ninguna tasa anterior → la tasa queda sin resolver y el asiento va a la bandeja con
     el motivo "sin tipo de cambio".

  Con el servicio caído, la resolución nunca usa la tasa exacta del día.
- **Justificación**: así se cumplen CA-07.3 y CA-07.4 de forma determinista (RNF-06).
- **Alternativas descartadas**: caídas aleatorias (viola RNF-06).

## R-13 — Identidad desde el login existente (constitución IV, RF-15, CA-15.5, CA-15.6)

- **Decisión**:
  - La ingestión **no** tiene sesión propia. Un hook `useIngestionContext()` arma
    `ctx = { tenantId, userId, role, activePeriod }` a partir del `AccountingContext`:
    `sesionUsuario.usuarioId`, `sesionUsuario.rol`, `empresaActiva.id` y
    `{ ejercicioActivo, periodoActivo }`.
  - Mapeo de roles:

    | Rol de la sesión | Rol en la ingestión |
    |---|---|
    | `Maker` | `MAKER` |
    | `Checker` | `CHECKER` |
    | `Auditor` | `AUDITOR` |
    | `Admin` | `ADMIN`: igual que `AUDITOR` en la carga y la bandeja; además administra el banco de plantillas y las activaciones por empresa (aclaración del 2026-09-22) |
    | cualquier otro | `UNKNOWN` (solo lectura, todo se deniega) |

  - Se agregan al login mock (`iniciarSesion` y los botones de acceso rápido de `LoginView`) dos
    usuarios: **`revisor_luis`** (Checker) y **`auditora_ana`** (Auditor).
  - La sesión deja de usar `localStorage.getItem('sesionUsuario')` directamente y pasa por el
    repositorio (clave `contableos:v1:global:session`), porque la constitución I prohíbe a los
    contextos tocar localStorage.
- **Justificación**: es la decisión de la aclaración del 2026-09-21. Evita dos identidades en
  paralelo y aprovecha el modo global/empresa que ya existe.
- **Alternativas descartadas**: selector propio en el Header (duplica identidad); selector "actuar
  como" (no elegido).
- **Nota**: como la ingestión solo existe dentro del modo empresa, "cambiar de empresa en medio de
  un lote" equivale a "salir de la empresa". El lote ya iniciado conserva su `tenantId`.

## R-14 — Latencia simulada (constitución I, RNF-02)

- **Decisión**: `demoSettings.latencyMs` vale 150 ms por operación y 40 ms por comprobante
  dentro de un lote. Un lote de 20 comprobantes tarda unos 1.0 s (por debajo del límite de 5 s
  de RNF-02); uno de 50 tarda unos 2.2 s. La latencia se puede poner en 0 para las pruebas.
- **Justificación**: la UI muestra estados de carga creíbles sin romper RNF-02.
- **Alternativas descartadas**: sin latencia (no se ejercitan los estados de carga); latencia
  aleatoria (viola RNF-06).

## R-15 — Periodos desde las empresas persistidas (CA-09.4, CA-09.5, CA-18.1b)

- **Decisión**:
  - La lista `empresas` del `AccountingContext` se persiste en la colección global `empresas`.
    Incluye `periodos`, `plantillasActivasIds` y las empresas nuevas. `cambiarEstadoPeriodo` y
    `agregarEmpresa` escriben por el repositorio. Se elimina la colección `periods` que el plan
    anterior tenía por separado.
  - **Periodo abierto**: la fecha de emisión `YYYY-MM-DD` se traduce a `{ ejercicio: YYYY,
    mes: MM }` y se busca en `empresa.periodos`. Si su estado es `ABIERTO`, pasa. Si es
    `CERRADO`, o el mes no figura en la lista, el motivo es `PERIOD_CLOSED`.
  - **Solo lectura** (CA-09.5): toda operación de escritura (`ingestBatch`,
    `updateStagingEntries`, `revalidateEntries`, `cancelEntry`) busca en el repositorio el estado
    del `ctx.activePeriod`. Si está `CERRADO`, responde `PERIOD_READ_ONLY` y registra
    `ACTION_DENIED`. La UI además muestra un aviso y desactiva los botones.
- **Justificación**: se reutiliza el modelo de periodos del módulo de empresas (no hay dos
  calendarios). El control en el servicio cumple RNF-04 aunque la UI tenga un estado viejo.
- **Alternativas descartadas**: calendario propio de la ingestión (duplicado e incoherente con el
  módulo de empresas); confiar en `estadoPeriodo` que envía la UI (se puede manipular y queda
  desactualizado si otra pestaña cierra el periodo).

## R-16 — Lectura normalizada de las cuentas del catálogo (CA-08.4, RF-09)

- **Decisión**: el servicio adapta cada cuenta del catálogo a una forma estable para el dominio,
  sin modificar el catálogo guardado:

  | Campo del dominio | Origen en el catálogo |
  |---|---|
  | `code` | `codigo` |
  | `isPostable` | `esCuentaU === true` |
  | `requiresCostCenter` | `requiereCC === true \|\| requiereCentroCostos === true` |
  | `defaultCostCenter` | `amarre3` no vacío, o `null` |
  | `destDebit` / `destCredit` | `amarre1` / `amarre2`, solo si ambos existen |

  Reglas de validación, alineadas con `utils/accountingEngine.js` (aclaración del 2026-09-21):
  1. Toda línea tiene una cuenta que existe en el catálogo de la empresa → si no,
     `ACCOUNT_NOT_FOUND`.
  2. Esa cuenta es de uso → si no, `ACCOUNT_NOT_POSTABLE`.
  3. Si la plantilla (para las líneas de gasto y destino) o la cuenta de la línea exigen centro
     de costo, la línea debe tenerlo → si no, `MISSING_COST_CENTER`.

  Centro de costo por defecto (CA-08.4): el de la plantilla; si no tiene, el `amarre3` de la
  cuenta base; si tampoco, vacío.
- **Justificación**: los datos semilla y el motor usan `requiereCC`, pero `ModalCuenta` guarda
  `requiereCentroCostos`. Sin normalizar, una cuenta editada por el usuario dejaría de exigir
  centro de costo en la ingestión.
- **Alternativas descartadas**: llamar a `generarAsientoContable` del motor existente (usa
  flotantes y recalcula el IGV como total/1.18, lo que contradice CA-04.3 y R-01; se reutilizan
  sus reglas, no su código); corregir `ModalCuenta` para unificar el nombre del campo (es un
  cambio en otro módulo; se deja como deuda técnica en Riesgos).

## R-17 — Reinicio unificado de datos de demostración (CA-18.2)

- **Decisión**: `demoService.resetDemoData` es el **único** reinicio. Borra todas las claves
  `contableos:v1:*` y vuelve a sembrar empresas (con periodos), catálogos PCGE por empresa,
  plantillas, tasas y la semilla de ingestión. El botón existente "Reset a datos semilla" de
  `BackupsView`, que hoy hace `localStorage.clear()`, pasa a llamar a este reinicio y luego
  recarga el estado del `AccountingContext`. La sesión se conserva para no expulsar al usuario;
  el `DemoControls` de la ingestión llama a la misma operación.
- **Justificación**: un solo reinicio coherente. `localStorage.clear()` borraría también datos
  de otros orígenes del mismo dominio de desarrollo, y viola la constitución I (la vista toca
  localStorage directamente).
- **Alternativas descartadas**: dos botones de reinicio con alcances distintos (confuso); dejar
  `localStorage.clear()` (viola la constitución y cierra la sesión sin avisar).

## R-18 — Adaptador de persistencia para el `AccountingContext` (constitución I)

- **Decisión**: se agrega `services/storage/accountingStore.js` con operaciones síncronas
  `loadEmpresas`, `saveEmpresas`, `loadChartOfAccounts(empresaId)`,
  `saveChartOfAccounts(empresaId, cuentas)`, `loadSession`, `saveSession` y `clearSession`,
  construidas sobre el mismo `repository`. El contexto las usa en inicializadores perezosos de
  `useState` y en `useEffect`s que guardan cuando cambian `empresas` o `planesPorEmpresa`.
- **Justificación**: el contexto necesita lectura síncrona al montar (localStorage lo permite) y
  no debe conocer claves ni formato. La ingestión (asíncrona) y el contexto (síncrono) comparten
  el mismo repositorio.
- **Alternativas descartadas**: que el contexto llame a los servicios asíncronos (complica el
  montaje y agrega latencia simulada a acciones que hoy son instantáneas); claves
  `localStorage` sueltas en el contexto (viola la constitución I).

## R-19 — Completar el PCGE semilla (defecto existente)

- **Decisión**: se agregan a `mockPlanContable` las cuentas `61` "Variación de inventarios" y
  `611` "Mercaderías" (sintéticas), y `6111101` "Variación de mercaderías" (de uso, sin exigencia
  de centro de costo).
- **Justificación**: la cuenta 6011101 tiene `amarre2 = 6111101`, pero esa cuenta no existe en la
  semilla. Con la validación contra el catálogo (aclaración del 2026-09-21), toda compra con PL-01
  "Compra de Mercaderías", que es el escenario principal de HU-01, caería en "cuenta inexistente".
  El motor contable actual de Compras (`generarAsientoContable`) también la reporta como error, así
  que el cambio corrige ese módulo.
- **Alternativas descartadas**: quitar los amarres de 6011101 (cambia la contabilidad de la
  compra de mercaderías); usar otra plantilla en el escenario principal (oculta el defecto).

## R-20 — Modelo de plantilla con reglas (árbol de reglas serializable) (RF-19, RF-22, SDD §13.3)

- **Decisión**: la colección global `templates` guarda **plantillas** y cada una lleva sus
  **versiones**:

  ```text
  Template { templateId, code, name, operationType, createdBy, createdAt, retiredAt|null, versions[] }
  TemplateVersion {
    version, status: DRAFT|ACTIVE|RETIRED, basedOnVersion|null,
    defaults: { baseAccount, taxAccount, counterpartAccount, appliesIgv,
                requiresCostCenter, defaultCostCenter|null },
    documentRules: Rule[], lineRules: Rule[], testCases: TestCase[],
    lastTestRun: { at, by, results[], allPassed, uncoveredRuleIds[] } | null,
    createdBy, createdAt, updatedAt, activatedBy|null, activatedAt|null,
    diffFromPrevious: string[] | null, usageCount
  }
  Rule { ruleId, name, priority, when: Condition, then: Action }
  Condition = { op: "and"|"or", args: Condition[] } | { op: "not", arg: Condition }
            | { op: Comparator, field: Field, value }
  ```

  - **Comparadores** (CA-19.3): `contains`, `startsWith`, `equals`, `gt`, `gte`, `lt`, `lte`,
    `between` (valor `[a, b]`), `in` (lista).
  - **Campos**: `line.description`, `line.amountCents`, `line.taxCode`, `issuer.fiscalId`,
    `issuer.name`, `receiver.fiscalId`, `receiver.name`, `currency`, `totalCents`, `issueDate`,
    `operationType`. En las reglas de comprobante no se permiten los campos `line.*`.
  - **Acciones de comprobante**: `{ taxAccount?, counterpartAccount?, defaultCostCenter?, tags? }`.
  - **Acciones de línea**: `{ baseAccount?, costCenter?, tags? }` **o**
    `{ split: [{ account, costCenter?, basisPoints }] }`, con `basisPoints` que suman
    exactamente 10000.
  - Comparaciones de texto sin distinguir mayúsculas ni tildes; montos en céntimos (el editor
    convierte "100.00" a 10000).
  - `diffFromPrevious` es una lista legible generada al activar (por ejemplo, "Regla 'FLETE':
    cuenta 6311101 → 6312101").
- **Justificación**: es el `ASTTemplate` del SDD, adaptado a un editor visual: JSON puro,
  serializable y validable, sin `eval` ni código dinámico (constitución VI). La separación entre
  reglas de comprobante y de línea permite decidir la cuenta de IGV y la contrapartida una vez, y
  la base por línea.
- **Alternativas descartadas**: expresiones de texto parseadas (necesitan un parser y son
  propensas a errores del usuario); JSON Logic u otra librería (dependencia nueva, constitución
  VI); guardar la plantilla plana más una "tabla de reglas" (no admite Y/O/NO anidados).

## R-21 — Semántica del evaluador y del prorrateo (RF-20, CA-20.1 a CA-20.5)

- **Decisión** (`domain/templates/evaluator.js`, puro y determinista):
  1. Se evalúan las `documentRules` sobre el documento estándar, ordenadas por `priority`
     ascendente y luego por `ruleId`. **Gana la primera** que se cumple; sus acciones se combinan
     sobre `defaults`.
  2. Por cada línea del documento se evalúan las `lineRules` con el mismo criterio. Sin regla, la
     línea usa `defaults.baseAccount` y el CC por defecto (CA-08.4).
  3. **Montos en soles**: primero se calcula la base PEN total del comprobante según R-02. Luego
     se reparte entre las líneas en proporción a su monto original, redondeando hacia abajo y
     llevando el residuo a la última línea. Después se aplica el `split` de cada línea con la
     misma regla: `floor(monto × bp / 10000)` por parte y el residuo a la última parte. Así cada
     monto sale de una única operación de redondeo (RD-09) y el total cuadra.
  4. Se agrupan las partes con igual `(side, account, costCenter)` y se omiten las de monto 0.
  5. Por cada cuenta base con `amarre1` y `amarre2` en el catálogo se generan las líneas de
     destino por el mismo monto y CC.
  6. Cada línea del asiento guarda `ruleId` (o `null` si se usó el valor por defecto), y el
     asiento guarda `appliedRules` (CA-20.4).
- **Justificación**: el orden fijo y la regla "gana la primera" hacen el resultado predecible y
  fácil de probar (RNF-06, CA-20.5). Derivar primero la base y después repartirla mantiene R-02
  intacto.
- **Alternativas descartadas**: aplicar todas las reglas que se cumplen (resultados ambiguos
  cuando chocan); porcentajes con decimales (no suman exacto).

## R-22 — Ciclo de vida de versiones y pruebas obligatorias (RF-21, RF-22, SDD RNF-11)

- **Decisión**:
  - Estados: `DRAFT → ACTIVE → RETIRED`. Solo un `DRAFT` se edita o elimina. `editTemplate`
    sobre una versión `ACTIVE` o `RETIRED` crea `DRAFT v(max+1)` con `basedOnVersion`. Solo
    puede haber un `DRAFT` por plantilla a la vez.
  - `runTemplateTests` evalúa cada `testCase` con el evaluador, el **PCGE semilla**
    (`mockPlanContable` normalizado) y un periodo siempre abierto; compara las líneas obtenidas
    con las esperadas **sin importar el orden** (lado, cuenta, CC y monto) y verifica cuadre y
    cuentas válidas. Guarda `lastTestRun`.
  - `activateTemplateVersion` exige un `lastTestRun` posterior al último `updatedAt`, con
    `allPassed = true`, `uncoveredRuleIds = []` y al menos un caso de prueba. Pasa la versión
    `ACTIVE` anterior a `RETIRED`, calcula `diffFromPrevious` y audita. Si falta algo →
    `TEMPLATE_NOT_READY` con el detalle.
  - `retireTemplate` retira la versión activa sin reemplazo: la plantilla deja de ofrecerse.
  - Los casos de prueba son comprobantes en PEN; la conversión de moneda tiene sus propias
    pruebas en `fx.js`.
- **Justificación**: cumple RD-10 (inmutabilidad), la RNF-11 del SDD (pruebas por regla antes de
  activar) y la aclaración del 2026-09-22.
- **Alternativas descartadas**: vista previa sin bloqueo (no elegida); permitir varias versiones
  activas (ambigüedad en la carga).

## R-23 — Validación de cuentas de plantillas en dos catálogos (CA-19.6, CA-23.2)

- **Decisión**:
  - **Banco global**: `validateTemplateAccounts(version, pcgeIndex)` revisa todas las cuentas de
    `defaults`, las reglas y los `split` contra el PCGE semilla; si una no existe o no es de uso,
    es un **error** que impide activar.
  - **Empresa**: `setCompanyTemplateActivation` usa la misma función contra el catálogo de la
    empresa, pero como **advertencia** que se guarda en la activación; no impide activar
    (aclaración del 2026-09-22). Las advertencias se recalculan al listar, porque el catálogo
    puede cambiar.
- **Justificación**: el PCGE es la referencia común del banco global, y cada empresa puede tener
  un catálogo propio. Al procesar se aplican de todas formas `ACCOUNT_NOT_FOUND` y
  `ACCOUNT_NOT_POSTABLE` (R-16).
- **Alternativas descartadas**: bloquear la activación por empresa (no elegido); validar solo al
  procesar (no elegido).

## R-24 — Versión usada al recalcular y plantilla no activa (CA-11.3, HU-10)

- **Decisión**: `recomputeEntry` resuelve siempre la **versión ACTIVA vigente** de la plantilla
  del asiento (o de la nueva, si el Maker la cambia). Si cambia la versión, guarda la nueva en
  `templateVersion` y emite `TEMPLATE_VERSION_CHANGED` con la anterior y la nueva. Si la
  plantilla no tiene versión activa o no está activada para la empresa, el asiento queda en
  `PENDING_INPUT` con el motivo **`TEMPLATE_INACTIVE`** (acciones: cambiar plantilla o
  cancelar), sin tocar sus líneas.
- **Justificación**: la aclaración del 2026-09-22 (K7). RD-10 protege a los asientos ya
  traducidos; recalcular es una traducción nueva, iniciada explícitamente por el Maker.
- **Alternativas descartadas**: recalcular con la versión original (usaría reglas retiradas).

## R-25 — Compatibilidad con Compras, Ventas y la vista de plantillas existente (K10, constitución VII)

- **Decisión**:
  - Compras y Ventas manuales **siguen** usando `plantillas` del `AccountingContext` (es decir,
    `mockPlantillas`) y `generarAsientoContable`, sin cambios. Las plantillas con reglas son del
    banco de la ingestión (fuera de alcance, spec §7).
  - `PlantillasView.jsx` (hoy una lista de solo lectura) se reemplaza por dos vistas que usan
    `templateService`:
    - La ruta global `plantillas_globales` pasa a `PlantillasGlobalesView.jsx`, el banco con su
      editor.
    - La ruta de empresa `plantillas` pasa a `PlantillasEmpresaView.jsx`, las activaciones.

    `App.jsx` apunta cada ruta a su vista. `PlantillasView.jsx` deja de usarse y se elimina.
- **Justificación**: no rompe módulos existentes. La spec de Empresas (RF-106) pide
  exactamente esas dos pantallas; esta feature las implementa.
- **Alternativas descartadas**: migrar Compras y Ventas al motor de reglas (refactor fuera de
  alcance); conservar `PlantillasView` mostrando datos distintos a los que usa la ingestión
  (confuso).
