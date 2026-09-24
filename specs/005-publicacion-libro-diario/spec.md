# Feature Specification: Publicación Atómica, Libro Diario y Registros Legales

**Feature Branch**: `005-publicacion-libro-diario`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Rehacer el spec 005 (Subsistema S5 del SDD v3.0): publicar de forma atómica cada asiento aprobado (RD-13) con outbox y estado POSTED_PENDING_PUBLISH ante caída del bus, anotarlo en un Libro Diario de solo agregado encadenado por huellas, proyectarlo al registro legal que indica su libro destino (Registro de Compras, de Ventas, de Retenciones, Caja y Bancos) con los datos del documento que ese registro exige, integrarlo a los módulos existentes (Libros/Mayor, Liquidación IGV, Cierre) sin refactorizarlos, y ofrecer al Auditor la trazabilidad completa de un asiento desde el original hasta el evento publicado (HU-06). Reemplaza al spec 005 anterior."

**SDD Reference**: SDD v3.0 — §5.5 (S5), RD-07, RD-13, RF-19, RNF-03, RNF-04, RNF-09, §11 (`JournalEntryPosted`), §15 (libros legales), §16 (fallo del bus), §21.6, CU-01 paso 14, HU-06.

**Depende de**: spec 004 (`postEntry`, firma) y specs 001–003 (asiento con libro destino, documento y traza).

**Reemplaza a**: `specs/archive/005-publicacion-libro-diario-v2-compra-venta/`.

## Contexto para quien implementa

Cuando un asiento se aprueba, el contador lo anota en el **Libro Diario** y en el **registro legal** que corresponde:

- Una factura recibida va al Registro de Compras, con su serie, número, RUC del proveedor, base, IGV y total.
- Una factura emitida va al Registro de Ventas.
- Un recibo por honorarios va al Libro de Retenciones.
- Un extracto bancario va a Caja y Bancos.

A partir de ahí el asiento alimenta el Mayor, la liquidación de impuestos y el cierre. Lo registrado no se borra: se corrige con un asiento inverso (spec 006).

Esta feature garantiza que el asiento aprobado **quede publicado exactamente una vez** aunque el bus falle (outbox). Además lo anota en un Diario **verificable** (cada anotación encadena la huella de la anterior), lo proyecta a los registros legales y a los módulos existentes, y permite reconstruir su historia completa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Publicar de forma atómica y confiable (Priority: P1)

Como **sistema**, quiero que la aprobación de un asiento y la publicación de su evento ocurran juntas o no ocurran, y que si el bus falla el asiento quede pendiente de publicar y se publique después sin duplicarse (RD-13).

**Why this priority**: Invariante del SDD; sin él, un asiento aprobado podría no llegar nunca a los libros o llegar dos veces.

**Independent Test**: Con el interruptor "bus caído", aprobar DOC-01: queda `POSTED_PENDING_PUBLISH` con el evento en el outbox. Al restablecer el bus: `POSTED`, un único evento en el Diario.

**Acceptance Scenarios**:

1. **Given** un asiento aprobado y el bus disponible, **When** se publica, **Then** en una misma operación el asiento queda `POSTED`, el evento `JournalEntryPosted` se agrega al outbox y el outbox lo entrega al bus, que lo anota en el Diario y en las proyecciones.
2. **Given** el bus caído, **When** se aprueba, **Then** el asiento queda `POSTED_PENDING_PUBLISH`, el evento queda en el outbox como pendiente y se muestra una alerta.
3. **Given** eventos pendientes, **When** el bus se restablece (o se pulsa "Reintentar publicación"), **Then** se entregan en orden, cada asiento pasa a `POSTED` y ningún evento se anota dos veces (el consumidor ignora ids ya aplicados).
4. **Given** un asiento `POSTED`, **When** cualquier usuario o proceso intenta modificarlo, **Then** el sistema lo rechaza (RD-07).

---

### User Story 2 — Libro Diario verificable (Priority: P1)

Como **Auditor**, quiero un Libro Diario de solo agregado en el que cada anotación encadena la huella de la anterior, y poder verificar la cadena completa, para detectar cualquier alteración (RNF-09).

**Why this priority**: Es la garantía de integridad del registro contable.

**Independent Test**: Tras publicar 5 asientos, ejecutar "Verificar integridad": cadena válida. Alterar a mano un importe en el almacenamiento y verificar de nuevo: se identifica la primera anotación inválida.

**Acceptance Scenarios**:

1. **Given** asientos publicados, **When** se consulta el Diario, **Then** cada anotación muestra número correlativo, fecha contable, asiento, glosa, líneas, huella propia y huella anterior.
2. **Given** la cadena intacta, **When** se verifica, **Then** el resultado es válido, con la cantidad de anotaciones revisadas.
3. **Given** una anotación alterada, **When** se verifica, **Then** el resultado indica la primera anotación inválida y el motivo.

---

