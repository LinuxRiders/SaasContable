# Feature Specification: Interpretación Contable, Validación y Bandeja del Maker

**Feature Branch**: `003-traduccion-validacion-staging`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Rehacer el spec 003 (Subsistemas S2 y S3 del SDD v3.0) sobre el modelo contable real: cada documento recibido por la ingestión (spec 002) se interpreta como lo haría un contador —verificar datos dudosos, validar el esquema del tipo, resolver la perspectiva, clasificar la operación, aplicar tributos vigentes, convertir moneda con tasa provisional si el servicio cae, seleccionar y evaluar la plantilla (spec 001)— y se convierte en un JournalEntry; el validador exige cuadre, período abierto por fecha contable (con registro tardío), cuentas de detalle y dimensiones; todo lo que no pasa va a la bandeja del Maker con un motivo explícito, donde el Maker verifica contra el original, corrige, clasifica, informa dimensiones, confirma registro tardío, propone reglas o cancela, y el documento se re-ejecuta desde el paso que corresponde, con concurrencia optimista y actualización en lote. Reemplaza al spec 003 anterior."

**SDD Reference**: SDD v3.0 — §5.4 (S2), §5.5 (S3), §5.6 (retornos), §10.2 (estados), §13.2 (`JournalEntry`), RD-03, RD-05, RD-09, RD-12, RD-15 a RD-18, RF-03, RF-04, RF-10, RF-11, RF-15, RF-16, RNF-13, CU-01 (Alt 1–3, 5), CU-06, CU-07, CU-11, CU-12, CU-13, HU-02, HU-07, HU-09.

**Depende de**: spec 001 (`accountingEngine.interpret`, paquete, mapa, reglas y plantillas) y spec 002 (evento `DocumentReceived`, `CanonicalDocument` con procedencia, `OriginalViewer` y `CanonicalDocumentPanel`).

**Reemplaza a**: `specs/archive/003-traduccion-validacion-staging-v2-compra-venta/`.

## Contexto para quien implementa

Con el documento ya leído, el contador se pregunta en orden:

1. ¿Los datos son confiables y está completo?
2. ¿Lo recibí, lo emití o es interno?
3. ¿Qué operación respalda?
4. ¿Qué impuestos y retenciones aplican a esa fecha?
5. ¿A qué tipo de cambio?
6. ¿Con qué plantilla lo contabilizo y en qué cuentas?
7. ¿Cuadra?
8. ¿En qué mes lo registro?

Esta feature automatiza esas preguntas. Cuando no puede responder alguna con certeza, detiene el documento y le dice al Maker **exactamente** qué falta.

El motor de interpretación ya existe (spec 001, `interpretDocument`). Aquí se agrega lo que depende del estado del tenant y del tiempo:

- La verificación de datos extraídos con baja confianza.
- Las referencias a documentos ya registrados.
- El tipo de cambio real, con tasa provisional si el servicio cae.
- La fecha contable y el período (RD-12, con registro tardío).
- La creación y persistencia del `JournalEntry` y sus transiciones de estado.
- La bandeja del Maker.

La aprobación (S4) y la publicación (S5) son de los specs 004 y 005: esta feature termina cuando el asiento llega a `PENDING_APPROVAL`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Interpretar automáticamente un documento recibido (Priority: P1)

Como **sistema**, quiero interpretar cada documento recibido y generar su asiento borrador con la plantilla correcta, las cuentas del plan de la empresa y el libro destino, para que los documentos claros lleguen solos a aprobación.

**Why this priority**: Es el núcleo del subsistema: convierte documentos en asientos.

**Independent Test**: Cargar DOC-01 (factura de mercadería) y verificar que en segundos existe un asiento `PENDING_APPROVAL` con la plantilla `PE.RECEIVED.INVOICE.MERCHANDISE_PURCHASE`, 5 líneas que cuadran, libro "Registro de Compras", fecha contable 2026-09-10 y la traza de cada paso.

**Acceptance Scenarios**:

1. **Given** un documento recibido sin campos dudosos, **When** se publica `DocumentReceived`, **Then** el sistema ejecuta la interpretación y crea un `JournalEntry` con líneas, glosa, libro destino, plantilla y versión, perspectiva, tipo de operación, versiones de configuración, fecha contable, período y traza.
2. **Given** el asiento generado cuadra, cae en un período abierto y usa cuentas de detalle con sus dimensiones, **When** termina la validación, **Then** el asiento pasa a `PENDING_APPROVAL` y se registra el uso de la versión de plantilla.
3. **Given** DOC-06 (recibo por honorarios), **When** se interpreta, **Then** el asiento tiene gasto, retención de renta de 4.ª categoría, honorarios por pagar y destino en `CC-ADMIN`, y el libro es el de retenciones.
4. **Given** DOC-07 (resumen de planilla), **When** se interpreta, **Then** se genera el asiento de remuneraciones de la SDD §21.4 con destino.
5. **Given** DOC-04 (factura emitida), **When** se interpreta, **Then** la perspectiva es "emitido" y el asiento es de venta en el Registro de Ventas.
6. **Given** DOC-03 (nota de crédito que referencia DOC-01), **When** DOC-01 ya fue recibido, **Then** el asiento de devolución se genera y queda enlazado al documento referenciado.
7. **Given** cualquier documento, **When** se interpreta dos veces con la misma configuración, **Then** el resultado es idéntico (RD-16).

---

### User Story 2 — Detener en la bandeja lo que no se puede contabilizar con certeza (Priority: P1)

Como **Maker**, quiero que todo documento que el sistema no puede contabilizar con certeza aparezca en mi bandeja con el motivo exacto, para no registrar nada dudoso.

**Why this priority**: Es la barrera que convierte la automatización en contabilidad confiable (RD-15 a RD-17).

**Independent Test**: Cargar DOC-02, DOC-08, DOC-10, DOC-11 y DOC-15 y verificar que cada uno queda en `PENDING_INPUT` con su motivo: `MISSING_DIMENSION`, `CLASSIFICATION_REQUIRED`, `LOW_CONFIDENCE_EXTRACTION`, `CLASSIFICATION_REQUIRED` y `SCHEMA_INVALID`.

**Acceptance Scenarios**:

1. **Given** un documento con campos dudosos no verificados, **When** se interpreta, **Then** se detiene antes de validar el esquema con `LOW_CONFIDENCE_EXTRACTION` y la lista de campos.
2. **Given** una nota de crédito sin referencia, **When** se interpreta, **Then** queda en `PENDING_INPUT` con `SCHEMA_INVALID`, indicando la referencia faltante.
3. **Given** una nota de crédito cuyo documento referenciado no existe en la empresa, **When** se interpreta, **Then** queda con `REFERENCE_NOT_FOUND`.
4. **Given** una factura cuya operación no se puede determinar por reglas, **When** se interpreta, **Then** queda con `CLASSIFICATION_REQUIRED`.
5. **Given** un tipo de documento y una operación sin plantilla activa, **When** se interpreta, **Then** queda con `NO_TEMPLATE`, con la terna buscada.
6. **Given** una línea con cuenta que exige centro de costo y el documento no lo trae, **When** se interpreta, **Then** queda con `MISSING_DIMENSION`, indicando la línea y la dimensión.
7. **Given** un rol de cuenta sin mapear en la empresa, **When** se interpreta, **Then** queda con `ACCOUNT_UNRESOLVED`.
8. **Given** un documento con varios problemas detectables en el mismo paso, **When** se interpreta, **Then** todos los motivos de ese paso se muestran juntos.
9. **Given** cualquier retorno, **When** el Maker abre el documento, **Then** ve el motivo, el paso en que se detuvo y qué acción lo resuelve (SDD §5.6).

---

### User Story 3 — Resolver pendientes desde la bandeja (Priority: P1)

Como **Maker**, quiero resolver cada pendiente con la acción que corresponde (verificar datos contra el original, corregir un campo, clasificar la operación, informar una dimensión, confirmar un registro tardío) y que el documento se vuelva a procesar solo, para completar el trabajo sin rehacer nada.

**Why this priority**: Sin esto, los documentos detenidos nunca se contabilizan (HU-09, CU-13).

