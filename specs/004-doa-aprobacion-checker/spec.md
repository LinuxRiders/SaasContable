# Feature Specification: Delegación de Autoridad, Firma y Aprobación del Checker

**Feature Branch**: `004-doa-aprobacion-checker`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Rehacer el spec 004 (Subsistema S4 del SDD v3.0): evaluar cada asiento en PENDING_APPROVAL contra la matriz de delegación de autoridad del tenant (monto en moneda funcional, tipo de documento, tipo de operación, tasa provisional, intervención manual, lectura desde imagen o PDF, registro tardío), aprobar por STP solo lo de bajo riesgo sin marcas, exigir un Checker del nivel requerido y distinto de todo el que intervino (SoD), firmar con hash simulado, rechazar con motivo, simular caída del servicio de firmas y entregar el asiento aprobado a la publicación (spec 005). Reemplaza al spec 004 anterior, que permitía al Admin saltarse la SoD."

**SDD Reference**: SDD v3.0 — §5.5 (S4), RD-05, RD-06, RD-09, RF-05, RF-10, §12.4, §14 (roles), §16 (HSM caído), CU-01 (Alt 4 y 5), HU-03.

**Depende de**: spec 003 (asientos en `PENDING_APPROVAL` con `manualIntervention`, `intervenedBy`, `provisionalFxRate`, `lateRegistration`, `fx`, traza y documento de origen con `sourceFormat`).

**Reemplaza a**: `specs/archive/004-doa-aprobacion-checker-v2-compra-venta/`.

## Contexto para quien implementa

En una empresa real, no cualquier persona aprueba cualquier asiento: una política de **delegación de autoridad** dice quién puede aprobar qué, según el monto y el riesgo. Además rige el **doble control**: quien preparó, corrigió o clasificó un asiento no puede aprobarlo.

Esta feature decide para cada asiento si puede aprobarse automáticamente (STP), porque es de bajo riesgo y nadie tuvo que tocarlo, o si necesita la firma de un Checker con el nivel suficiente. Registra la firma de forma verificable. El asiento aprobado se entrega a la publicación (spec 005).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Decidir el nivel de aprobación de cada asiento (Priority: P1)

Como **sistema**, quiero evaluar cada asiento que llega a `PENDING_APPROVAL` contra la matriz de la empresa y dejar registrada la decisión con sus motivos, para que la aprobación sea consistente y auditable (RF-05).

**Why this priority**: Sin decisión no hay aprobación ni STP.

**Independent Test**: Con la matriz semilla, DOC-01 (S/ 1,180.00, sin marcas) resulta STP; DOC-10 tras la verificación del Maker resulta Checker nivel 1 con el motivo "intervención manual"; una factura de S/ 60,000.00 resulta nivel 2.

**Acceptance Scenarios**:

1. **Given** un asiento en `PENDING_APPROVAL`, **When** se evalúa, **Then** se registra una decisión con el nivel (`STP_AUTO`, `CHECKER_L1`, `CHECKER_L2` o `CHECKER_MAX`), si requiere revisión humana, los motivos (regla por regla) y la versión de la matriz usada.
2. **Given** un asiento con tasa de cambio provisional, **When** se evalúa, **Then** nunca resulta STP (RD-09).
3. **Given** un asiento con intervención manual, leído desde imagen o PDF, registrado manualmente por formulario, o con registro tardío, **When** se evalúa, **Then** nunca resulta STP y el motivo lo indica.
4. **Given** varias reglas aplicables, **When** se evalúa, **Then** gana el nivel más alto.
5. **Given** la misma matriz y el mismo asiento, **When** se evalúa dos veces, **Then** la decisión es idéntica.

---

### User Story 2 — Aprobación automática (STP) (Priority: P1)

Como **empresa**, quiero que los asientos de bajo riesgo sin marcas se aprueben y firmen automáticamente, para no cargar a los Checkers con lo rutinario (CU-01).

**Why this priority**: Es el objetivo de automatización del SDD.

**Independent Test**: Cargar DOC-01 y verificar que, sin intervención humana, queda firmado por el agente STP y entregado a la publicación.

**Acceptance Scenarios**:

1. **Given** una decisión `STP_AUTO`, **When** se procesa, **Then** el agente STP firma (firma simulada verificable) y el asiento se entrega a la publicación.
2. **Given** el servicio de firmas caído (interruptor de demo), **When** un asiento es STP, **Then** queda en `PENDING_APPROVAL` con el motivo "servicio de firmas no disponible", se genera una alerta y se firma automáticamente al restablecerse el servicio.

---

### User Story 3 — Aprobar y firmar como Checker (Priority: P1)

Como **Checker**, quiero una bandeja con los asientos que me corresponde aprobar según mi nivel, ver el detalle completo (asiento, documento y original, traza, intervenciones y motivos de la decisión) y firmar, para aprobar con información suficiente (HU-03).

**Why this priority**: Es el control humano central (Maker-Checker).

**Independent Test**: Como `revisor_luis` (nivel 1), aprobar DOC-10 (verificado por `contador_maria`) y ver la firma registrada; intentar aprobar el asiento de nivel 2 y verlo rechazado por nivel insuficiente.