### User Story 3 — Registros legales según el libro destino (Priority: P1)

Como **contador**, quiero que cada asiento publicado aparezca en el registro legal que indica su libro destino, con los datos del documento que ese registro exige, para tener los registros que pide la jurisdicción sin volver a los documentos (RF-19).

**Why this priority**: Es lo que distingue un sistema contable de un simple generador de asientos.

**Independent Test**: Tras publicar DOC-01, DOC-03, DOC-04 y DOC-06, el Registro de Compras muestra DOC-01 y la nota de crédito DOC-03 (con importes negativos), el Registro de Ventas muestra DOC-04 y el Libro de Retenciones muestra DOC-06.

**Acceptance Scenarios**:

1. **Given** un asiento con libro "Registro de Compras", **When** se publica, **Then** se agrega una fila con período, fecha de emisión, fecha contable, tipo de documento (código oficial), serie, número, identificador fiscal y nombre del proveedor, base imponible, impuesto, otros tributos, total, moneda y tipo de cambio, y enlace al asiento.
2. **Given** una nota de crédito, **When** se proyecta, **Then** sus importes aparecen con signo negativo y con la referencia al documento que modifica.
3. **Given** un recibo por honorarios, **When** se proyecta al Libro de Retenciones, **Then** muestra el prestador, el importe bruto, la retención y el neto.
4. **Given** un asiento sin registro auxiliar (Diario solamente), **When** se publica, **Then** solo aparece en el Diario.
5. **Given** una reversión (spec 006), **When** se publica, **Then** el registro muestra la fila inversa enlazada a la original.
6. **Given** el registro de un período, **When** el contador lo consulta, **Then** puede filtrarlo por período y exportarlo a CSV con las columnas que define el paquete para ese libro.

---

### User Story 4 — Integración con los módulos existentes (Priority: P2)

Como **contador**, quiero que los asientos publicados por el motor aparezcan en Libros (Diario y Mayor), en la Liquidación de IGV y en el Cierre del prototipo existente, junto con los registrados manualmente, para tener una sola contabilidad (constitución VII).

**Why this priority**: Une el subsistema nuevo con el prototipo sin reescribirlo.

**Independent Test**: Publicar DOC-01 y DOC-04 y verificar que Libros muestra los vouchers nuevos con su origen, que el Mayor de la cuenta 4011101 incluye sus importes y que la Liquidación de IGV suma el crédito de DOC-01 y el débito de DOC-04.

**Acceptance Scenarios**:

1. **Given** un asiento publicado, **When** se abre Libros, **Then** aparece como voucher con fecha contable, subdiario según el libro destino, documento de origen, glosa y líneas en Debe y Haber, marcado "Motor contable" con enlace al asiento.
2. **Given** asientos publicados con IGV, **When** se abre la Liquidación de IGV, **Then** sus bases e impuestos se suman a los de los registros manuales (las notas de crédito restan).
3. **Given** una recarga del navegador, **When** se vuelve a abrir Libros, **Then** los vouchers del motor siguen ahí (persistidos).

---

### User Story 5 — Trazabilidad completa de un asiento (Priority: P2)

Como **Auditor**, quiero consultar en una sola vista toda la historia de un asiento: el original con su huella, las revisiones del documento, la interpretación paso a paso, las intervenciones del Maker, la decisión de aprobación, la firma, el evento publicado y su anotación en el Diario y en el registro legal (HU-06, RNF-03).

**Why this priority**: Es el requisito de fiscalización del SDD; no bloquea la operación.

**Independent Test**: Para el asiento de DOC-10, la vista muestra la foto original con su huella, la revisión 2 con los 3 campos verificados por `contador_maria`, la traza, la aprobación de `revisor_luis` con su firma verificada, el evento y la anotación n.º X del Diario.

**Acceptance Scenarios**:

1. **Given** un asiento publicado, **When** el Auditor abre su trazabilidad, **Then** ve una línea de tiempo con cada paso (fecha, actor, rol, `traceId`) y las huellas verificadas en cada punto (original, firma, Diario).
2. **Given** una verificación que falla en cualquier punto, **When** se muestra, **Then** queda resaltada.

---

### Edge Cases

- **Publicación duplicada del mismo evento** (reintento del outbox después de una entrega exitosa no confirmada): el Diario y las proyecciones la ignoran por el id del evento.
- **Bus caído varias veces seguidas**: el outbox conserva el orden y el contador de intentos; no hay backoff real (constitución).
- **Asiento en moneda extranjera**: los registros muestran moneda, tipo de cambio e importes en moneda funcional.
- **Voucher del motor en el módulo de Libros**: es de solo lectura (RD-07); las acciones de edición del módulo existente no aplican a él.
- **Reset a datos demo**: limpia outbox, Diario, registros y proyecciones.
- **Alteración detectada en el Diario**: se reporta; el sistema no la "repara".

## Requirements *(mandatory)*