**Independent Test**: En DOC-10 verificar los tres campos dudosos contra la imagen y ver que el asiento pasa a `PENDING_APPROVAL` con intervención manual. En DOC-11, clasificar como "Adquisición de activo fijo" y ver el asiento de activo.

**Acceptance Scenarios**:

1. **Given** `LOW_CONFIDENCE_EXTRACTION`, **When** el Maker compara cada campo dudoso con el original mostrado al lado y lo confirma o corrige, **Then** se crea una revisión nueva del documento canónico con esos campos `verifiedByHuman`, el original no cambia y el documento se re-ejecuta desde el paso 1.
2. **Given** `SCHEMA_INVALID`, **When** el Maker completa el dato faltante, **Then** se crea una revisión nueva y se re-ejecuta desde el paso 1.
3. **Given** `CLASSIFICATION_REQUIRED`, **When** el Maker elige el tipo de operación del documento o de cada línea, entre los admitidos para ese tipo de documento, **Then** se re-ejecuta desde el paso 4 y la decisión queda auditada.
4. **Given** una clasificación manual, **When** el Maker marca "Proponer como regla", **Then** se crea una regla de clasificación `PROPOSED` para el tercero, que el Admin revisará (spec 001).
5. **Given** `MISSING_DIMENSION`, **When** el Maker informa el centro de costo de la línea, **Then** se re-ejecuta desde el paso 7.
6. **Given** `NO_TEMPLATE` o `ACCOUNT_UNRESOLVED`, **When** el Admin activa la plantilla o completa el mapa, **Then** el Maker puede "Reintentar" y el documento se re-ejecuta desde el paso 6 o 7.
7. **Given** cualquier intervención del Maker, **When** el asiento llega a `PENDING_APPROVAL`, **Then** queda marcado con `manualIntervention` e identifica al Maker, para que la aprobación exija un Checker distinto (RF-05, spec 004).
8. **Given** dos Makers editando el mismo documento, **When** el segundo guarda con una versión desactualizada, **Then** recibe `CONFLICT` y debe refrescar (RNF-13).

---

### User Story 4 — Convertir moneda extranjera con tasa oficial o provisional (Priority: P1)

Como **contador**, quiero que los documentos en moneda extranjera se conviertan a la moneda funcional con la tasa del día de emisión y que, si el servicio de tipo de cambio falla, se use la última tasa conocida marcando el asiento como provisional (RD-09, CU-06).

**Why this priority**: Invariante de dominio; afecta importes y aprobación.

**Independent Test**: Cargar DOC-05 (USD) con el servicio activo: tasa del 2026-09-11, importes funcionales redondeados por línea y asiento cuadrado. Repetir con el interruptor "servicio FX caído": tasa del día hábil anterior, `provisionalFxRate = true`.

**Acceptance Scenarios**:

1. **Given** un documento en USD y el servicio activo, **When** se interpreta, **Then** se usa la tasa del `issueDate` del tipo que indica el paquete, cada línea se convierte con un único redondeo y la línea de balance absorbe la diferencia dentro de la tolerancia.
2. **Given** el servicio caído, **When** se interpreta, **Then** se usa la tasa más reciente anterior, el asiento queda `provisionalFxRate = true` y la traza lo indica.
3. **Given** que no hay ninguna tasa anterior, **When** se interpreta, **Then** el documento queda en `PENDING_INPUT` con `FX_RATE_UNAVAILABLE`.
4. **Given** un documento en la moneda funcional, **When** se interpreta, **Then** no se consulta ninguna tasa.

---

### User Story 5 — Registrar en el período correcto, incluido el registro tardío (Priority: P2)

Como **contador**, quiero que cada asiento tenga una fecha contable en un período abierto y que un documento recibido tarde (su mes ya cerró) se registre en el primer período abierto dentro del plazo que permite la jurisdicción, para no perder el sustento ni asentar en meses cerrados (RD-12, CU-08).

**Why this priority**: Es práctica contable real; sin ella, los documentos atrasados quedan bloqueados.

**Independent Test**: Registrar manualmente una factura de agosto de 2026 (período cerrado) y verificar que su fecha contable es el 2026-09-01, con la marca de registro tardío y el tipo de cambio de su fecha de emisión.

**Acceptance Scenarios**:

1. **Given** un documento cuyo período de emisión está abierto, **When** se valida, **Then** `accountingDate = issueDate`.
2. **Given** un documento de un período cerrado, con la política de registro tardío activa y dentro del plazo del tipo de documento, **When** se valida, **Then** `accountingDate` es el primer día del primer período abierto posterior, el asiento queda marcado `lateRegistration` y la tasa FX y los catálogos se siguen resolviendo al `issueDate`.
3. **Given** la política desactivada, **When** se valida, **Then** el documento queda con `PERIOD_CLOSED` y el Maker puede confirmar el registro tardío (acción de la bandeja) o cancelarlo.
4. **Given** un documento fuera del plazo, **When** se valida, **Then** queda con `LATE_REGISTRATION_LIMIT`.
5. **Given** que no hay ningún período abierto posterior, **When** se valida, **Then** queda con `PERIOD_CLOSED`.

---

### User Story 6 — Actualizar y cancelar documentos en la bandeja (Priority: P2)

Como **Maker**, quiero aplicar una misma corrección a varios documentos a la vez (p. ej. el mismo centro de costo o la misma operación) y cancelar con justificación los que no deben contabilizarse, para mantener la bandeja limpia (HU-02, HU-07, CU-07).

**Why this priority**: Productividad y control del ciclo; no bloquea el flujo principal.

**Independent Test**: Seleccionar las tres boletas de DOC-08 y aplicar "Venta de servicios" en una acción, viendo el resultado por documento; cancelar una con motivo y verificar el estado `CANCELLED` en la bitácora.

**Acceptance Scenarios**:

1. **Given** varios documentos seleccionados con el mismo motivo, **When** el Maker aplica una acción en lote, **Then** cada documento se procesa por separado y el resultado muestra `OK`, `CONFLICT` o el nuevo motivo de cada uno.
2. **Given** un documento en `PENDING_INPUT`, **When** el Maker lo cancela con una justificación, **Then** pasa a `CANCELLED`, la justificación queda auditada y el documento no puede reactivarse.
3. **Given** un documento sin justificación, **When** el Maker intenta cancelarlo, **Then** el sistema lo impide.
4. **Given** la bandeja, **When** el Maker filtra por motivo, tipo de documento, formato o fecha, **Then** la lista se ajusta; los motivos más frecuentes se muestran como contadores.

---

### User Story 7 — Consultar asientos y su trazabilidad (Priority: P3)

Como **Maker, Checker o Auditor**, quiero ver cualquier asiento con sus líneas, su documento y original, y la traza de cada paso de la interpretación (qué regla clasificó, qué plantilla se eligió y por qué, de qué rol salió cada cuenta, qué tasa se usó y qué hizo el Maker), para entender y auditar el resultado (HU-06, parte de interpretación).

**Why this priority**: Transparencia; su ausencia no bloquea el flujo.

**Independent Test**: Abrir el asiento de DOC-02 después de informar el centro de costo y ver los 7 pasos, la intervención del Maker y las 8 líneas.

**Acceptance Scenarios**:

1. **Given** un asiento, **When** se abre su detalle, **Then** se ven cabecera (tipo, perspectiva, operación, plantilla y versión, libro, fechas, período, moneda y tasa, marcas `manualIntervention`, `provisionalFxRate` y `lateRegistration`), líneas con Debe y Haber y totales, documento y original lado a lado, y la traza por paso.
2. **Given** revisiones del documento, **When** se consultan, **Then** se ve qué cambió en cada revisión, quién y cuándo.

---

### Edge Cases

- **Documento interpretado mientras el Admin cambia una plantilla**: se usa la versión activa al momento de interpretar y queda registrada; reintentar puede usar otra versión.
- **Plantilla desactivada después de crear el asiento**: el asiento conserva su versión; si vuelve a la bandeja, el reintento dará `NO_TEMPLATE`.
- **Corrección del Maker que cambia el tipo de documento**: no está permitido en la bandeja (el tipo lo fija la lectura); se cancela y se registra de nuevo.
- **Documento `NOT_FOR_TENANT`, `DUPLICATE` o `FAILED` en la ingestión**: no se interpreta.
- **Tipo de documento que no genera asiento** (guía de remisión): se marca como archivado de referencia, sin asiento.
- **Importe negativo producido por la plantilla** (`INVALID_AMOUNT`): se muestra al Maker como error de configuración para escalar al Admin.
- **Cancelación de un documento referenciado por otro pendiente**: el pendiente vuelve a evaluarse y puede quedar con `REFERENCE_NOT_FOUND`.
- **Fecha de emisión futura**: se interpreta; si su período no existe o está cerrado, aplica US5.
- **Documento con verificaciones hechas por el mismo usuario que después aprueba**: lo bloquea el spec 004 por SoD.

