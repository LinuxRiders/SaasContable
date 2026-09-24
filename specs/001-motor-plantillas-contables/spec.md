# Feature Specification: Configuración Contable y Motor de Plantillas por Tipo de Documento

**Feature Branch**: `001-motor-plantillas-contables`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Rehacer el spec 001 (Motor de Plantillas Contables y Configuración Contable, Subsistema S0 del SDD v3.0) sobre el modelo conceptual del SDD §20-§21: catálogo de tipos de documento sustentatorio con esquemas de extracción (RF-13), Paquete de Jurisdicción Perú sembrado como datos (RF-14, RD-14, RD-18), roles de cuenta y mapa de cuentas por empresa validado contra el Plan Contable existente (RF-17, RD-17), reglas de clasificación de la operación (RF-15, RD-16), plantillas identificadas por (tipo de documento, perspectiva, tipo de operación) que declaran todas sus líneas con lenguaje de expresiones AST (RF-03, §20.8), selección determinista de plantilla (RF-16), casos de prueba obligatorios y activación por empresa (RNF-11), versionado inmutable (RD-10) y auditoría (RF-08). Las plantillas base del paquete Perú con sus casos de prueba de §21.4. El modelo CanonicalDocument genérico con metadatos de extracción (§13.1) se define aquí como contrato que consumirá la ingestión multiformato (spec 002). Reemplaza al spec 001-motor-plantillas-ast actual, que modelaba plantillas como compra/venta."

**SDD Reference**: SDD v3.0 — §20 (modelo conceptual, **lectura obligatoria**), §21 (paquete Perú), S0 del §5, RD-10, RD-14, RD-15, RD-16, RD-17, RD-18, RF-03, RF-08, RF-13, RF-14, RF-15, RF-16, RF-17, RF-19, RNF-01, RNF-11, HU-01, HU-08, HU-10, §13.1, §13.3–§13.7.

**Reemplaza a**: `specs/archive/001-motor-plantillas-ast-v2-compra-venta/` (modelaba plantillas como "compra o venta" con lados y cuentas inferidos por el motor; descartado).

## Contexto para quien implementa

Un contador no contabiliza "compras" y "ventas": contabiliza **documentos sustentatorios** (facturas, recibos por honorarios, resúmenes de planilla, notas de crédito, DUA, extractos bancarios, documentos internos). De cada uno extrae datos concretos, decide **qué operación respalda** (mercadería, activo fijo, gasto de servicio, remuneraciones…), determina su **tratamiento tributario** y lo imputa a las cuentas del **plan de su empresa**. Esta feature construye la configuración que permite al sistema hacer lo mismo:

1. **Paquete de Jurisdicción** (datos, no código): tipos de documento con su esquema, impuestos y retenciones con tasas por vigencia, tipos de operación, roles de cuenta, libros legales y plantillas base. Se siembra el paquete Perú.
2. **Mapa de cuentas por empresa**: cada rol de cuenta ("proveedores por pagar", "IGV crédito fiscal") apunta a una cuenta de detalle del plan contable de la empresa.
3. **Reglas de clasificación**: deciden el tipo de operación de un documento o de cada línea.
4. **Plantillas contables**: para una terna *(tipo de documento, perspectiva, tipo de operación)*, declaran **todas** las líneas del asiento. El motor no sabe qué es una compra ni una venta.
5. **Selección y evaluación**: dado un documento canónico ya clasificado, elegir exactamente una plantilla y producir las líneas del asiento. Es la interfaz que consumirán los specs de ingestión (002) y traducción (003).

El núcleo es **agnóstico por jurisdicción** (RD-14): ni el motor ni la validación mencionan RUC, IGV, PCGE, SUNAT ni cuentas concretas; todo eso llega desde el paquete y el mapa de cuentas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Consultar el Paquete de Jurisdicción y los tipos de documento (Priority: P1)

Como **Administrador de Plantillas** (o **Auditor**, en solo lectura), quiero ver el Paquete de Jurisdicción asignado a una empresa, con sus tipos de documento y los datos que se extraen de cada uno, sus impuestos y retenciones con tasas vigentes, sus tipos de operación, roles de cuenta y libros legales, para saber qué documentos puede contabilizar el sistema y con qué datos.

**Why this priority**: Todo lo demás (mapa de cuentas, reglas, plantillas) se construye sobre este catálogo. Sin él, una plantilla no tiene contra qué validar sus campos.

**Independent Test**: Iniciar sesión como Admin, abrir la configuración contable de la empresa demo y verificar que se listan los 16 tipos de documento del paquete Perú con su familia, código oficial, perspectivas y esquema de campos, y que la tasa del IGV mostrada depende de la fecha consultada.