### Functional Requirements

**Publicación atómica (RD-13)**

- **FR-001**: `postEntry` MUST, en una sola escritura lógica, cambiar el estado a `POSTED`, guardar la firma y agregar el evento `JournalEntryPosted` al outbox. Después, el despachador del outbox intenta entregarlo al bus.
- **FR-002**: Si la entrega falla (interruptor de demo "bus caído"), el asiento MUST quedar `POSTED_PENDING_PUBLISH` y el evento pendiente con su contador de intentos; al restablecerse el bus o con "Reintentar publicación", MUST entregarse en orden y el asiento volver a `POSTED`.
- **FR-003**: Los consumidores del evento (Diario, registros, proyecciones) MUST ser idempotentes por id de evento.
- **FR-004**: Ningún asiento `POSTED` o `POSTED_PENDING_PUBLISH` MUST poder modificarse por ninguna vía (RD-07).

**Libro Diario (RNF-09)**

- **FR-005**: Cada asiento publicado MUST anotarse en un Diario de solo agregado con número correlativo por empresa, `prevHash` y `hash` = SHA-256 del contenido de la anotación más `prevHash`.
- **FR-006**: El sistema MUST permitir verificar la cadena completa e indicar la primera anotación inválida.

**Registros legales (RF-19)**

- **FR-007**: Cada asiento publicado MUST proyectarse al registro de su `legalBookCode`, con las columnas que define el paquete para ese libro y los datos del documento de origen; los ajustes (notas de crédito) MUST proyectarse con signo negativo y referencia.
- **FR-008**: El paquete MUST definir para cada libro sus columnas (clave, etiqueta, origen del dato) y el signo por tipo de documento; el proyector MUST NOT contener columnas de un país.
- **FR-009**: Los registros MUST poder filtrarse por período y exportarse a CSV.

**Integración (constitución VII)**

- **FR-010**: Los asientos publicados MUST aparecer en los módulos existentes de Libros (Diario y Mayor), Liquidación de IGV y Cierre, combinados con los registros existentes, sin modificar la lógica de esos módulos más allá de leer una fuente adicional.
- **FR-011**: Las proyecciones MUST persistirse y reconstruirse desde el Diario ("Reconstruir proyecciones").

**Trazabilidad (HU-06, RNF-03)**

- **FR-012**: El sistema MUST ofrecer la vista de trazabilidad de US5, con verificación de huellas del original, de la firma y del Diario.
- **FR-013**: El mismo `traceId` MUST recorrer original, recepción, interpretación, aprobación, evento y anotación.

**Permisos y auditoría**

- **FR-014**: Diario, registros y trazabilidad MUST ser visibles para todos los roles del tenant; solo el Admin y el Auditor pueden ejecutar "Verificar integridad" y "Reconstruir proyecciones"; los interruptores de demo siguen las reglas existentes.
- **FR-015**: Publicación, reintento, verificación y reconstrucción MUST auditarse.

### Key Entities

- **OutboxEvent**: evento pendiente o entregado, con asiento, intentos, último error y fechas.
- **LedgerEntry** (anotación del Diario): número, fecha contable, asiento, contenido, `prevHash`, `hash` e id del evento.
- **RegisterRow** (fila de registro legal): libro, período, columnas del libro, signo, asiento y documento.
- **LedgerVoucher** (proyección para los módulos existentes): voucher en el formato del prototipo, con origen "motor" y enlace al asiento.
- **Definición de libro** (en el paquete): columnas y reglas de signo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los asientos aprobados terminan `POSTED` y anotados exactamente una vez, incluso con 3 caídas consecutivas del bus en la prueba.
- **SC-002**: La verificación del Diario detecta el 100 % de las alteraciones introducidas en la prueba e identifica la primera anotación afectada.
- **SC-003**: Los 4 registros legales de la demo (Compras, Ventas, Retenciones y Caja y Bancos) muestran cada asiento en el registro correcto, con los importes que cuadran contra el asiento.
- **SC-004**: La Liquidación de IGV refleja los documentos del motor: la suma del crédito y del débito coincide con los registros de Compras y Ventas del período.
- **SC-005**: Un Auditor reconstruye la historia completa de un asiento en una sola vista, en menos de 1 minuto.

## Assumptions

- **Bus y outbox** simulados (constitución): el despacho es inmediato tras la escritura o manual al reintentar; no hay backoff real.
- **Columnas de los registros**: el paquete Perú define columnas simplificadas inspiradas en los formatos 8.1, 14.1, retenciones de 4.ª categoría y 1.1; la generación de libros electrónicos oficiales está fuera de alcance (SDD §2).
- **Integración**: `AccountingContext` combina sus datos en memoria con las proyecciones persistidas del motor; Compras, Ventas y Tesorería no se modifican.
- **Mayor y Balances**: los calcula el módulo de Libros existente a partir de los vouchers combinados; no se crea un Mayor nuevo.
