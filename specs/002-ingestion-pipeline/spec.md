# Feature Specification: Ingestión Multiformato de Documentos Sustentatorios

**Feature Branch**: `002-ingestion-pipeline`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Rehacer el spec 002 (Subsistema S1 del SDD v3.0: Ingestión multiformato) sobre el modelo del SDD §5.3, §13.1, §20.9 y RF-01, RF-02, RF-12 (lote simple), RF-18, RF-20, RD-01, RD-02, RD-04, RD-08, RD-15: canales (carga de archivos, registro manual por formulario según el esquema del tipo de documento, documentos de ejemplo), almacén append-only del original, registro de parsers y extractores (XML UBL 2.1 con perfil de jurisdicción, JSON de API, CSV con perfil de columnas, formulario, PDF e imágenes mediante extractor simulado determinista por SHA-256 con confianza por campo), producción del CanonicalDocument genérico del spec 001, deduplicación agnóstica posterior al parseo (incluido el mismo documento en XML y PDF), DLQ básica para ilegibles o no soportados, bandeja de documentos recibidos con vista del original, y el conjunto de 16 documentos de prueba ficticios reales (XML, JSON, CSV, fotos JPG/PNG nítidas y borrosas, PDF con texto y escaneado). Entrega el documento canónico a la interpretación (spec 003). Reemplaza al spec 002-ingestion-pipeline anterior (solo XML/JSON y canónico con RUC)."

**SDD Reference**: SDD v3.0 — §5.3 (S1), §13.1 (`CanonicalDocument`), §20.2 (esquemas), §20.9 (multiformato y documentos de prueba), RD-01, RD-02, RD-04, RD-08, RD-15, RF-01, RF-02, RF-12, RF-18, RF-20, CU-02, CU-04.

**Depende de**: spec 001 (paquete de jurisdicción, catálogo de tipos de documento y contrato `CanonicalDocument` en `specs/001-motor-plantillas-contables/data-model.md` §4).

**Reemplaza a**: `specs/archive/002-ingestion-pipeline-v2-compra-venta/`.

## Contexto para quien implementa

Un contador recibe los documentos en la forma en que llegan: el XML de una factura electrónica, un PDF por correo, la foto de una boleta tomada con el celular, un Excel con las boletas del día o un papel que debe digitar. Lo primero que hace es **archivarlo tal cual** como sustento, **identificar qué documento es**, **leer sus datos** y **comprobar que no lo registró antes**.

Esta feature hace exactamente eso y termina ahí: entrega un documento canónico, con la procedencia y la confianza de cada dato, a la interpretación contable (spec 003). No clasifica la operación, no elige plantilla y no crea asientos.