**Acceptance Scenarios**:

1. **Given** un Checker de nivel 1, **When** abre su bandeja, **Then** ve los asientos que requieren nivel 1 o más, marcados según si puede aprobarlos o no.
2. **Given** un asiento de nivel 1, **When** el Checker lo revisa y confirma la firma, **Then** se registra la firma (asiento, contenido, firmante, rol, nivel y fecha) y el asiento se entrega a la publicación.
3. **Given** un asiento cuyo nivel requerido supera el del Checker, **When** intenta aprobarlo, **Then** el sistema lo rechaza con "nivel de autoridad insuficiente".
4. **Given** un asiento en el que el Checker intervino (subió el archivo, verificó, corrigió o clasificó), **When** intenta aprobarlo, **Then** el sistema lo rechaza por segregación de funciones (RD-05), aunque su nivel alcance.
5. **Given** el contenido del asiento cambió después de abrir el detalle, **When** el Checker firma, **Then** recibe `CONFLICT` y debe revisar la versión nueva.

---

### User Story 4 — Rechazar un asiento (Priority: P1)

Como **Checker**, quiero rechazar un asiento indicando el motivo, para que no se registre y el Maker sepa por qué (RF-10).

**Independent Test**: Rechazar un asiento con motivo y verificar el estado `REJECTED`, el evento y la bitácora; sin motivo se impide.

**Acceptance Scenarios**:

1. **Given** un asiento en `PENDING_APPROVAL`, **When** el Checker lo rechaza con un motivo, **Then** pasa a `REJECTED` (terminal), se publica `JournalEntryRejected` y el Maker lo ve con el motivo.
2. **Given** un rechazo sin motivo, **When** se intenta, **Then** el sistema lo impide.
3. **Given** un documento cuyo asiento fue rechazado, **When** el Maker necesita contabilizarlo de otra forma, **Then** puede "Volver a interpretar" el documento, lo que crea un asiento nuevo enlazado al rechazado.

---

### User Story 5 — Consultar y mantener la matriz de delegación (Priority: P2)

Como **Admin de Plantillas** (edición) o **Auditor** (lectura), quiero ver y ajustar la matriz de delegación de la empresa con su historial de versiones, y registrar excepciones de SoD justificadas, para que la política sea explícita y auditable.

**Why this priority**: La semilla basta para operar; la edición es gobierno de la política.

**Independent Test**: Como Admin, bajar el umbral de STP de S/ 5,000.00 a S/ 2,000.00, ver la versión nueva con el diff y comprobar que DOC-01 (S/ 1,180.00) sigue siendo STP mientras DOC-04 (S/ 2,360.00) pasa a nivel 1.

**Acceptance Scenarios**:

1. **Given** la matriz, **When** se consulta, **Then** se ven sus reglas (condición, nivel y descripción), los niveles de cada Checker y la versión vigente.
2. **Given** un cambio de la matriz, **When** el Admin lo guarda, **Then** se crea una versión nueva, auditada, con diff; los asientos ya evaluados conservan la decisión de la versión con que se evaluaron.
3. **Given** una excepción de SoD (usuario, alcance y motivo), **When** se registra, **Then** queda visible para el Auditor y la aprobación que la usa queda marcada.

---

### Edge Cases

- **Asiento de moneda extranjera**: el monto que se evalúa es el total en moneda funcional.
- **Único Checker disponible que intervino**: el asiento queda pendiente; ningún rol (tampoco Admin) puede saltarse la SoD sin una excepción registrada.
- **Cambio de nivel de un Checker mientras hay asientos pendientes**: rige el nivel al momento de firmar.
- **Asiento que pasó por la bandeja del Maker después de una decisión STP**: no ocurre, porque la decisión se toma al entrar en `PENDING_APPROVAL`, y volver a la bandeja no está permitido desde ese estado.
- **Rechazo de un asiento de reversión** (spec 006): mismo flujo; el original sigue `POSTED`.
- **Firma con el período cerrado entre la evaluación y la firma**: la aprobación se bloquea con `PERIOD_CLOSED` (RD-12); el asiento queda pendiente con el motivo.

## Requirements *(mandatory)*

### Functional Requirements

**Decisión (RF-05)**

- **FR-001**: El sistema MUST evaluar cada asiento al entrar en `PENDING_APPROVAL` con la matriz vigente de su empresa y registrar `ApprovalDecision` con nivel, `requiresHumanReview`, motivos por regla, versión de matriz y fecha.
- **FR-002**: La matriz MUST poder expresar condiciones sobre: total en moneda funcional, tipo de documento, tipo de operación, perspectiva, formato de origen, `provisionalFxRate`, `manualIntervention`, `lateRegistration` y si el asiento es una reversión, usando el lenguaje de expresiones del spec 001.
- **FR-003**: El resultado MUST ser el nivel más alto entre las reglas que se cumplen; si ninguna se cumple, el nivel por defecto de la matriz.
- **FR-004**: Un asiento con tasa provisional, intervención manual, lectura desde imagen o PDF, registro manual por formulario, o registro tardío MUST NOT aprobarse por STP, independientemente de la matriz (regla fija del sistema, RD-09 y RF-05).