**Acceptance Scenarios**:

1. **Given** la empresa demo tiene asignado el paquete Perú, **When** el Admin abre el catálogo de tipos de documento, **Then** ve cada tipo con su nombre, familia (`COMMERCIAL`, `ADJUSTMENT`, `PROFESSIONAL_FEES`, `CUSTOMS`, `LABOR`, `FINANCIAL`, `TAX_CERTIFICATE`, `INTERNAL`), código oficial, perspectivas admitidas, si genera asiento y su registro legal por defecto.
2. **Given** el Admin abre el tipo "Nota de crédito", **When** consulta su esquema, **Then** ve los campos de cabecera y de línea con tipo de dato y obligatoriedad, los roles de parte exigidos, los impuestos admitidos, la **referencia obligatoria** al documento modificado y sus reglas de coherencia.
3. **Given** el impuesto `VAT` del paquete tiene tasas con vigencias distintas, **When** el Admin consulta la tasa a dos fechas diferentes, **Then** el sistema devuelve la tasa vigente en cada fecha; si ninguna está vigente, lo indica explícitamente (RD-18).
4. **Given** el tipo "Guía de remisión" tiene `generatesEntry = false`, **When** el Admin lo consulta, **Then** se indica que es un documento solo de referencia y el sistema no permite crear plantillas para él.
5. **Given** un usuario con rol Auditor, **When** abre el mismo catálogo, **Then** lo ve completo sin ningún control de edición; el paquete es de solo lectura para todos los roles del tenant.

---

### User Story 2 — Mapear los roles de cuenta al plan contable de la empresa (Priority: P1)

Como **Administrador de Plantillas**, quiero asignar a cada rol de cuenta del paquete una cuenta de detalle del plan contable de la empresa, partiendo de las cuentas sugeridas, para que las plantillas base funcionen con el plan real de cada empresa.

**Why this priority**: Las plantillas base usan roles, no cuentas. Sin el mapa, ninguna plantilla puede activarse para una empresa (RD-17).

**Independent Test**: Abrir el mapa de cuentas de la empresa demo, comprobar que viene precargado, cambiar un rol a una cuenta de agrupación y verificar el rechazo; asignarlo a una cuenta de detalle válida y verificar que se guarda como nueva versión.

**Acceptance Scenarios**:

1. **Given** una empresa recibe por primera vez el paquete Perú, **When** el Admin abre su mapa de cuentas, **Then** cada rol aparece precargado con la cuenta de detalle del plan de la empresa que corresponde a la cuenta sugerida por el paquete (la primera subcuenta de detalle bajo el código sugerido); los roles sin cuenta equivalente en el plan aparecen como **sin mapear**.
2. **Given** el Admin asigna el rol `SUPPLIERS_PAYABLE` a la cuenta `42` (de agrupación), **When** guarda, **Then** el sistema rechaza el cambio con el mensaje "La cuenta 42 no es de detalle (imputable)" y no crea versión.
3. **Given** el Admin asigna un rol a una cuenta que no existe en el plan de la empresa, **When** guarda, **Then** el sistema rechaza el cambio indicando que la cuenta no existe.
4. **Given** el rol `COST_DESTINATION` admite calificador por centro de costo, **When** el Admin asigna `CC-ADMIN → 9411101` y `CC-VENTAS → 9511101`, **Then** el mapa guarda una cuenta por valor de calificador y las muestra agrupadas bajo el rol.
5. **Given** un mapa válido, **When** el Admin lo guarda, **Then** se crea una nueva versión del mapa con autor, fecha y la lista de roles cambiados, y la versión anterior se conserva (RD-10).
6. **Given** hay roles sin mapear, **When** el Admin consulta el resumen del mapa, **Then** ve cuáles plantillas activas o activables quedan bloqueadas por cada rol sin mapear.

---

### User Story 3 — Crear una plantilla contable para un tipo de documento (Priority: P1)

Como **Administrador de Plantillas**, quiero crear sin código una plantilla para un tipo de documento, una perspectiva y un tipo de operación, declarando cada línea del asiento (lado, cuenta o rol, importe, condición, dimensiones y glosa), para que ese tipo de documento se contabilice como lo haría un contador.

**Why this priority**: Es el núcleo del motor (HU-01, RF-03). Sin plantillas no hay asientos.

**Independent Test**: Crear la plantilla "Recibo por honorarios recibido – honorarios profesionales" con tres líneas (gasto al Debe, retención y neto al Haber) y las dos de destino, guardarla como borrador y comprobar que el sistema valida cada expresión contra el esquema del tipo de documento.

**Acceptance Scenarios**:

1. **Given** el Admin crea una plantilla nueva, **When** elige el tipo de documento, **Then** solo puede elegir perspectivas admitidas por ese tipo y tipos de operación admitidos para esa perspectiva, y el editor ofrece únicamente los campos, impuestos y retenciones que el esquema del tipo define.
2. **Given** el Admin declara una línea `DEBIT` con rol `PROFESSIONAL_FEES_EXPENSE` e importe `fields.grossAmount`, una `CREDIT` con rol `INCOME_TAX_WITHHELD_PAYABLE` e importe `withholding('INCOME_TAX_FEES').amount`, y una `CREDIT` con rol `PROFESSIONAL_FEES_PAYABLE` e importe `totals.payable`, **When** guarda, **Then** la plantilla queda como borrador `v1` con sus líneas en el orden declarado.
3. **Given** una línea usa el campo `fields.dueDateOfPayment`, que no existe en el esquema del recibo por honorarios, **When** el Admin guarda, **Then** el sistema rechaza la plantilla señalando la línea y el campo desconocido.
4. **Given** una plantilla sin ninguna línea `CREDIT`, **When** el Admin guarda, **Then** el sistema la rechaza indicando que un asiento requiere al menos una línea al Debe y una al Haber.
5. **Given** una plantilla de factura recibida con compras mixtas, **When** el Admin declara una línea con `forEachDocumentLine` y cuenta `BY_OPERATION_TYPE` (mercadería → `PURCHASES_MERCHANDISE`, flete → `TRANSPORT_EXPENSE`), **Then** el editor exige una cuenta de respaldo (`fallback`) o advierte que las líneas con otro tipo de operación dejarán el asiento pendiente.
6. **Given** el Admin crea una plantilla propia de la empresa (`scope = TENANT`), **When** usa un código de cuenta literal, **Then** el sistema lo acepta; **Given** edita una plantilla del paquete (`scope = PACK`), **Then** el sistema no permite editarla y ofrece **duplicarla** como plantilla propia de la empresa.
7. **Given** una plantilla usa `mulRate` para calcular un importe, **When** se guarda, **Then** el editor muestra que el redondeo se aplicará una sola vez por línea.

---

### User Story 4 — Probar y activar una plantilla para una empresa (Priority: P1)

Como **Administrador de Plantillas**, quiero definir casos de prueba (documento de entrada y asiento esperado), ejecutarlos y activar la plantilla para una empresa solo si todo pasa y todas sus cuentas se resuelven, para no contabilizar asientos incorrectos en masa.

**Why this priority**: Las pruebas obligatorias (RNF-11) y la validación de cuentas (RD-17) son las barreras que impiden errores masivos.

**Independent Test**: Ejecutar el caso de prueba de la plantilla base de planilla y ver cada línea esperada contra la obtenida; intentar activar una plantilla con un caso fallido y otra con un rol sin mapear, y comprobar ambos rechazos.

**Acceptance Scenarios**:

1. **Given** la plantilla base `PE.INTERNAL.PAYROLL_SUMMARY.PAYROLL` con su caso (bruto 10 000.00, ESSALUD 900.00, ONP 520.00, AFP 780.00, renta 5.ª 150.00, centro de costo administración), **When** el Admin ejecuta las pruebas, **Then** el sistema muestra por línea lado, cuenta, importe y dimensiones esperados y obtenidos, marca ✅ si coinciden y verifica que el asiento cuadra (Debe 21 800.00 = Haber 21 800.00).
2. **Given** un caso cuyo asiento esperado no coincide, **When** se ejecutan las pruebas, **Then** el sistema marca ❌ y muestra la diferencia exacta (línea faltante, sobrante, lado, cuenta o importe distinto).
3. **Given** un caso negativo que espera el motivo `ACCOUNT_UNRESOLVED`, **When** se ejecuta con un mapa de cuentas al que le falta un rol, **Then** el caso pasa si el motor devuelve exactamente ese motivo.
4. **Given** una plantilla sin casos de prueba, o con algún caso fallido, **When** el Admin intenta activarla para una empresa, **Then** el sistema rechaza la activación indicando el motivo.
5. **Given** una plantilla con todos sus casos en verde que usa un rol sin mapear en la empresa, **When** el Admin intenta activarla, **Then** el sistema rechaza la activación listando los roles sin mapear y las cuentas inválidas (RD-17).
6. **Given** otra plantilla ya activa en la empresa con la misma terna, el mismo alcance y la misma prioridad, **When** el Admin intenta activar la nueva, **Then** el sistema rechaza la activación por ambigüedad (RD-16) y sugiere cambiar la prioridad o la condición de aplicabilidad.
7. **Given** una plantilla activa en la empresa A, **When** el Admin consulta la empresa B, **Then** esa plantilla aparece como no activa en B (RD-08).