## Requirements *(mandatory)*

### Functional Requirements

**Disparo e interpretación (S2)**

- **FR-001**: El sistema MUST interpretar automáticamente cada documento recibido (evento `DocumentReceived`) cuyo estado de recepción sea `RECEIVED` o `RECEIVED_NEEDS_REVIEW`, y MUST permitir "Reintentar" manualmente un documento en `PENDING_INPUT`.
- **FR-002**: Antes de interpretar, el sistema MUST detener con `LOW_CONFIDENCE_EXTRACTION` todo documento con campos obligatorios bajo el umbral de confianza que no estén verificados por un humano.
- **FR-003**: El sistema MUST resolver las referencias del documento contra los documentos canónicos de la misma empresa (tipo, serie, número y fecha) y detener con `REFERENCE_NOT_FOUND` si una referencia exigida no existe.
- **FR-004**: El sistema MUST resolver el tipo de cambio para documentos en moneda distinta de la funcional según RD-09, con el tipo de tasa del paquete, la tasa provisional si el servicio está caído (interruptor de demo) y `FX_RATE_UNAVAILABLE` si no hay tasa.
- **FR-005**: El sistema MUST ejecutar la interpretación del spec 001 (esquema, perspectiva, clasificación, selección y evaluación) con el contexto del tenant y conservar su traza completa.
- **FR-006**: Todo resultado MUST reflejarse en un `JournalEntry` persistido: con líneas si la evaluación terminó, o sin líneas si se detuvo antes, siempre con sus motivos de pendiente y la traza.

**Validación (S3)**

- **FR-007**: El validador MUST verificar, en este orden: cuadre en moneda funcional (RD-03), fecha contable y período abierto con la política de registro tardío (RD-12), y cuentas de detalle activas con dimensiones exigidas (RD-17). Debe reportar `UNBALANCED`, `PERIOD_CLOSED`, `LATE_REGISTRATION_LIMIT`, `ACCOUNT_UNRESOLVED` o `MISSING_DIMENSION`.
- **FR-008**: La fecha contable MUST calcularse según US5: igual al `issueDate` si su período está abierto; si no, el primer día del primer período abierto posterior, cuando la política de la empresa lo permite y el plazo del tipo de documento no se superó.
- **FR-009**: Un asiento que pasa todas las validaciones MUST transicionar a `PENDING_APPROVAL`, registrar el uso de la versión de plantilla y publicar `JournalEntryDrafted`. Uno que no pasa MUST quedar en `PENDING_INPUT` y publicar `JournalEntrySentToStaging` con sus motivos.
- **FR-010**: Las transiciones de estado MUST seguir el SDD §10.2; toda transición no definida MUST rechazarse con `INVALID_TRANSITION` y auditarse.

**Bandeja del Maker (RF-04)**

- **FR-011**: El sistema MUST ofrecer una bandeja de documentos en `PENDING_INPUT`, con filtros (motivo, tipo de documento, formato, fecha, antigüedad), contadores por motivo y un detalle con el original junto a los datos, el motivo y la acción que lo resuelve.
- **FR-012**: El Maker MUST poder, según el motivo: confirmar o corregir campos contra el original (verificación), completar o corregir campos del documento, clasificar documento o líneas entre las operaciones admitidas (con opción de proponer una regla), informar dimensiones por línea, confirmar un registro tardío, reintentar y cancelar con justificación.
- **FR-013**: Toda corrección de datos del documento MUST crear una revisión nueva del canónico (revisión + 1) que conserva la anterior y el original intactos (RD-01), con el detalle campo por campo en la bitácora.
- **FR-014**: Tras cada acción, el documento MUST re-ejecutarse desde el paso indicado en el SDD §5.6 y marcarse `manualIntervention = true`, con la lista de usuarios que intervinieron.
- **FR-015**: Las actualizaciones MUST usar concurrencia optimista (`entityVersion`) y devolver `CONFLICT` con una versión desactualizada (RNF-13). Las acciones en lote MUST devolver el resultado por documento.
- **FR-016**: La cancelación MUST exigir una justificación, dejar el asiento en `CANCELLED` (terminal) y publicar `JournalEntryCancelled`.