Ningún paso depende de un país. Lo específico de Perú (códigos de la factura electrónica, formato del RUC, columnas del Excel de boletas) vive en el Paquete de Jurisdicción como **perfiles de lectura** (datos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cargar un documento electrónico estructurado (Priority: P1)

Como **Maker (analista contable)**, quiero cargar el XML de una factura electrónica, un JSON enviado por un sistema externo o un CSV con varias boletas, para que el sistema guarde el original, identifique el tipo de documento, lea todos sus datos y lo deje listo para contabilizar.

**Why this priority**: Es el canal principal en jurisdicciones con facturación electrónica; sin él no hay flujo.

**Independent Test**: Cargar el XML de prueba "factura de mercadería" y verificar que aparece en Documentos recibidos como Factura, recibida, con emisor, receptor, líneas, impuesto y totales correctos, con confianza 1.0 en todos los campos y el original descargable.

**Acceptance Scenarios**:

1. **Given** el Maker está en la empresa `01`, **When** carga un XML UBL 2.1 de factura, **Then** el sistema guarda el archivo original sin modificarlo, lo lee con el perfil de la jurisdicción de la empresa, asigna el tipo `INVOICE` del catálogo y produce un documento canónico con partes, serie, número, fechas, moneda, líneas, impuestos, totales y procedencia (`sourceFormat: XML`, confianza 1.0).
2. **Given** un JSON que cumple el contrato de documentos del sistema, **When** el Maker lo carga, **Then** se produce el mismo tipo de documento canónico, con importes convertidos a unidades mínimas según la moneda.
3. **Given** un CSV con tres boletas en el formato de columnas configurado para la empresa, **When** el Maker lo carga, **Then** se crean tres documentos canónicos independientes; una fila con error (p. ej. importe no numérico) se reporta con su número de fila y no impide las otras dos.
4. **Given** una nota de crédito en XML, **When** se carga, **Then** su referencia al documento modificado queda en el canónico.
5. **Given** un documento en el que la empresa no figura como emisor ni como receptor, **When** se carga, **Then** se registra como **ajeno a la empresa** y no avanza (RD-08).

---

### User Story 2 — Cargar una foto o un PDF (Priority: P1)

Como **Maker**, quiero cargar la foto de una boleta o factura, o un PDF recibido por correo, y que el sistema lea sus datos indicando qué tan seguro está de cada uno, para no digitarlos a mano y saber cuáles debo revisar.

**Why this priority**: Buena parte de los documentos reales llegan como imagen o PDF; es un requisito explícito del SDD (RF-20).

**Independent Test**: Cargar la foto nítida de prueba y ver todos los campos con confianza alta; cargar la foto borrosa y ver el total y el identificador del emisor marcados como dudosos, junto a la imagen original.

**Acceptance Scenarios**:

1. **Given** la foto nítida de prueba de un recibo de servicio de energía, **When** el Maker la carga, **Then** el sistema propone el tipo de documento con su confianza y muestra cada campo leído con su valor, su confianza y su ubicación en la imagen.
2. **Given** la foto borrosa de prueba de una factura, **When** se carga, **Then** los campos leídos con confianza bajo el umbral de la empresa (por defecto el del paquete, 0.85) quedan **marcados como dudosos**, el documento se recibe igual y queda indicado que requiere verificación humana antes de contabilizarse.
3. **Given** un PDF con texto, **When** se carga, **Then** se lee como documento no estructurado (`PDF_TEXT`) con confianza por campo.
4. **Given** un PDF escaneado, **When** se carga, **Then** se lee como `PDF_SCANNED`.
5. **Given** una imagen sin un documento reconocible (p. ej. una foto de paisaje), **When** se carga, **Then** el documento va a la DLQ con el motivo "ilegible o tipo de documento no reconocido" y el original queda guardado.
6. **Given** un campo que el extractor no encontró, **When** se muestra el canónico, **Then** el campo aparece vacío y marcado como "no encontrado"; el sistema nunca inventa un valor.
7. **Given** el interruptor de demo "Forzar baja confianza" activo, **When** se carga cualquier foto o PDF de prueba, **Then** todos sus importes se reciben como dudosos.

---

### User Story 3 — Detectar documentos duplicados (Priority: P1)

Como **Maker**, quiero que el sistema detecte si un documento ya fue recibido, aunque llegue en otro formato, para no contabilizarlo dos veces (RD-04).

**Why this priority**: Duplicar un documento duplica gasto, crédito fiscal y deuda; es un invariante.

**Independent Test**: Cargar el XML de la factura de mercadería y después el PDF de esa misma factura: el segundo se registra como duplicado enlazado al primero.

**Acceptance Scenarios**:

1. **Given** una factura ya recibida, **When** se vuelve a cargar el mismo XML, **Then** el nuevo original se guarda por trazabilidad, se marca como **duplicado**, queda enlazado al documento original y no avanza.
2. **Given** una factura recibida en XML, **When** llega el PDF de la misma factura (mismo emisor, tipo, serie, número y fecha), **Then** también se detecta como duplicado.
3. **Given** la misma serie y número pero de otro emisor, **When** se carga, **Then** no es duplicado.
4. **Given** una serie y número escritos con distinto formato (`F001-00000123` y `F001-123`), **When** se comparan, **Then** se consideran el mismo documento.
5. **Given** un duplicado, **When** el Auditor revisa la bitácora, **Then** ve el intento con usuario, fecha, canal y enlace al original.

---

### User Story 4 — Registrar manualmente un documento físico o interno (Priority: P2)

Como **Maker**, quiero registrar desde un formulario un comprobante en papel o un documento interno (resumen de planilla, depreciación del mes, provisión), con los campos que exige su tipo y opcionalmente la foto del físico, para contabilizarlo con el mismo control que un documento electrónico (RF-18).

**Why this priority**: Sin este canal no se contabilizan documentos internos ni físicos; no bloquea los canales electrónicos.

**Independent Test**: Registrar un documento interno "Depreciación de setiembre" con dos líneas y verificar que se recibe con perspectiva interna y confianza 1.0 verificada por humano.

**Acceptance Scenarios**:

1. **Given** el Maker elige el tipo de documento en el formulario, **When** el tipo se carga, **Then** el formulario muestra exactamente los campos de cabecera y de línea de su esquema, con los obligatorios marcados.
2. **Given** faltan campos obligatorios, **When** el Maker intenta registrar, **Then** el formulario lo impide indicando qué falta.
3. **Given** un comprobante físico, **When** el Maker adjunta su foto, **Then** la foto se guarda como original y el documento queda con `sourceFormat: FORM` y el adjunto enlazado.
4. **Given** un documento interno, **When** se registra, **Then** el emisor es la propia empresa y se deduplica igual que cualquier otro documento.

---

### User Story 5 — Revisar los documentos recibidos (Priority: P2)

Como **Maker** (o **Checker** y **Auditor** en solo lectura), quiero una bandeja de documentos recibidos con su estado, filtros y un detalle que muestre el original junto a los datos leídos, para saber qué llegó, qué falta revisar y qué se descartó.

**Why this priority**: Da visibilidad y trazabilidad (HU-06) sin depender de la interpretación.

**Independent Test**: Tras cargar el conjunto de prueba, la bandeja muestra cada documento con su estado (recibido, recibido con datos dudosos, duplicado, ajeno, en DLQ) y el detalle muestra el original (imagen, PDF o texto) junto a los campos con su confianza.

**Acceptance Scenarios**:

1. **Given** documentos cargados, **When** el Maker abre la bandeja, **Then** ve para cada uno: fecha de recepción, canal, formato, tipo de documento, emisor, serie y número, total, estado y cantidad de campos dudosos.
2. **Given** la bandeja, **When** filtra por estado, formato, tipo o rango de fechas, **Then** la lista se reduce en consecuencia.
3. **Given** un documento, **When** abre su detalle, **Then** ve el original a la izquierda (imagen, PDF o XML/JSON/CSV formateado) y a la derecha los datos canónicos agrupados (partes, cabecera, líneas, impuestos, retenciones, referencias, totales), con la confianza de cada campo y los dudosos resaltados.
4. **Given** un documento recibido, **When** existe el módulo de interpretación (spec 003), **Then** el documento queda disponible para interpretarse. Mientras no exista, queda en estado "Recibido" sin avanzar.
5. **Given** un usuario de otra empresa, **When** abre la bandeja, **Then** no ve documentos de la empresa `01` (RD-08).

---

### User Story 6 — Probar la ingestión con el conjunto de documentos de ejemplo (Priority: P1)

Como **Maker** o evaluador del prototipo, quiero un catálogo con los 16 documentos de prueba del SDD §20.9 que se puedan cargar con un clic y que muestren el resultado esperado, para demostrar y verificar que el sistema acepta cualquier formato.

**Why this priority**: Es la evidencia de que la ingestión es realmente multiformato (requisito explícito); también alimenta las pruebas automáticas.

**Independent Test**: Cargar los 16 documentos de ejemplo en orden y comprobar que cada resultado coincide con el esperado del catálogo.

**Acceptance Scenarios**:

1. **Given** el catálogo de ejemplos, **When** el Maker lo abre, **Then** ve cada documento con su formato, tipo, descripción y resultado esperado, y puede previsualizar el archivo.
2. **Given** un ejemplo, **When** lo carga, **Then** pasa por el mismo camino que un archivo subido por el usuario (no hay atajos).
3. **Given** los 16 ejemplos cargados en orden, **When** se comparan los resultados, **Then** coinciden con los esperados: 12 recibidos (de ellos, 1 con datos dudosos y 1 con nota de crédito sin referencia, que la interpretación detectará), 1 duplicado, 2 en DLQ y 1 registro manual.

---

### User Story 7 — Cargar varios archivos a la vez (Priority: P3)

Como **Maker**, quiero seleccionar varios archivos en una sola carga y ver el resultado por archivo, para procesar rápidamente los documentos del día (RF-12, versión simple).

**Why this priority**: Comodidad; la importación masiva con progreso y reintentos es del spec 007.

**Independent Test**: Seleccionar 5 archivos de prueba de formatos distintos y ver un resumen con el resultado de cada uno.

**Acceptance Scenarios**:

1. **Given** una selección de varios archivos, **When** se cargan, **Then** cada archivo sigue el flujo completo de forma independiente y el resumen muestra cuántos se recibieron, cuántos fueron duplicados, cuántos quedaron con datos dudosos y cuántos fueron a la DLQ.
2. **Given** un archivo que falla, **When** se procesa el lote, **Then** los demás no se ven afectados.

---

### Edge Cases

- **Archivo vacío o mayor que el límite del prototipo**: se rechaza antes de guardarse, con un mensaje claro (no llega a la DLQ porque no hay original que conservar).
- **XML bien formado pero de un tipo de documento que el perfil no reconoce**: DLQ con motivo "tipo de documento no reconocido".
- **XML malformado**: DLQ con motivo "no se pudo leer" y la línea del error si está disponible.
- **Moneda desconocida**: DLQ ("moneda no soportada").
- **Fecha de emisión futura**: se recibe con una advertencia visible; la interpretación decidirá.
- **Identificador fiscal con dígito verificador inválido**: se recibe con el campo marcado como inválido (confianza 0); la interpretación lo enviará al Maker (`SCHEMA_INVALID`).
- **CSV con columnas que no coinciden con el perfil**: el archivo completo va a la DLQ indicando las columnas faltantes.
- **Mismo archivo subido dos veces a la vez** (doble clic): el segundo se registra como duplicado.
- **Imagen cuyo contenido no está en el conjunto de prueba**: el extractor simulado no la reconoce y va a la DLQ ("ilegible"); así se comporta el prototipo sin OCR real.
- **Empresa sin paquete de jurisdicción**: la carga se rechaza indicando que falta configurar el paquete.

## Requirements *(mandatory)*

### Functional Requirements

**Recepción y original (RF-01, RD-01)**

- **FR-001**: El sistema MUST aceptar documentos por tres canales: carga de archivos (uno o varios), formulario de registro manual y catálogo de documentos de ejemplo.
- **FR-002**: Todo archivo recibido MUST guardarse sin modificación, con su nombre, tipo de contenido, tamaño, huella SHA-256, canal, usuario, empresa, fecha y `traceId`, antes de cualquier lectura. Los originales MUST ser de solo agregado: ninguna operación los modifica ni los borra.
- **FR-003**: El sistema MUST rechazar antes de guardar los archivos vacíos o que superen el límite de tamaño del prototipo, informando el motivo.

**Lectura por formato (RF-02, RF-20)**

- **FR-004**: El sistema MUST elegir el lector adecuado según el tipo de contenido, la firma del archivo y su estructura, mediante un registro de lectores extensible: agregar un lector no modifica los existentes ni el resto del flujo.
- **FR-005**: El sistema MUST leer, como mínimo: XML de factura electrónica UBL 2.1 (factura, boleta, nota de crédito y nota de débito), JSON según el contrato de documentos del sistema, CSV según un perfil de columnas, formulario de registro manual, PDF con texto, PDF escaneado e imágenes JPG y PNG.
- **FR-006**: Todo lo específico de un país para leer un formato (códigos de tipo de documento, esquemas de identificador fiscal, códigos de impuesto, nombres de columnas del CSV) MUST provenir de **perfiles de lectura** del Paquete de Jurisdicción, no del lector.
- **FR-007**: Los formatos estructurados MUST leerse de forma determinista con confianza 1.0 por campo.
- **FR-008**: Los documentos no estructurados (PDF, imagen) MUST pasar por un extractor que devuelve el tipo de documento propuesto con su confianza y, por cada campo, el valor, la confianza (0 a 1) y la ubicación en el original, más la lista de campos no encontrados. El extractor MUST NOT inventar valores.
- **FR-009**: En el prototipo, el extractor MUST ser **simulado y determinista**: sus resultados provienen de una tabla precalculada indexada por la huella SHA-256 de los archivos de prueba; un archivo que no está en la tabla se trata como ilegible.
- **FR-010**: El sistema MUST ofrecer interruptores de demo para forzar "baja confianza" e "ilegible" sobre los archivos de prueba.

**Documento canónico (RD-02, RD-15)**

- **FR-011**: Todo lector MUST producir el documento canónico genérico del spec 001 (data-model §4), con importes en unidades mínimas según la moneda, partes con rol y tipo de identificador fiscal, tipo de documento del catálogo de la jurisdicción, y la información de extracción completa.
- **FR-012**: El sistema MUST validar el identificador fiscal de cada parte con la regla del tipo de identificador del paquete (patrón y dígito verificador cuando el paquete lo define); un identificador inválido se conserva con confianza 0 y marcado como inválido.
- **FR-013**: El sistema MUST marcar como "requiere verificación" todo documento con al menos un campo obligatorio del esquema con confianza bajo el umbral de la empresa (por defecto, el del paquete). La decisión de enviarlo al Maker la toma la interpretación (spec 003, motivo `LOW_CONFIDENCE_EXTRACTION`).
- **FR-014**: El sistema MUST registrar como "ajeno a la empresa" y detener el documento en el que la empresa no figura en ninguna parte (salvo los tipos con perspectiva fija interna, donde la empresa es el emisor).

**Deduplicación (RD-04)**

- **FR-015**: Tras producir el canónico, el sistema MUST calcular la huella de idempotencia sobre: empresa, identificador fiscal del emisor, tipo de documento, serie y número normalizados, y fecha de emisión. La normalización MUST ser independiente del país: serie en mayúsculas y sin espacios, y número sin ceros a la izquierda.
- **FR-016**: Un documento con huella existente MUST guardarse como duplicado enlazado al original, registrarse en la bitácora y no avanzar; esto incluye el mismo documento recibido en distintos formatos.

**DLQ básica (RF-06)**

- **FR-017**: Todo documento que no se puede leer (formato no soportado, archivo ilegible, XML malformado, tipo o moneda no reconocidos, CSV sin las columnas del perfil) MUST registrarse en la DLQ con el motivo estructurado (tipo de error, mensaje y detalle), el enlace al original y el `traceId`, sin afectar al resto de documentos. La gestión y el reproceso de la DLQ son del spec 007.

**Bandeja y entrega (US5)**

- **FR-018**: El sistema MUST mostrar una bandeja de documentos recibidos por empresa, con filtros por estado, formato, tipo y fecha, y un detalle que muestre el original junto a los datos canónicos con su confianza.
- **FR-019**: El sistema MUST publicar para cada documento recibido un evento `DocumentReceived` (con la referencia al canónico, el tipo, el formato y los campos dudosos) que consumirá la interpretación (spec 003), y los eventos `RawPayloadStored`, `DocumentDuplicated` y `DocumentParsingFailed` del SDD §11.
- **FR-020**: El registro manual MUST generar el formulario a partir del esquema del tipo de documento y producir el canónico por el mismo registro de lectores.

**Documentos de prueba (§20.9)**

- **FR-021**: El sistema MUST incluir los 16 documentos de prueba ficticios del SDD §20.9 como archivos reales (XML, JSON, CSV, JPG, PNG y PDF) más la definición del registro manual, con su resultado esperado.
- **FR-022**: Todos los datos de prueba MUST ser ficticios (identificadores fiscales, nombres, montos).

**Permisos y auditoría**

- **FR-023**: Solo el Maker MUST poder cargar y registrar documentos; Checker, Auditor y Admin de Plantillas MUST tener solo lectura de la bandeja. Los permisos MUST validarse en los servicios.
- **FR-024**: Toda recepción, duplicado, ajeno y envío a DLQ MUST generar un evento de auditoría con usuario, rol, empresa, fecha, canal y `traceId`.
- **FR-025**: El reset a datos demo MUST vaciar originales, canónicos, índice de huellas y DLQ de la semilla y volver a su estado inicial.

### Key Entities *(include if feature involves data)*

- **Original recibido (`RawPayload`)**: archivo tal cual llegó, con huella, metadatos, canal y referencia a su contenido; solo agregado.
- **Documento canónico (`CanonicalDocument`)**: definido en el spec 001; esta feature lo produce y lo guarda con su revisión 1.
- **Resultado de recepción (`IntakeRecord`)**: enlaza original y canónico, con estado (`RECEIVED`, `RECEIVED_NEEDS_REVIEW`, `DUPLICATE`, `NOT_FOR_TENANT`, `FAILED`), advertencias, campos dudosos y enlace al original duplicado.
- **Perfil de lectura**: datos del paquete que traducen un formato a conceptos del catálogo (UBL, CSV).
- **Entrada de DLQ**: documento no leído, con motivo estructurado, intentos y enlace al original.
- **Índice de huellas**: huella de idempotencia → documento original.
- **Documento de prueba**: archivo ficticio con su formato, tipo esperado y resultado esperado; para imágenes y PDF, también su resultado de extracción precalculado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los 16 documentos de prueba producen exactamente su resultado esperado (100 %) al cargarse en orden sobre la semilla.
- **SC-002**: Al menos 6 formatos de archivo distintos (XML, JSON, CSV, JPG, PNG, PDF) se reciben por el mismo flujo, y agregar un formato nuevo no requiere cambiar los lectores existentes.
- **SC-003**: El 100 % de los intentos duplicados de la prueba, incluido el mismo documento en XML y PDF, se detectan y no avanzan.
- **SC-004**: Para cualquier documento recibido, un usuario puede ver en una sola pantalla el original y cada dato leído con su confianza.
- **SC-005**: Un Maker registra un documento interno de dos líneas desde el formulario en menos de 2 minutos.
- **SC-006**: Ningún original se modifica ni se pierde: tras cualquier secuencia de operaciones, la huella de cada original coincide con la registrada al recibirlo.
- **SC-007**: Ningún lector ni paso del flujo contiene reglas de un país; todo lo específico de Perú está en el paquete (verificable por revisión y por prueba automática).

## Assumptions

- **Sin OCR real**: el prototipo simula la extracción con resultados precalculados por huella de los archivos de prueba (SDD §20.9). Reemplazarlo por un OCR real solo cambia el extractor.
- **Límite de tamaño**: 300 KB por archivo, porque el prototipo guarda en el almacenamiento del navegador. Los archivos de prueba cumplen el límite.
- **Documentos de prueba**: se entregan como archivos generados a partir de una única fuente de datos ficticios, con un script que los regenera (requiere un navegador Chromium para renderizar imágenes y PDF).
- **Contrato JSON**: el sistema publica su propio contrato de documento JSON (versión 1), independiente del país; los lectores de formatos JSON de terceros se agregan como lectores nuevos.
- **Perfil CSV**: la semilla incluye un perfil para "boletas de venta del día" de la empresa `01`; la edición de perfiles CSV desde la UI queda fuera de alcance.
- **Umbral de confianza**: el del paquete (0.85) por defecto; su ajuste por empresa es un dato de la empresa sin UI propia en este spec.
- **Interpretación**: el paso siguiente (spec 003) consume el evento `DocumentReceived`. Esta feature no crea asientos ni usa plantillas.
- **Reproceso de la DLQ, importación masiva con progreso, circuit breaker y alertas de SLA**: spec 007.
- **Roles de demo**: Maker `contador_maria`; Checker `revisor_luis`; Auditor `auditora_ana`; Admin `admin_pedro` (sin permiso de carga).