---

### User Story 5 — Definir reglas de clasificación de la operación (Priority: P2)

Como **Administrador de Plantillas**, quiero definir reglas que asignen el tipo de operación a un documento o a cada línea (por tercero, código de ítem, palabras clave, tipo de documento o importe), y probar cómo se clasificaría un documento, para que el sistema decida "qué es" cada documento sin intervención cuando es posible.

**Why this priority**: Es el paso de negocio que faltaba (§20.4). Sin reglas, todo documento cuya operación no sea única va a la bandeja del Maker; el motor sigue funcionando, pero con más trabajo manual.

**Independent Test**: Crear una regla de línea "descripción contiene 'flete' → `TRANSPORT_EXPENSE`" y una de documento "emisor = RUC ficticio del proveedor de mercadería → `MERCHANDISE_PURCHASE`", y probar un documento de ejemplo con líneas mixtas para ver la clasificación por línea y la del documento.

**Acceptance Scenarios**:

1. **Given** reglas de documento con prioridades 10 y 20 que se cumplen ambas, **When** se clasifica el documento, **Then** gana la de mayor prioridad y la traza muestra ambas reglas evaluadas.
2. **Given** un documento cuyo tipo y perspectiva admiten un único tipo de operación (resumen de planilla → `PAYROLL`), **When** se clasifica sin reglas, **Then** se asigna ese tipo directamente.
3. **Given** un documento con líneas clasificadas como `MERCHANDISE_PURCHASE` y `TRANSPORT_EXPENSE` (aunque una regla de documento haya propuesto otro tipo), **When** se clasifica, **Then** el documento toma el tipo compuesto del paquete para su perspectiva (`PURCHASE_MIXED`) y cada línea conserva el suyo. Una regla que asigna un tipo no admitido para ese documento se ignora.
4. **Given** ninguna regla decide y el tipo admite varias operaciones, **When** se clasifica, **Then** el resultado es `CLASSIFICATION_REQUIRED`; el sistema nunca adivina (RD-16).
5. **Given** una regla en estado `PROPOSED` (sugerida por un Maker), **When** el Admin la revisa, **Then** puede activarla o descartarla; mientras esté `PROPOSED` no participa en la clasificación.
6. **Given** el documento trae el tipo de operación explícito desde el origen, **When** se clasifica, **Then** ese valor prevalece sobre las reglas.

---

### User Story 6 — Simular la contabilización de un documento (Priority: P2)

Como **Administrador de Plantillas**, quiero cargar un documento canónico de ejemplo y ver, paso a paso, su validación contra el esquema, su perspectiva, su clasificación, las plantillas candidatas, la plantilla elegida y el asiento resultante, para entender y depurar por qué un documento se contabiliza de una forma.

**Why this priority**: Expone la misma interfaz que usará el motor de traducción (spec 003) y permite validar el conjunto antes de que exista la ingestión.

**Independent Test**: Elegir el documento de ejemplo "Factura recibida con mercadería y flete" y verificar que la simulación muestra la clasificación por línea, la plantilla `PE.RECEIVED.INVOICE.PURCHASE_MIXED v1` y las 8 líneas del asiento esperado de la §21.4.

**Acceptance Scenarios**:

1. **Given** un documento de ejemplo válido, **When** el Admin lo simula para la empresa demo, **Then** ve en orden: resultado del esquema, perspectiva deducida, tipo de operación del documento y de cada línea con la regla que lo decidió, tasas de impuesto vigentes usadas, candidatas con el resultado de su condición, plantilla y versión elegidas, y líneas del asiento con su cuenta resuelta desde el rol.
2. **Given** un documento con una nota de crédito sin referencia, **When** se simula, **Then** la simulación se detiene en el esquema con el motivo `SCHEMA_INVALID` y el campo faltante.
3. **Given** un documento para el que no hay plantilla activa, **When** se simula, **Then** el resultado es `NO_TEMPLATE` y se indica la terna buscada.
4. **Given** la simulación, **When** termina, **Then** no se persiste ningún asiento ni se incrementa el uso de ninguna plantilla.
5. **Given** un documento en moneda extranjera y una tasa de cambio dada en la simulación, **When** se simula, **Then** cada línea muestra importe original, tasa e importe funcional redondeado una sola vez, y la `balancingLine` absorbe la diferencia de redondeo dentro de la tolerancia del paquete.

---

### User Story 7 — Versionar una plantilla ya usada (Priority: P2)

Como **Administrador de Plantillas**, quiero que modificar una plantilla que ya generó asientos cree una versión nueva sin alterar la anterior, para que cada asiento pueda explicarse con la versión exacta que lo generó (RD-10).