**Consulta y trazabilidad**

- **FR-017**: El sistema MUST mostrar el detalle de cualquier asiento con cabecera, líneas, documento, original, revisiones y traza por paso.
- **FR-018**: El sistema MUST publicar `DocumentClassified` y `TemplateSelected` (SDD §11) y registrar en la bitácora toda interpretación, intervención, reintento y cancelación.

**Permisos**

- **FR-019**: Solo el Maker MUST poder actuar en la bandeja; Checker y Auditor ven la bandeja y los asientos en solo lectura; el Admin de Plantillas ve los motivos `NO_TEMPLATE`, `AMBIGUOUS_TEMPLATE`, `ACCOUNT_UNRESOLVED` e `INVALID_AMOUNT` para corregir la configuración, sin acciones de Maker.

### Key Entities *(include if feature involves data)*

- **JournalEntry**: asiento del SDD §13.2 con `pendingReasons`, `trace`, `accountingDate`, `lateRegistration`, `manualIntervention`, `intervenedBy`, `provisionalFxRate`, `fx`, `configVersions`, `entityVersion` y enlace al documento y su revisión.
- **Revisión del documento canónico**: copia completa con `revision + 1`, autor, motivo y cambios campo por campo.
- **Intervención del Maker**: acción aplicada (verificación, corrección, clasificación, dimensión, registro tardío, reintento, cancelación), autor, fecha y efecto.
- **Traza de interpretación**: pasos con entrada, resultado y detalle (regla, candidatas, tasas, roles), incluidos los de esta feature (confianza, referencias, FX, período).
- **Política de registro tardío**: por empresa (activa o no) y plazo por tipo de documento del paquete.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los documentos de prueba DOC-01 a DOC-16 llegan, tras su carga, exactamente al estado de interpretación esperado del catálogo (`expected.interpretation`).
- **SC-002**: El 100 % de los asientos en `PENDING_APPROVAL` cuadran, están en un período abierto y usan solo cuentas de detalle activas con sus dimensiones.
- **SC-003**: Todo documento detenido muestra al menos un motivo y una acción concreta para resolverlo; ninguno queda sin motivo.
- **SC-004**: Un Maker resuelve cada uno de los 5 pendientes de la prueba (DOC-02, DOC-08, DOC-10, DOC-11, DOC-15) en menos de 2 minutos por documento.
- **SC-005**: Ninguna corrección altera el original ni revisiones anteriores (verificable por huella y por historial).
- **SC-006**: La misma entrada y configuración produce siempre el mismo asiento (determinismo).
- **SC-007**: Con el servicio de tipo de cambio caído, el 100 % de los asientos en moneda extranjera quedan marcados como provisionales.

## Assumptions

- **Política de registro tardío**: activa por defecto en la empresa `01` (`lateRegistration.enabled = true`) e inactiva en la `02`. El plazo por tipo de documento lo define el paquete (Perú: 12 meses para facturas, boletas y notas; sin límite para documentos internos).
- **Tipo de tasa FX**: el paquete Perú define `fxRateType: 'SELL'`; la tabla semilla es de venta USD→PEN.
- **Interpretación asíncrona simulada**: se ejecuta tras la latencia de demo; no hay colas reales.
- **La creación y el uso de reglas `PROPOSED`** reutilizan el servicio de reglas del spec 001 con un permiso nuevo para el Maker.
- **Alertas de SLA de 48 h y alertas al cerrar períodos**: spec 007.
- **Aprobación, firma y publicación**: specs 004 y 005.
- **Roles**: Maker `contador_maria`; Checker `revisor_luis`; Auditor `auditora_ana`; Admin `admin_pedro`.