**Firma (RD-06)**

- **FR-005**: Toda aprobación MUST producir una firma simulada: huella SHA-256 del contenido canónico del asiento (cabecera y líneas) más firmante, rol, nivel y marca de tiempo. La firma MUST poder verificarse recalculando la huella.
- **FR-006**: El agente STP MUST firmar los asientos `STP_AUTO` sin intervención humana; con el servicio de firmas caído, MUST dejarlos pendientes con motivo y alerta, y firmarlos al restablecerse.

**Aprobación humana y SoD (RD-05)**

- **FR-007**: Un Checker MUST poder aprobar solo si su nivel es mayor o igual al requerido, no figura como creador ni en `intervenedBy` del asiento, no subió el documento de origen y, en reversiones, no fue quien la solicitó.
- **FR-008**: La SoD MUST validarse en el servicio. Ningún rol tiene excepciones salvo las registradas en la matriz, que quedan marcadas en la aprobación.
- **FR-009**: La aprobación MUST verificar que el asiento no cambió (`entityVersion`) y que su período sigue abierto antes de firmar.
- **FR-010**: El rechazo MUST exigir motivo, dejar el asiento en `REJECTED` y publicar `JournalEntryRejected`.
- **FR-011**: El sistema MUST permitir al Maker "Volver a interpretar" el documento de un asiento rechazado, lo que crea un asiento nuevo enlazado (`supersedesEntryId`).

**Entrega a publicación**

- **FR-012**: El asiento aprobado MUST pasar a `POSTED` junto con su firma y entregarse a la publicación mediante un único punto de entrega (`postEntry`). En esta feature, ese punto publica `JournalEntryPosted` en el bus; el spec 005 lo reemplaza por la publicación atómica con outbox y libros.

**Matriz, bandeja y auditoría**

- **FR-013**: La matriz MUST versionarse (RD-10): cada cambio crea una versión con autor, fecha y diff; cada decisión guarda la versión usada.
- **FR-014**: El sistema MUST ofrecer la bandeja del Checker (asientos `PENDING_APPROVAL` con nivel, motivos, monto, marcas y si el usuario puede aprobarlos) y un detalle con asiento, documento y original, traza, intervenciones, decisión y firma.
- **FR-015**: Toda decisión, firma, rechazo, bloqueo por SoD o nivel, y cambio de matriz MUST auditarse.
- **FR-016**: El sistema MUST incorporar un segundo Checker de demostración con nivel máximo (`gerente_rosa`), además de `revisor_luis` (nivel 1).

### Key Entities

- **Matriz DoA**: por empresa y versionada; reglas `{ id, description, when (expresión), level }`, nivel por defecto, niveles de Checker por usuario y excepciones de SoD.
- **ApprovalDecision**: nivel, `requiresHumanReview`, motivos, versión de matriz y fecha; guardada en el asiento.
- **Firma (`Signature`)**: asiento, huella del contenido, firmante (usuario o agente STP), rol, nivel, fecha, tipo (`STP` o `HUMAN`), excepción usada.
- **Rechazo**: asiento, Checker, motivo y fecha.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los asientos en `PENDING_APPROVAL` tienen una decisión registrada con motivos.
- **SC-002**: Ningún asiento con tasa provisional, intervención manual, lectura desde imagen o PDF, registro manual, o registro tardío se aprueba por STP.
- **SC-003**: Ningún usuario aprueba un asiento en el que intervino (0 casos en las pruebas y en la demo).
- **SC-004**: Toda firma se verifica recalculando su huella; una alteración del asiento después de firmar se detecta.
- **SC-005**: Con los documentos de prueba, al menos DOC-01, DOC-04 y DOC-06 se aprueban solos, y DOC-07, DOC-09, DOC-10 y DOC-16 exigen Checker.
- **SC-006**: Un Checker aprueba o rechaza un asiento desde su bandeja en menos de 1 minuto.

## Assumptions

- **Matriz semilla (empresa `01`, en soles)**:
  - STP hasta S/ 5,000.00 de total.
  - Nivel 1 hasta S/ 50,000.00, y siempre para planilla y activo fijo.
  - Nivel 2 por encima de S/ 50,000.00, y para activo fijo por encima de S/ 10,000.00.
  - Nivel máximo para las reversiones de períodos cerrados (spec 006).
  - Nivel por defecto: nivel 1.

  La empresa `02` usa la misma matriz.
- **Checkers**: `revisor_luis` nivel 1; `gerente_rosa` nivel máximo (usuario de demo nuevo).
- **Excepciones de SoD**: el modelo las admite; la semilla no trae ninguna.
- **Cuatro ojos para cambios de la matriz**: fuera de alcance del prototipo (punto pendiente del SDD §19); los cambios se auditan.
- **Firma**: simulada con SHA-256 (constitución II); sin HSM ni llaves.
- **Publicación atómica, outbox, libros y proyecciones**: spec 005.