**Why this priority**: Invariante de dominio de trazabilidad; sin él la auditoría pierde valor.

**Independent Test**: Marcar la versión 1 de una plantilla como usada, editarla y verificar que se crea la versión 2 en borrador con un diff legible, que la versión 1 queda intacta y que la activación de la 2 deja a la 1 como `SUPERSEDED`.

**Acceptance Scenarios**:

1. **Given** una versión activa con `usageCount > 0`, **When** el Admin la edita, **Then** se crea una nueva versión en borrador con sus casos de prueba copiados y la versión usada no cambia.
2. **Given** una versión en borrador nunca usada, **When** el Admin la edita, **Then** se modifica esa misma versión.
3. **Given** la versión 2 se activa para una empresa, **When** se consulta el historial, **Then** la versión 1 figura como `SUPERSEDED` para esa empresa, con su conteo de uso.
4. **Given** dos versiones consecutivas, **When** se consulta el diff, **Then** se muestran en lenguaje natural las líneas agregadas, eliminadas o modificadas (lado, cuenta, importe, condición) y los cambios de terna, prioridad o aplicabilidad.

---

### User Story 8 — Auditar la configuración contable (Priority: P3)

Como **Auditor**, quiero consultar el historial de versiones de plantillas, mapas de cuentas y reglas de clasificación, con autor, fecha, diff y activaciones por empresa, para verificar que la configuración se gestionó con control.

**Why this priority**: Requisito de auditoría (RF-08); no bloquea la operación.

**Independent Test**: Tras crear, probar, activar y versionar una plantilla y cambiar un mapa de cuentas, iniciar sesión como Auditor y verificar que cada acción aparece en la bitácora con usuario, rol, empresa, fecha y detalle, sin controles de edición.

**Acceptance Scenarios**:

1. **Given** acciones de configuración realizadas, **When** el Auditor abre la bitácora, **Then** ve eventos de creación, guardado, prueba, activación, desactivación y versionado de plantillas; cambios de mapa de cuentas; y creación, activación y retiro de reglas, cada uno con usuario, rol, empresa, fecha, `traceId` y detalle.
2. **Given** el Auditor intenta una acción de escritura por cualquier vía, **When** el servicio la recibe, **Then** la rechaza con `FORBIDDEN`.

---

### Edge Cases

- **Plantilla sobre documento solo de referencia** (`generatesEntry = false`): no se puede crear.
- **Importe negativo en una línea**: es un error de plantilla (`INVALID_AMOUNT`) en la prueba o la simulación; el motor nunca cambia el lado por su cuenta.
- **Importe cero**: la línea se omite; si todas las líneas de un lado quedan omitidas, el asiento no cuadra y se reporta `UNBALANCED`.
- **Diferencia de redondeo FX mayor que la tolerancia**, o plantilla sin `balancingLine` con diferencia: `UNBALANCED`.
- **Cuenta que deja de ser de detalle o se desactiva** después de activar una plantilla: la plantilla sigue activa, pero el resumen del mapa la marca con advertencia y la simulación devuelve `ACCOUNT_UNRESOLVED`.
- **Tasa de impuesto no vigente** a la fecha del documento de prueba: `CATALOG_NOT_EFFECTIVE`.
- **Expresión con recursión excesiva o nodo no permitido**: se rechaza al guardar.
- **Dos plantillas de alcance distinto** (`TENANT` y `PACK`) con la misma terna y prioridad: no hay ambigüedad; gana `TENANT`.
- **`BY_OPERATION_TYPE` sin entrada para la operación de una línea y sin `fallback`**: `ACCOUNT_UNRESOLVED` para esa línea.
- **Retiro de una plantilla**: una plantilla retirada no puede activarse; sus versiones y conteos se conservan.
- **Empresa sin paquete asignado**: no puede usar plantillas del paquete, mapa ni reglas; se muestra el aviso para asignarlo.
- **Reset de datos demo**: vuelve a sembrar el paquete, los mapas, las reglas y las plantillas base con sus casos.

## Requirements *(mandatory)*

### Functional Requirements

**Paquete de Jurisdicción y catálogos (RF-13, RF-14, RD-14, RD-18)**

- **FR-001**: El sistema MUST mantener el Paquete de Jurisdicción como datos versionados con: tipos de identificador fiscal, tipos de documento con esquema, impuestos y retenciones con tasas por vigencia, tipos de operación con perspectivas admitidas, roles de cuenta con cuenta sugerida, libros legales, tolerancia de redondeo, umbral de confianza de extracción por defecto y plantillas base.
- **FR-002**: El sistema MUST sembrar el paquete Perú con los 16 tipos de documento, los impuestos y retenciones, los 25 tipos de operación, los roles de cuenta y los libros legales de la SDD §21.
- **FR-003**: Cada empresa MUST tener asignado exactamente un paquete; los catálogos del paquete MUST ser de solo lectura para todos los roles del tenant.
- **FR-004**: El sistema MUST resolver tasas y entradas de catálogo según su vigencia a una fecha dada, e informar explícitamente cuando no hay entrada vigente.
- **FR-005**: El núcleo del motor (validación de esquema, clasificación, selección, evaluación, verificación de cuentas) MUST NOT contener tipos de documento, impuestos, tasas, identificadores fiscales, códigos de cuenta ni libros legales concretos.

**Documento canónico (contrato para specs 002 y 003)**

- **FR-006**: El sistema MUST definir el documento canónico genérico de la SDD §13.1: tipo de documento del catálogo, perspectiva, serie y número, fechas, moneda, partes con rol y tipo de identificador fiscal, campos de cabecera tipados, líneas con impuestos y campos propios, impuestos y retenciones por código, referencias, totales, tipo de operación del documento y de cada línea, e información de extracción (formato de origen, extractor, confianza del tipo y procedencia por campo).
- **FR-007**: El sistema MUST validar un documento canónico contra el esquema de su tipo: campos obligatorios, tipos de dato, partes exigidas, impuestos y retenciones admitidos, referencia exigida y reglas de coherencia con la tolerancia del esquema. Debe devolver `SCHEMA_INVALID` con la lista de incumplimientos.
- **FR-008**: El sistema MUST deducir la perspectiva comparando el identificador fiscal de la empresa con las partes del documento (o por la familia `INTERNAL`) y rechazar como ajeno el documento en el que la empresa no figura.

**Mapa de cuentas (RF-17, RD-17)**

- **FR-009**: El sistema MUST mantener por empresa un mapa versionado de rol de cuenta (con calificador opcional) a cuenta del plan contable de la empresa.
- **FR-010**: El sistema MUST precargar el mapa con las cuentas equivalentes a las sugeridas por el paquete y marcar como sin mapear los roles sin equivalente.
- **FR-011**: El sistema MUST rechazar asignaciones a cuentas inexistentes, de agrupación (no imputables) o inactivas.
- **FR-012**: El sistema MUST informar, por rol sin mapear, qué plantillas quedan bloqueadas para la empresa.

**Plantillas y lenguaje de expresiones (RF-03, §20.8)**

- **FR-013**: Una plantilla MUST identificarse por la terna *(tipo de documento, perspectiva, tipo de operación)* y tener alcance (`PACK` o `TENANT`), prioridad, condición de aplicabilidad opcional, libro legal destino, glosa, entradas requeridas, líneas declaradas y casos de prueba.
- **FR-014**: Cada línea MUST declarar lado (`DEBIT` o `CREDIT`), cuenta (`LITERAL` solo en alcance `TENANT`, `ROLE` con calificador opcional, o `BY_OPERATION_TYPE` con respaldo), importe (expresión), y opcionalmente condición de emisión, iteración por línea del documento, agrupación, dimensiones, descripción y marca de línea de balance (a lo sumo una por plantilla).
- **FR-015**: El lenguaje de expresiones MUST ser un árbol JSON puro y determinista con, como mínimo, los grupos de nodos de la SDD §20.8.3 (literales y acceso a campos, impuestos y retenciones, agregados, aritmética entera con `mulRate` de redondeo único, lógica, fechas y texto), con lista blanca de nodos y profundidad máxima.
- **FR-016**: Al guardar, el sistema MUST validar la estructura, cada expresión y cada ruta de campo contra el esquema del tipo de documento; que haya al menos una línea al Debe y una al Haber; que el libro destino exista; y que el tipo de documento genere asiento.
- **FR-017**: El sistema MUST impedir la edición de plantillas `PACK` por el tenant y permitir duplicarlas como plantillas `TENANT`.

**Evaluación (RF-03)**

- **FR-018**: El sistema MUST evaluar una plantilla sobre un documento canónico clasificado siguiendo el algoritmo de la SDD §20.8.3: entradas requeridas, líneas en orden con expansión por línea del documento, condición de emisión, omisión de importes cero, error ante importes negativos, resolución de cuentas con el mapa de la empresa, dimensiones, agrupación, conversión a moneda funcional con redondeo único por línea y ajuste por línea de balance dentro de la tolerancia.
- **FR-019**: La evaluación MUST devolver las líneas del asiento (lado, cuenta, rol de origen, importe original, tasa, importe funcional, dimensiones, descripción, línea de plantilla y líneas del documento de origen), la glosa, el libro destino y la traza, o bien la lista de motivos de pendiente (`ACCOUNT_UNRESOLVED`, `MISSING_DIMENSION`, `INVALID_AMOUNT`, `UNBALANCED`, `CATALOG_NOT_EFFECTIVE`, entradas requeridas faltantes).
- **FR-020**: Todos los importes MUST manejarse como enteros en unidades mínimas de la moneda; ninguna suma MUST usar aritmética flotante acumulativa.

**Clasificación y selección (RF-15, RF-16, RD-16)**

- **FR-021**: El sistema MUST mantener reglas de clasificación versionadas por empresa, de alcance documento o línea, con prioridad, condición y tipo de operación, en estados `PROPOSED`, `ACTIVE` o `RETIRED`; solo las `ACTIVE` participan.
- **FR-022**: La clasificación MUST seguir el orden de la SDD §20.4 (valor explícito del origen, reglas por prioridad, operación única admitida, tipo compuesto del paquete para líneas mixtas) y devolver `CLASSIFICATION_REQUIRED` cuando no hay decisión.
- **FR-023**: La selección MUST considerar solo plantillas activas para la empresa con la misma terna, filtrar por aplicabilidad, ordenar por alcance (`TENANT` antes que `PACK`) y prioridad, y devolver `NO_TEMPLATE` o `AMBIGUOUS_TEMPLATE` cuando corresponda, con la traza de candidatas.
- **FR-024**: El sistema MUST ofrecer una simulación de extremo a extremo (esquema → perspectiva → clasificación → selección → evaluación) que no persista asientos ni modifique conteos de uso.

**Pruebas, activación y versionado (RNF-11, RD-10, RD-17)**

- **FR-025**: Cada caso de prueba MUST incluir un documento canónico de entrada, el mapa de cuentas o la referencia al de la empresa, y el asiento esperado o los motivos de pendiente esperados; la comparación MUST ser por lado, cuenta, importe y dimensiones, y exigir que el asiento cuadre.
- **FR-026**: La activación de una versión para una empresa MUST exigir: al menos un caso de prueba, todos los casos en verde en la última ejecución sobre esa versión, todas las cuentas y roles resueltos en la empresa, y la ausencia de otra plantilla activa con la misma terna, alcance y prioridad.
- **FR-027**: Activar una versión nueva MUST dejar la anterior como `SUPERSEDED` para esa empresa; desactivar MUST ser posible sin borrar versiones.
- **FR-028**: Editar una versión con `usageCount > 0` MUST crear una versión nueva; la versión usada MUST permanecer idéntica. El sistema MUST calcular un diff legible entre versiones consecutivas.
- **FR-029**: El sistema MUST exponer a los specs posteriores: buscar candidatas por terna, obtener una versión concreta de una plantilla, evaluar una plantilla, clasificar un documento, seleccionar una plantilla, validar un documento contra su esquema, obtener el mapa de cuentas activo y registrar el uso de una versión.

**Permisos, auditoría y datos semilla**

- **FR-030**: Solo el rol Administrador de Plantillas MUST poder crear, editar, probar, activar, desactivar, retirar y versionar plantillas, y mantener mapas de cuentas y reglas. Maker, Checker y Auditor MUST tener solo lectura. Los permisos MUST validarse en los servicios.
- **FR-031**: Toda acción de configuración MUST generar un evento de auditoría con usuario, rol, empresa, fecha, acción, entidad, versión y `traceId`, consultable por el Auditor.
- **FR-032**: Los datos semilla MUST incluir: el paquete Perú; las 9 plantillas base de la SDD §21.4 con al menos un caso de prueba positivo cada una y al menos dos casos negativos en total; reglas de clasificación de ejemplo; mapas de cuentas para dos empresas (una completa y otra con al menos un rol sin mapear, para demostrar RD-17); y al menos un documento canónico de ejemplo por plantilla base para la simulación.
- **FR-033**: El plan contable semilla MUST ampliarse con las cuentas de detalle que necesitan las plantillas base. No se modifica el comportamiento del módulo Plan Contable existente.
- **FR-034**: El reset a datos demo MUST restaurar toda la configuración contable a la semilla.

### Key Entities *(include if feature involves data)*

- **Paquete de Jurisdicción**: catálogo versionado de un país (SDD §13.5); compartido y de solo lectura para las empresas que lo usan.
- **Tipo de documento**: entrada del paquete con familia, códigos oficiales, perspectivas admitidas, esquema de campos, partes, impuestos y retenciones admitidos, referencia exigida, reglas de coherencia, libro por defecto y si genera asiento (§13.4).
- **Impuesto / retención**: código, tipo, tasas por vigencia, roles de cuenta y tratamiento no recuperable.
- **Tipo de operación**: hecho económico con el que se clasifica un documento o una línea.
- **Rol de cuenta**: nombre funcional de una cuenta con cuenta sugerida del plan de referencia.
- **Libro legal**: registro destino de un asiento.
- **Mapa de cuentas**: por empresa y versionado, rol (+ calificador) → cuenta de detalle.
- **Regla de clasificación**: por empresa y versionada; alcance documento o línea, prioridad, condición y tipo de operación.
- **Plantilla contable (`ASTTemplate`)**: terna, alcance, prioridad, aplicabilidad, libro, glosa, líneas declaradas, entradas requeridas, casos de prueba y versiones (§13.3).
- **Línea de plantilla (`TemplateLine`)**: lado, cuenta, importe, condición, iteración, agrupación, dimensiones, descripción y balance (§13.3.1).
- **Caso de prueba**: documento de entrada, mapa, asiento o motivos esperados (§13.3.2).
- **Activación de plantilla**: empresa, plantilla, versión, autor, fecha y ejecución de pruebas que la respaldó.
- **Documento canónico (`CanonicalDocument`)**: contrato genérico de entrada al motor (§13.1).
- **Plan contable (existente)**: cuentas de la empresa con código, descripción, si es de detalle (`esCuentaU`), si exige centro de costo y estado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las 9 plantillas base del paquete Perú producen, en sus casos de prueba, exactamente los asientos de la SDD §21.4 (100 % de los casos en verde tras el reset demo).
- **SC-002**: Se pueden contabilizar en simulación al menos 6 familias distintas de documento (comercial, ajuste, honorarios, laboral, financiera, interna) con el mismo motor, sin que ninguna regla del motor mencione un tipo de documento, impuesto o cuenta concretos (verificable por revisión y por búsqueda en el código del núcleo).
- **SC-003**: Agregar un tipo de documento, impuesto, tipo de operación o plantilla nuevos requiere cambiar solo datos de configuración, sin tocar el motor (verificable añadiendo un tipo de documento de prueba en la semilla).
- **SC-004**: El 100 % de las activaciones que incumplen pruebas, cuentas o unicidad son rechazadas con un motivo explícito.
- **SC-005**: Un Administrador puede crear, probar y activar una plantilla de tres líneas partiendo de una plantilla base duplicada en menos de 10 minutos.
- **SC-006**: Para cualquier documento de ejemplo, la simulación muestra en una sola vista qué regla lo clasificó, qué plantilla y versión se eligieron y por qué, y de qué rol salió cada cuenta.
- **SC-007**: El mismo documento de ejemplo, simulado dos veces con la misma configuración, produce exactamente el mismo resultado (determinismo).
- **SC-008**: Un Auditor puede reconstruir el historial completo de una plantilla (versiones, autores, diffs, activaciones por empresa y uso) sin permisos de escritura.

## Assumptions

- **Solo se siembra el paquete Perú.** El agnosticismo se demuestra por construcción (nada del núcleo es peruano) y con un tipo de documento de prueba agregado solo por datos; no se siembra un segundo país.
- **Publicación de paquetes** fuera del alcance: el paquete se carga desde la semilla; no hay UI para editarlo (es una tarea de plataforma, SDD §14).
- **Asignación de paquete a empresa:** todas las empresas semilla usan el paquete Perú; la asignación es un dato de la empresa, sin UI propia en este spec.
- **Las tasas del paquete son de ejemplo** y se confirman con la normativa vigente al publicar el paquete (SDD §21.3); el IGV se siembra al 18 %.
- **Correspondencia de cuentas sugeridas:** el plan semilla usa códigos analíticos de 7 dígitos; la precarga del mapa toma la primera subcuenta de detalle cuyo código empieza por la cuenta sugerida del paquete.
- **La ingestión multiformato** (XML, JSON, CSV, PDF, imagen, extractor simulado) es el spec 002; este spec solo fija el contrato del documento canónico y los metadatos de extracción que debe producir. La simulación de este spec recibe documentos canónicos ya construidos.
- **La bandeja del Maker, la propuesta de reglas desde la bandeja y la persistencia de asientos** son el spec 003; aquí se modela el estado `PROPOSED` y su revisión por el Admin.
- **Tipo de cambio en simulación y pruebas:** la tasa se proporciona en el caso o en la simulación; la resolución real de FX es el spec 003.
- **Roles de demo:** se reutilizan los usuarios existentes (Admin `admin_pedro`, Maker `contador_maria`, Checker `revisor_luis`, Auditor `auditora_ana`). A diferencia del spec anterior, el Admin no tiene acceso a funciones de Maker ni de Checker.
- **Vistas:** las vistas actuales de plantillas (globales y por empresa) se reemplazan por la configuración contable nueva, siguiendo el patrón de vistas del prototipo.
