# Especificación: Ingestión de Comprobantes y Bandeja de Asientos Borrador

**Carpeta de la feature**: `specs/001-ingestion-comprobantes`
**Creado**: 2026-09-21
**Estado**: Borrador
**Documento base**: `specs/SDD-ACL-Translation-Engine.md` (en adelante, "el SDD")
**Principios aplicables**: Constitución v1.0.0 (`docs/constitution.md`)

**Solicitud original**: "Redactar la especificación de la primera funcionalidad (módulo de
ingestión) del sistema contable, basada en el SDD y la constitución."

---

## 1. Contexto y objetivo

### Contexto

Hoy, en el prototipo, las facturas de compra y venta se escriben a mano en un formulario y el
asiento contable queda registrado al instante, sin revisión. El SDD describe otro modelo: los
comprobantes llegan de fuentes externas, se guardan como evidencia que nadie puede alterar, se
detectan los duplicados, se traducen a un asiento contable en **borrador** y solo pasan a
revisión cuando cuadran y tienen todos sus datos.

Esta es la primera de varias funcionalidades que implementan el SDD. Cubre **desde la llegada del
comprobante hasta el asiento borrador validado**. La aprobación Maker-Checker, la firma, el
registro en el Libro Diario, la reversión y el re-procesamiento de fallidos se especificarán
después. Esta funcionalidad **sí incluye** la creación, prueba, versionado y activación por empresa
de las plantillas contables con reglas (el "motor de plantillas" del SDD), porque son las que
deciden las cuentas de cada asiento.

### Objetivo

Que un analista contable pueda cargar lotes de facturas electrónicas y obtener, sin tipear nada,
asientos borrador correctos. Solo tendrá que intervenir en las excepciones: datos faltantes,
periodo cerrado o montos inconsistentes. Toda la cadena debe quedar trazable desde el archivo
original.

### Por qué importa

- Elimina la digitación manual y sus errores.
- Garantiza que ningún comprobante se procese dos veces.
- Conserva la evidencia original para auditoría y fiscalización.
- Prepara los asientos para el doble control (Maker-Checker) de la siguiente funcionalidad.

## Clarifications

### Session 2026-09-21

- Q: ¿Cuál es el límite de un lote (cantidad de comprobantes y tamaño máximo por archivo)? → A:
  50 comprobantes por lote y 1 MB por archivo.
- Q: ¿Qué tasa se usa para convertir USD a soles? → A: La tasa venta publicada por SUNAT para la
  fecha de emisión, tanto en compras como en ventas.
- Q: ¿Desde cuántas horas un documento en la bandeja debe destacarse como atrasado? → A: 48
  horas; solo se destaca visualmente, sin alertas ni escalamiento.
- Q: Al validar el asiento con el catálogo de la empresa, ¿qué reglas de cuenta se aplican y de
  dónde sale el centro de costo por defecto? → A: Las mismas reglas del motor contable actual:
  toda cuenta debe existir en el catálogo de la empresa y ser de uso (U); se exige centro de
  costo si la plantilla **o** la cuenta lo requieren. El centro de costo por defecto sale primero
  de la plantilla y, si no tiene, del centro de costo asociado a la cuenta en el catálogo. Los
  amarres salen del catálogo de la empresa.
- Q: ¿Se persiste también el catálogo de cuentas por empresa, que hoy vive solo en memoria? →
  A: Sí. El catálogo de cada empresa y sus periodos se conservan al recargar el navegador, con
  la misma semilla y el mismo reinicio de datos de demostración que la ingestión.
- Q: ¿Qué facturas acepta la ingestión según su fecha de emisión y los periodos de la empresa?
  → A: Las de cualquier periodo **ABIERTO** de la empresa. Si el mes está CERRADO o no figura
  entre los periodos de la empresa, el asiento va a la bandeja con el motivo "periodo cerrado o
  no abierto". Si el usuario entró a trabajar en un periodo CERRADO, la carga y las acciones de
  la bandeja quedan en solo lectura.
- Q: ¿Cómo obtiene la ingestión el usuario y el rol? → A: De la sesión del login existente; no
  hay selector propio. Se agregan al login de demostración un usuario **Checker** y un usuario
  **Auditor**, con acceso rápido. El rol **Admin** tiene en la ingestión los mismos permisos que
  el Auditor (solo lectura). Para cambiar de rol se cierra sesión y se entra con otro usuario.
- Q: ¿Qué plantillas puede elegir el Maker al cargar un lote? → A: Las plantillas globales del
  sistema, filtradas por las **plantillas activas de la empresa** según su categoría: compras de
  mercadería, servicios y gastos, y ventas. Si la empresa no tiene ninguna activa, se muestran
  todas con un aviso. *(Reemplazada el 2026-09-22 por la activación explícita por empresa; ver
  abajo.)*

### Session 2026-09-22

- Q: ¿Se incluye la creación de plantillas en esta funcionalidad? → A: Sí, con el editor completo
  de reglas del SDD (reglas condicionales guardadas como árbol de reglas, versionadas y probadas).
- Q: ¿Quién crea las plantillas y dónde viven? → A: El rol **Admin** del estudio actúa como
  administrador de plantillas: crea plantillas y nuevas versiones en el **banco global**, y las
  **activa o desactiva por empresa**. El Maker solo elige entre las activas de su empresa. El Admin
  sigue sin poder operar la bandeja.
- Q: ¿Cómo se elige la plantilla al subir comprobantes? → A: El Maker elige **una plantilla por
  lote**; dentro de ella, las reglas deciden por comprobante y por línea las cuentas, el centro de
  costo y las etiquetas. Si ninguna regla aplica, se usan los valores por defecto de la plantilla.
- Q: ¿Qué pueden evaluar y decidir las reglas? → A: Condiciones sobre los datos del comprobante y
  de cada línea, combinables con Y/O/NO. Acciones sobre **cualquier cuenta del asiento** (base,
  IGV, contrapartida), el centro de costo, las etiquetas y el **prorrateo** de la base entre varias
  cuentas o centros de costo por porcentaje.
- Q: ¿Cómo se publica una plantilla o versión? → A: Se edita como **borrador**, se le definen
  **casos de prueba** (comprobante de ejemplo y asiento esperado) y solo se puede **activar** si
  todos pasan y cada regla queda cubierta por al menos un caso. Una versión activa o usada no se
  edita: editarla crea una versión nueva en borrador. Solo hay una versión activa por plantilla.
- Q: ¿Contra qué catálogo se validan las cuentas de una plantilla? → A: Al crear y probar, contra
  el **PCGE semilla**. Al activarla para una empresa, contra el **catálogo de esa empresa**: se
  muestran las cuentas faltantes o no imputables y se permite activar con advertencia; al procesar
  se aplican los motivos de bandeja de siempre.
- Q: Al recalcular un asiento desde la bandeja, ¿qué versión de la plantilla se usa? → A: La
  **versión activa vigente** en ese momento, y queda registrada en el asiento y en la auditoría.
  Los asientos que no se recalculan conservan su versión original.
- Q: ¿Cómo se redondea un prorrateo? → A: Por porcentajes que suman exactamente 100 %; cada parte
  se redondea hacia abajo al céntimo y el residuo se suma a la última parte, de modo que la suma
  siempre es igual al monto prorrateado.

## 2. Usuarios

| Rol | Qué hace en esta funcionalidad |
|---|---|
| **Analista Contable (Maker)** | Sube comprobantes, elige la plantilla contable, trabaja la bandeja de excepciones y cancela documentos. |
| **Auditor** | Solo lectura de todo, incluido el historial completo de cada documento. |
| **Aprobador (Checker)** | Solo ve la lista "Pendientes de aprobación". No puede actuar sobre ella en esta funcionalidad. |
| **Administrador del estudio (Admin)** | Actúa como administrador de plantillas: crea, prueba, versiona y activa plantillas en el banco global y las activa o desactiva por empresa. En la carga y la bandeja, solo lectura, igual que el Auditor. |
| **Operador de Soporte** | Sin acceso a esta funcionalidad por ahora. |

La identidad viene del **login simulado existente**: el usuario inicia sesión con un usuario de
demostración que tiene un rol, y luego entra a una empresa y a un periodo. La ingestión usa ese
usuario, ese rol, esa empresa y ese periodo. Para cambiar de rol se cierra sesión y se entra con
otro usuario.

## 3. Historias de usuario

### HU-01 — Cargar un lote de facturas (Prioridad: P1)

Como **Analista Contable**, quiero subir varios archivos de factura electrónica (o elegir
comprobantes de ejemplo) y la plantilla contable a aplicar, para que el sistema genere los
asientos borrador sin digitarlos.

**Por qué P1**: es la entrada de todo el flujo; sin ella no hay nada que procesar.

**Prueba independiente**: subir 3 facturas válidas de compra en soles de setiembre 2026 con una
plantilla de compra y ver 3 asientos borrador cuadrados en "Pendientes de aprobación".

**Escenarios de aceptación**:

1. **Dado** que soy Maker de la empresa activa y el periodo de setiembre 2026 está abierto,
   **cuando** subo 3 facturas de compra válidas con la plantilla "Compra de Mercaderías",
   **entonces** veo un resumen del lote con 3 recibidos y 3 pendientes de aprobación, y cada
   asiento debita gasto e IGV y acredita la cuenta por pagar por el total.
2. **Dado** un lote con 1 factura válida, 1 archivo ilegible y 1 duplicado, **cuando** lo subo,
   **entonces** el resumen muestra 1 pendiente de aprobación, 1 fallido con su motivo y
   1 duplicado enlazado al original, y ningún archivo bloquea a los demás.
3. **Dado** que no he elegido plantilla, **cuando** intento procesar el lote, **entonces** el
   sistema no lo procesa y me pide elegir una.

### HU-02 — Evitar duplicados (Prioridad: P1)

Como **Analista Contable**, quiero que el sistema reconozca un comprobante ya recibido, para
no contabilizarlo dos veces.

**Prueba independiente**: subir la misma factura dos veces y comprobar que solo existe un asiento.

**Escenarios de aceptación**:

1. **Dado** una factura ya recibida, **cuando** vuelvo a subirla, **entonces** se guarda como
   evidencia marcada "duplicado", enlazada al original, y no se genera asiento.
2. **Dado** una factura ya recibida por S/ 1,180.00, **cuando** llega otra con el mismo emisor,
   tipo, número y fecha pero por S/ 1,500.00, **entonces** se marca "duplicado con diferencias"
   con una alerta visible.

### HU-03 — Trabajar la bandeja de excepciones (Prioridad: P1)

Como **Analista Contable**, quiero ver los asientos que no pudieron completarse solos, con el
motivo de cada uno, y completarlos individualmente o en lote, para que avancen a aprobación.

**Prueba independiente**: subir 5 facturas con una plantilla que exige centro de costo, asignar
el centro de costo a las 5 en lote y verlas pasar a "Pendientes de aprobación".

**Escenarios de aceptación**:

1. **Dado** 5 asientos en la bandeja por "falta centro de costo", **cuando** los selecciono,
   asigno "CC-LOGISTICA" y confirmo, **entonces** los 5 se recalculan, se validan y pasan a
   "Pendientes de aprobación".
2. **Dado** un asiento en la bandeja por "plantilla no corresponde", **cuando** cambio la
   plantilla por una compatible, **entonces** el asiento se regenera con las cuentas de la nueva
   plantilla y se vuelve a validar.
3. **Dado** un asiento en la bandeja por "periodo cerrado", **cuando** lo abro, **entonces**
   solo puedo cancelarlo o dejarlo en espera. No puedo cambiar sus montos ni su fecha.

### HU-04 — Cancelar un documento (Prioridad: P2)

Como **Analista Contable**, quiero cancelar un documento de la bandeja que ya no corresponde
(por ejemplo, el proveedor lo anuló), con una justificación, para mantener limpia la bandeja.

**Prueba independiente**: cancelar un documento con justificación y verificar que queda como
cancelado, sin posibilidad de reactivarlo, y con la justificación en su historial.

**Escenarios de aceptación**:

1. **Dado** un documento en la bandeja, **cuando** lo cancelo escribiendo una justificación,
   **entonces** pasa a "Cancelado" y la justificación queda en su historial.
2. **Dado** que intento cancelar sin justificación, **entonces** el sistema no lo permite.

### HU-05 — Facturas en dólares (Prioridad: P2)

Como **Analista Contable**, quiero que las facturas en USD se conviertan a soles con el tipo de
cambio de su fecha de emisión, y que se me avise cuando la tasa sea provisional.

**Prueba independiente**: subir una factura en USD con el servicio de tipo de cambio disponible y
otra con el servicio simulado como caído, y comparar ambos asientos.

**Escenarios de aceptación**:

1. **Dado** una factura de USD 1,000.00 del 15/09/2026 y una tasa de 3.750 para esa fecha,
   **cuando** se procesa, **entonces** el asiento muestra S/ 3,750.00 en moneda funcional, la
   moneda original y la tasa usada.
2. **Dado** que el servicio de tipo de cambio está caído, **cuando** se procesa una factura en
   USD, **entonces** se usa la tasa más reciente anterior a la fecha de emisión y el asiento
   queda marcado "tasa provisional" con una alerta visible.

### HU-06 — Ver la trazabilidad de un documento (Prioridad: P2)

Como **Auditor**, quiero ver en una sola vista todo lo que pasó con un documento: el archivo
original, los datos interpretados, la plantilla y versión usadas, el asiento generado y cada
acción de los usuarios con fecha y autor.

**Prueba independiente**: abrir el historial de un documento que pasó por la bandeja y ver
todos sus pasos en orden.

**Escenarios de aceptación**:

1. **Dado** un documento que el Maker completó desde la bandeja, **cuando** abro su historial,
   **entonces** veo, en orden cronológico: recepción, interpretación, generación del borrador,
   envío a bandeja con motivo, la acción del Maker (quién y cuándo) y el paso a pendiente de
   aprobación, todos con el mismo código de seguimiento.
2. **Dado** que soy Auditor, **cuando** intento subir, editar o cancelar, **entonces** el
   sistema no lo permite.

### HU-07 — Consultar pendientes de aprobación (Prioridad: P3)

Como **Aprobador**, quiero ver qué asientos están listos para mi revisión, para anticipar la
carga de trabajo, aunque en esta versión todavía no puedo aprobarlos.

**Escenarios de aceptación**:

1. **Dado** asientos en "Pendientes de aprobación", **cuando** entro como Checker, **entonces**
   los veo en solo lectura, con los marcados "tasa provisional" claramente identificados.

### HU-08 — Crear y probar una plantilla con reglas (Prioridad: P2)

Como **Admin**, quiero crear una plantilla con reglas visuales, sin programar (por ejemplo, "si
la descripción contiene FLETE, la cuenta base es 6311101 con CC-LOGISTICA"), y probarla con
comprobantes de ejemplo antes de activarla, para que los asientos se clasifiquen solos y sin
errores.

**Por qué P2**: las plantillas semilla ya permiten operar; crear plantillas propias multiplica el
valor de la ingestión, pero depende de que el flujo de carga exista.

**Prueba independiente**: crear una plantilla con dos reglas y un prorrateo, agregar un caso de
prueba por regla, probarla (todo en verde) y activarla; luego cargar un comprobante con ella.

**Escenarios de aceptación**:

1. **Dado** que soy Admin en el banco global de plantillas, **cuando** creo una plantilla de
   compra con cuentas por defecto y la regla "si la descripción contiene FLETE → cuenta base
   6311101, CC-LOGISTICA", **entonces** queda como versión 1 en **borrador**.
2. **Dado** un borrador con una regla sin ningún caso de prueba que la cubra, **cuando** intento
   activarlo, **entonces** el sistema no lo permite e indica qué regla falta cubrir.
3. **Dado** un borrador con casos de prueba, **cuando** pulso "Probar", **entonces** veo por cada
   caso el asiento generado, si cuadra y si coincide con el esperado.
4. **Dado** que todos los casos pasan y cada regla está cubierta, **cuando** activo la versión,
   **entonces** queda **activa** y disponible para activarse en las empresas.
5. **Dado** una regla de prorrateo 60 % CC-ADMIN y 40 % CC-LOGISTICA sobre una base de S/ 100.01,
   **cuando** se prueba, **entonces** las partes son S/ 60.00 y S/ 40.01 y el asiento cuadra.

### HU-09 — Versionar una plantilla sin afectar lo ya registrado (Prioridad: P2)

Como **Admin**, quiero cambiar una plantilla que ya está en uso sin alterar los asientos que se
generaron con ella, para mejorar las reglas con seguridad.

**Prueba independiente**: editar PL-02 (activa y usada) → se crea la versión 2 en borrador;
activarla → los asientos anteriores siguen mostrando la versión 1 y los nuevos usan la 2.

**Escenarios de aceptación**:

1. **Dado** una versión activa, **cuando** pulso "Editar", **entonces** se crea una nueva versión
   en borrador con el mismo contenido y la versión activa no cambia.
2. **Dado** que activo la versión 2, **entonces** la versión 1 pasa a **retirada**, los asientos
   existentes conservan "versión 1" y el historial muestra quién activó, cuándo y las diferencias.
3. **Dado** un asiento en la bandeja generado con la versión 1, **cuando** el Maker lo recalcula,
   **entonces** se usa la versión 2 y queda registrado el cambio de versión.

### HU-10 — Activar plantillas por empresa (Prioridad: P2)

Como **Admin**, quiero elegir qué plantillas del banco global puede usar cada empresa, viendo si
sus cuentas existen en el catálogo de esa empresa, para que el Maker solo vea las que aplican.

**Prueba independiente**: en una empresa, activar una plantilla cuya cuenta no existe en su
catálogo → advertencia visible; el Maker la ve en la carga y el comprobante cae en la bandeja por
"cuenta inexistente".

**Escenarios de aceptación**:

1. **Dado** que soy Admin dentro de una empresa, **cuando** abro sus plantillas, **entonces** veo
   las plantillas con versión activa del banco global, cuáles están activadas para la empresa y
   las advertencias de cuentas de cada una.
2. **Dado** que activo o desactivo una plantilla para la empresa, **entonces** el cambio se
   refleja en el selector de plantillas del Maker de esa empresa y en ninguna otra.
3. **Dado** que desactivo una plantilla, **cuando** el Maker recalcula un asiento de la bandeja que
   la usa, **entonces** el asiento queda con el motivo "plantilla no activa" y puede cambiar de
   plantilla o cancelarse.

---

## 4. Requisitos funcionales

Notación EARS en español:
- *Ubicuo*: "El sistema deberá…"
- *Por evento*: "Cuando…, el sistema deberá…"
- *Por estado*: "Mientras…, el sistema deberá…"
- *No deseado*: "Si…, entonces el sistema deberá…"
- *Opcional*: "Donde…, el sistema deberá…"

### RF-01 — Carga de comprobantes

El sistema deberá permitir al Maker cargar uno o varios comprobantes en un mismo lote, ya sea
subiendo archivos o eligiendo comprobantes de un catálogo de ejemplos que simula llegadas desde
un sistema externo.

- **CA-01.1** El sistema deberá aceptar archivos de factura electrónica peruana en formato XML
  UBL y archivos de datos estructurados en formato JSON con los mismos datos.
- **CA-01.2** Cuando el Maker inicie una carga, el sistema deberá exigir que elija una plantilla
  contable antes de procesar el lote. La plantilla elegida se aplica a todos los comprobantes
  del lote.
- **CA-01.2b** El sistema deberá ofrecer solo las plantillas que tengan una versión activa en el
  banco global **y** estén activadas para la empresa (RF-23), mostrando su nombre, tipo de
  operación y versión. Donde la empresa no tenga ninguna plantilla activada, deberá mostrar el
  aviso "Esta empresa no tiene plantillas activas; solicítelas al administrador" y no permitirá
  procesar.
- **CA-01.2c** Si se intenta procesar un lote con una plantilla que no está activada para la
  empresa o no tiene versión activa, entonces el sistema deberá rechazar el lote sin procesar
  ningún comprobante.
- **CA-01.3** Cuando el Maker elija comprobantes del catálogo de ejemplos, el sistema deberá
  procesarlos exactamente igual que un archivo subido.
- **CA-01.4** Cuando termine de procesar un lote, el sistema deberá mostrar un resumen con la
  cantidad de recibidos, duplicados, fallidos, rechazados, enviados a bandeja y pendientes de
  aprobación.
- **CA-01.5** Si un lote tiene más de 50 comprobantes, entonces el sistema deberá rechazar la
  carga completa sin procesar ninguno e indicar el límite.
- **CA-01.6** Si un archivo pesa más de 1 MB, entonces el sistema deberá marcarlo "fallido" con
  el motivo "archivo excede 1 MB", conservar su registro y seguir procesando los demás.

### RF-02 — Resguardo de la evidencia original (RD-01)

- **CA-02.1** Cuando se reciba un comprobante, el sistema deberá guardar el contenido original
  completo, sin cambios, antes de cualquier otro paso, y asignarle un código de seguimiento
  único.
- **CA-02.2** El sistema deberá guardar la evidencia de todo comprobante recibido, incluidos
  los duplicados, los fallidos y los rechazados.
- **CA-02.3** Si cualquier usuario o proceso intenta modificar o eliminar una evidencia
  guardada, entonces el sistema deberá impedirlo.
- **CA-02.4** Donde se consulte un asiento o documento, el sistema deberá permitir ver el
  contenido original tal como llegó.

### RF-03 — Detección de duplicados (RD-04)

- **CA-03.1** El sistema deberá identificar un comprobante por la combinación de empresa, RUC
  del emisor, tipo de documento, serie-número y fecha de emisión.
- **CA-03.2** Cuando llegue un comprobante con una identificación ya existente en la misma
  empresa, el sistema deberá marcarlo "duplicado", enlazarlo al original y no generar asiento.
  Esto aplica aunque el original haya sido cancelado o fallido.
- **CA-03.3** Si el duplicado tiene un total distinto del original, entonces el sistema deberá
  marcarlo "duplicado con diferencias" y mostrar una alerta.
- **CA-03.4** Cuando se detecte un duplicado, el sistema deberá registrarlo en el historial de
  auditoría con su código de seguimiento.
- **CA-03.5** Cuando un mismo lote contenga dos comprobantes con la misma identificación, el
  sistema deberá procesar el primero y marcar el segundo como duplicado.

### RF-04 — Interpretación del comprobante

- **CA-04.1** Cuando se reciba un comprobante no duplicado, el sistema deberá extraer sus datos
  a un formato estándar único, independiente del formato de origen, con: RUC y razón social del
  emisor y del receptor, tipo de documento, serie-número, fecha de emisión, moneda, líneas con
  descripción y valor, base imponible, IGV y total.
- **CA-04.2** El sistema deberá exigir como obligatorios: RUC del emisor, RUC del receptor,
  tipo, serie-número, fecha de emisión, moneda, al menos una línea y total.
- **CA-04.3** El sistema deberá tomar los montos tal como vienen en el comprobante, sin
  recalcularlos.
- **CA-04.4** El sistema deberá aceptar líneas exoneradas o inafectas (sin IGV).

### RF-05 — Comprobantes que no se pueden leer

- **CA-05.1** Si un comprobante no se puede interpretar (formato dañado, dato obligatorio
  faltante o inválido, tipo de documento no soportado o moneda distinta de PEN o USD), entonces
  el sistema deberá marcarlo "fallido" con un motivo legible que indique qué dato falló.
- **CA-05.2** El sistema deberá mostrar los comprobantes fallidos en una lista propia, con fecha,
  nombre del archivo, motivo y acceso al contenido original.
- **CA-05.3** Si un comprobante del lote falla, entonces el sistema deberá seguir procesando los
  demás.

### RF-06 — Pertenencia a la empresa y tipo de operación

- **CA-06.1** Cuando el RUC del receptor sea el de la empresa activa, el sistema deberá tratar
  el comprobante como **compra**.
- **CA-06.2** Cuando el RUC del emisor sea el de la empresa activa, el sistema deberá tratarlo
  como **venta**.
- **CA-06.3** Si ni el emisor ni el receptor tienen el RUC de la empresa activa, entonces el
  sistema deberá marcarlo "rechazado: no pertenece a la empresa", conservar la evidencia y no
  generar asiento.

### RF-07 — Conversión de moneda (RD-09)

- **CA-07.1** Cuando el comprobante esté en USD, el sistema deberá convertir cada línea a soles
  con la tasa **venta** publicada por SUNAT para la fecha de emisión, tanto en compras como en
  ventas.
- **CA-07.2** El sistema deberá redondear cada línea a 2 decimales una sola vez, al final de su
  cálculo, nunca de forma acumulada.
- **CA-07.3** Si el servicio de tipo de cambio no está disponible o no tiene tasa para esa fecha,
  entonces el sistema deberá usar la tasa más reciente anterior a la fecha de emisión y marcar
  el asiento como "tasa provisional".
- **CA-07.4** Si no existe ninguna tasa anterior a la fecha de emisión, entonces el sistema
  deberá enviar el asiento a la bandeja con el motivo "sin tipo de cambio".
- **CA-07.5** El sistema deberá mostrar en el asiento la moneda original, el monto original, la
  tasa usada y si es provisional.

### RF-08 — Generación del asiento borrador

- **CA-08.1** Cuando un comprobante se interprete correctamente, el sistema deberá generar un
  asiento en estado "Borrador" usando la **versión activa** de la plantilla elegida, cuyas
  reglas (RF-20) determinan las cuentas; donde ninguna regla aplique, se usan las cuentas por
  defecto de la plantilla, con esta estructura:
  - **Compra**: Debe gasto/costo (base imponible) + Debe IGV crédito fiscal / Haber cuenta por
    pagar (total).
  - **Venta**: Debe cuenta por cobrar (total) / Haber ingreso (base imponible) + Haber IGV
    débito fiscal.
- **CA-08.2** Donde la cuenta base tenga cuentas de destino (amarres Debe y Haber) definidas en
  el **catálogo de cuentas de la empresa activa**, el sistema deberá agregar esas líneas, igual
  que el registro manual actual de compras.
- **CA-08.3** El sistema deberá registrar en el asiento la plantilla y la versión exacta usadas
  (RD-10), el documento de origen y el código de seguimiento.
- **CA-08.4** El sistema deberá asignar a las líneas de gasto y de destino el centro de costo en
  este orden de prioridad: el que fije la regla que aplicó; el centro de costo por defecto de la
  plantilla; el centro de costo asociado a la cuenta base en el catálogo de la empresa. Si ninguno
  existe, deberá dejarlo vacío.
- **CA-08.5** El sistema deberá leer las cuentas, sus amarres y sus atributos (uso, exigencia de
  centro de costo) exclusivamente del catálogo de cuentas de la empresa activa, en el momento de
  generar o recalcular el asiento.

### RF-09 — Validación del borrador (RD-03, RD-12)

Cuando se genere o recalcule un borrador, el sistema deberá validarlo completo. Si cumple todo,
lo pasa a "Pendiente de aprobación". Si falla alguna validación, lo envía a la bandeja con
**todos** los motivos detectados:

| Motivo | Condición | Acciones del Maker |
|---|---|---|
| Descuadre | Σ Debe ≠ Σ Haber en soles | Cambiar plantilla, cancelar |
| Montos inconsistentes | Base + IGV ≠ total, o IGV ≠ 18% de la base gravada, con diferencia mayor a S/ 0.01 | Solo cancelar |
| Periodo cerrado | La fecha de emisión cae en un periodo cerrado o todavía no abierto | Revalidar, cancelar |
| Plantilla no corresponde | Plantilla de venta en una compra o viceversa | Cambiar plantilla, cancelar |
| Falta centro de costo | La plantilla o la cuenta de la línea exigen centro de costo y la línea no tiene | Completar, cancelar |
| Cuenta inexistente | Una cuenta del asiento no existe en el catálogo de cuentas de la empresa | Cambiar plantilla, cancelar |
| Cuenta no imputable | Una cuenta del asiento existe pero no es de uso (U), es decir, es una cuenta padre o sintética | Cambiar plantilla, cancelar |
| Plantilla no activa | Al recalcular, la plantilla ya no tiene versión activa o fue desactivada para la empresa | Cambiar plantilla, cancelar |
| Sin tipo de cambio | Ver CA-07.4 | Revalidar, cancelar |

- **CA-09.1** El sistema deberá evaluar el cuadre en soles, tras la conversión de moneda.
- **CA-09.2** El sistema deberá aceptar diferencias de redondeo de hasta S/ 0.01 entre base,
  IGV y total del comprobante.
- **CA-09.3** Si un asiento no cuadra, entonces el sistema deberá impedir que pase a "Pendiente
  de aprobación", sin excepción.
- **CA-09.4** El sistema deberá determinar si el mes de la fecha de emisión está abierto
  consultando los **periodos registrados de la empresa activa**. Un mes con estado CERRADO, o
  que no figure entre los periodos de la empresa, se considera "cerrado o no abierto". Los
  periodos se abren y cierran en el módulo de empresas; aquí solo se consultan.
- **CA-09.5** Mientras el periodo en el que el usuario entró a trabajar esté CERRADO, el sistema
  deberá mostrar la carga de comprobantes y las acciones de la bandeja en solo lectura, con un
  aviso visible, y deberá rechazar esas acciones aunque se intenten por otra vía.

### RF-10 — Bandeja de excepciones (staging)

- **CA-10.1** El sistema deberá listar los asientos en bandeja de la empresa activa con: código
  de seguimiento, tipo de operación, emisor o receptor, serie-número, fecha, total, moneda,
  motivos y antigüedad en la bandeja.
- **CA-10.4** Mientras un asiento lleve más de 48 horas en la bandeja, el sistema deberá
  destacarlo visualmente como "atrasado" y permitir filtrar por esa condición.
- **CA-10.2** El sistema deberá permitir filtrar por motivo, tipo de operación, rango de fechas
  y moneda.
- **CA-10.3** El sistema deberá mostrar el detalle de cada asiento con sus líneas, los datos
  interpretados y el contenido original.

### RF-11 — Completar y recalcular

- **CA-11.1** Mientras un asiento esté en la bandeja, el sistema deberá permitir al Maker
  completar el centro de costo y las etiquetas analíticas, y cambiar la plantilla.
- **CA-11.2** El sistema deberá permitir aplicar la misma acción a varios asientos
  seleccionados a la vez.
- **CA-11.3** Cuando el Maker guarde cambios o revalide, el sistema deberá regenerar el asiento
  con la **versión activa vigente** de la plantilla, registrar en el asiento y en la auditoría la
  versión usada (y el cambio de versión, si lo hubo) y volver a validarlo (RF-09).
- **CA-11.4** El sistema no deberá permitir al Maker editar montos, cuentas línea por línea,
  fecha ni datos del comprobante.
- **CA-11.5** En una acción en lote, el sistema deberá informar el resultado de cada asiento por
  separado: avanzó, sigue en bandeja (con motivo) o hubo conflicto.
- **CA-11.6** Si un asiento fue modificado por otra acción desde que el Maker lo abrió,
  entonces el sistema deberá rechazar el cambio como "conflicto" y pedir que lo actualice.
- **CA-11.7** Cuando el Maker elija "revalidar", el sistema deberá repetir la validación sin
  cambiar datos, por ejemplo tras la reapertura de un periodo o la recuperación del tipo de
  cambio.

### RF-12 — Cancelación

- **CA-12.1** Mientras un asiento esté en la bandeja, el sistema deberá permitir al Maker
  cancelarlo con una justificación obligatoria de al menos 10 caracteres.
- **CA-12.2** El sistema deberá tratar "Cancelado" como estado final. Si se intenta reactivar o
  modificar un asiento cancelado, entonces el sistema deberá impedirlo.
- **CA-12.3** El sistema no deberá permitir cancelar asientos en "Pendiente de aprobación" (el
  rechazo le corresponde al Checker en la siguiente funcionalidad).

### RF-13 — Pendientes de aprobación

- **CA-13.1** El sistema deberá listar en solo lectura los asientos en "Pendiente de
  aprobación" de la empresa activa, visibles para Maker, Checker, Auditor y Admin.
- **CA-13.2** Donde un asiento tenga tasa provisional, el sistema deberá mostrarlo marcado como
  "requiere revisión humana".
- **CA-13.3** El sistema no deberá enviar ningún asiento de esta funcionalidad al Libro Diario
  ni a los reportes contables.

### RF-14 — Estados y transiciones

- **CA-14.1** El sistema deberá gestionar los siguientes estados:
  - **Del comprobante**: Recibido, Duplicado, Fallido, Rechazado (no pertenece).
  - **Del asiento**: Borrador (`DRAFT`), En bandeja (`PENDING_INPUT`), Pendiente de aprobación
    (`PENDING_APPROVAL`), Cancelado (`CANCELLED`).
- **CA-14.2** El sistema solo deberá permitir estas transiciones:
  - Borrador → En bandeja
  - Borrador → Pendiente de aprobación
  - En bandeja → Borrador (al recalcular)
  - En bandeja → Cancelado
- **CA-14.3** Si se intenta cualquier otra transición, entonces el sistema deberá rechazarla y
  registrar el intento.

### RF-15 — Permisos por rol (RD-05, constitución IV)

- **CA-15.1** El sistema deberá permitir cargar comprobantes, trabajar la bandeja y cancelar
  solo al rol Maker.
- **CA-15.2** El sistema deberá dar al Auditor y al Admin acceso de solo lectura a todas las
  listas, detalles e historiales de la carga, la bandeja y los pendientes de aprobación.
- **CA-15.2b** El sistema deberá permitir crear, editar borradores, probar, activar y retirar
  versiones de plantillas, y activarlas o desactivarlas por empresa, **solo** al rol Admin. El
  Auditor podrá ver plantillas, versiones, pruebas e historial en solo lectura; el Maker solo verá
  las plantillas activadas para su empresa.
- **CA-15.3** El sistema deberá dar al Checker acceso de solo lectura a "Pendientes de
  aprobación".
- **CA-15.4** Si un rol intenta una acción no permitida, entonces el sistema deberá rechazarla
  aunque la pantalla no muestre el botón, y registrar el intento.
- **CA-15.5** El sistema deberá tomar el usuario y el rol de la sesión iniciada en el login.
- **CA-15.6** El login de demostración deberá ofrecer, como mínimo, un usuario con cada uno de
  los roles Maker, Checker, Auditor y Admin, con acceso rápido.

### RF-16 — Aislamiento por empresa (RD-08)

- **CA-16.1** El sistema deberá mostrar y procesar solo los comprobantes, asientos, plantillas
  activas, catálogo de cuentas y periodos de la empresa activa.
- **CA-16.2** Cuando el usuario cambie de empresa, el sistema deberá mostrar únicamente los
  datos de la nueva empresa.
- **CA-16.3** El sistema deberá evaluar la detección de duplicados por separado en cada empresa.

### RF-17 — Trazabilidad y auditoría

- **CA-17.1** El sistema deberá registrar cada evento (recepción, duplicado, fallo, rechazo,
  borrador generado, envío a bandeja, cambio del Maker, recálculo, cancelación, paso a
  pendiente, acción denegada) con: fecha y hora, usuario, rol, empresa, acción, detalle y código
  de seguimiento.
- **CA-17.2** El sistema deberá mostrar el historial completo de un documento en una sola vista
  ordenada cronológicamente (HU-06).
- **CA-17.3** El sistema no deberá permitir modificar ni borrar el historial de auditoría.

### RF-18 — Persistencia y datos de demostración

- **CA-18.1** El sistema deberá conservar toda la información de esta funcionalidad al recargar
  el navegador.
- **CA-18.1b** El sistema deberá conservar al recargar el catálogo de cuentas de cada empresa,
  incluidas las cuentas creadas, editadas, eliminadas, importadas o clonadas por el usuario, y
  los periodos de cada empresa con su estado.
- **CA-18.2** El sistema deberá ofrecer una acción para reiniciar los datos de demostración, que
  restaure el catálogo de ejemplos, las tasas de cambio, los periodos de cada empresa, los
  catálogos de cuentas de cada empresa (PCGE semilla) y las plantillas iniciales.
- **CA-18.3** El sistema deberá ofrecer un interruptor visible para simular la caída del
  servicio de tipo de cambio.
- **CA-18.4** El catálogo de ejemplos deberá incluir, como mínimo, un comprobante de cada caso:
  compra válida en PEN, venta válida en PEN, compra en USD, duplicado, duplicado con
  diferencias, archivo dañado, dato obligatorio faltante, otra empresa, periodo cerrado y montos
  inconsistentes.

### RF-19 — Editor visual de plantillas y reglas (SDD RF-03, HU-01)

- **CA-19.1** El sistema deberá permitir al Admin crear una plantilla con: nombre, código único,
  tipo de operación (compra o venta), cuentas por defecto (base, IGV y contrapartida), si aplica
  IGV, si exige centro de costo y centro de costo por defecto.
- **CA-19.2** El sistema deberá permitir definir **reglas de comprobante** (se evalúan una vez
  por comprobante) y **reglas de línea** (se evalúan por cada línea), cada una con nombre,
  prioridad, condición y acciones, mediante formularios, sin escribir código.
- **CA-19.3** Las condiciones deberán poder combinar con Y, O y NO comparaciones sobre: descripción
  de la línea (contiene, empieza con, es igual), valor de la línea, tipo de tributo de la línea,
  RUC y razón social del emisor y del receptor (es igual, contiene), moneda (es igual), total del
  comprobante (mayor, menor, entre), fecha de emisión (entre) y tipo de operación.
- **CA-19.4** Las acciones de una regla de comprobante deberán poder fijar la cuenta de IGV, la
  cuenta de contrapartida, el centro de costo por defecto y etiquetas analíticas. Las acciones de
  una regla de línea deberán poder fijar la cuenta base, el centro de costo, etiquetas analíticas
  o un **prorrateo** de la línea entre dos o más destinos (cuenta y centro de costo) con
  porcentajes que sumen exactamente 100 %.
- **CA-19.5** El sistema deberá guardar las reglas como un árbol de reglas serializable y deberá
  rechazar guardar una regla incompleta o inválida (campo u operador desconocido, valor vacío,
  porcentajes que no suman 100 %, cuenta vacía) indicando qué corregir.
- **CA-19.6** Cuando el Admin cree o pruebe una plantilla en el banco global, el sistema deberá
  validar sus cuentas contra el PCGE semilla (existen y son de uso) y mostrar los errores.

### RF-20 — Evaluación de reglas al generar el asiento

- **CA-20.1** Cuando se genere un asiento, el sistema deberá evaluar las reglas de comprobante y
  luego las de línea de la versión activa, en orden de prioridad; en cada grupo **gana la primera
  regla que se cumple**. Lo que ninguna regla fije toma el valor por defecto de la plantilla.
- **CA-20.2** El sistema deberá prorratear según la aclaración del 2026-09-22 (redondeo hacia
  abajo por parte y residuo a la última), después de convertir a soles, de modo que el asiento
  siga cuadrando.
- **CA-20.3** El sistema deberá agrupar en una sola línea las partes con la misma cuenta, centro
  de costo y lado, y generar las líneas de destino (amarres) por cada cuenta base según el
  catálogo de la empresa.
- **CA-20.4** El sistema deberá registrar en el asiento qué regla aplicó a cada línea (o "por
  defecto") y mostrarlo en el detalle y en la trazabilidad.
- **CA-20.5** El mismo comprobante con la misma versión de plantilla y el mismo catálogo deberá
  producir siempre el mismo asiento.

### RF-21 — Pruebas y activación de versiones (SDD RNF-11)

- **CA-21.1** El sistema deberá permitir al Admin agregar a un borrador casos de prueba con un
  comprobante de ejemplo (emisor, receptor, moneda, fecha, líneas, IGV y total) y el asiento
  esperado (líneas con lado, cuenta, centro de costo y monto).
- **CA-21.2** Cuando el Admin pulse "Probar", el sistema deberá evaluar cada caso con el PCGE
  semilla y mostrar el asiento obtenido, si cuadra, si coincide con el esperado y qué reglas
  aplicaron.
- **CA-21.3** El sistema deberá permitir activar una versión solo si todos sus casos pasan, todos
  sus asientos cuadran, sus cuentas son válidas en el PCGE semilla y **cada regla aplicó en al
  menos un caso**. Si no, deberá indicar qué falta.
- **CA-21.4** Mientras una plantilla tenga una versión activa, el sistema deberá mantener una sola
  versión activa por plantilla.

### RF-22 — Versionado inmutable (RD-10)

- **CA-22.1** El sistema deberá tratar como no editables las versiones activas y retiradas. Solo
  los borradores se editan o eliminan.
- **CA-22.2** Cuando el Admin pida editar una versión activa o retirada, el sistema deberá crear
  una nueva versión en borrador con número siguiente y el mismo contenido.
- **CA-22.3** Cuando se active una nueva versión, el sistema deberá pasar la anterior a
  "retirada" y registrar quién activó, cuándo y el resumen de diferencias con la versión previa.
- **CA-22.4** El sistema deberá conservar en cada asiento la versión exacta con que se generó;
  activar una nueva versión no deberá modificar asientos existentes.
- **CA-22.5** El sistema deberá permitir retirar una plantilla (sin versión activa); en ese caso
  deja de ofrecerse a todas las empresas.

### RF-23 — Activación de plantillas por empresa

- **CA-23.1** Dentro de una empresa, el sistema deberá permitir al Admin activar o desactivar
  cada plantilla del banco global que tenga versión activa.
- **CA-23.2** Al activar, el sistema deberá validar las cuentas de la versión activa contra el
  catálogo de esa empresa y mostrar las cuentas inexistentes o no imputables como advertencia,
  sin impedir la activación.
- **CA-23.3** El sistema deberá tomar como activaciones iniciales de cada empresa las que se
  deducen de sus plantillas activas registradas en el módulo de empresas (compras de mercadería,
  servicios y gastos, ventas).
- **CA-23.4** Toda activación, desactivación y operación sobre plantillas deberá quedar en la
  auditoría con usuario, rol, fecha y detalle.

---

## 5. Requisitos no funcionales

- **RNF-01 — Exactitud monetaria**: todos los montos en soles deben ser exactos al céntimo; la
  suma de miles de líneas no debe introducir diferencias por redondeo.
- **RNF-02 — Tiempo de respuesta percibido**: un lote de hasta 20 comprobantes debe mostrar su
  resumen en menos de 5 segundos, incluida la demora simulada.
- **RNF-03 — Aislamiento de fallos**: un comprobante fallido nunca impide procesar el resto del
  lote.
- **RNF-04 — Controles efectivos**: las reglas de cuadre, duplicados, periodo, permisos y
  estados se aplican siempre, sin importar desde dónde se intente la acción; ocultar un botón no
  sustituye la validación.
- **RNF-05 — Idioma**: textos, motivos y mensajes en español claro, sin jerga técnica; los
  motivos de error indican qué dato falló y cómo corregirlo, si es posible.
- **RNF-06 — Determinismo de demostración**: los fallos simulados (servicio de tipo de cambio
  caído) solo ocurren si se activan explícitamente; el mismo comprobante produce siempre el
  mismo asiento.
- **RNF-07 — Datos ficticios**: todos los RUC, razones sociales y montos de ejemplo son
  ficticios.
- **RNF-08 — Consistencia visual**: las pantallas nuevas siguen el mismo aspecto, navegación y
  componentes del prototipo actual.

## 6. Casos límite

| Caso | Comportamiento esperado |
|---|---|
| Lote vacío o sin plantilla elegida | No se procesa; se indica qué falta. |
| Empresa sin plantillas activadas | Aviso "sin plantillas activas"; no se puede procesar (CA-01.2b). |
| Plantilla no activada para la empresa, enviada por otra vía | Lote rechazado sin procesar (CA-01.2c). |
| Dos reglas de línea se cumplen a la vez | Gana la de mayor prioridad (CA-20.1). |
| Ninguna regla se cumple | Se usan las cuentas y el CC por defecto de la plantilla. |
| Prorrateo con porcentajes que suman 99 % o 101 % | No se puede guardar la regla (CA-19.5). |
| Prorrateo de S/ 0.01 en tres partes | Partes 0.00, 0.00 y 0.01; las líneas de monto 0 se omiten. |
| Regla que fija una cuenta que no existe en el catálogo de la empresa | Bandeja: "cuenta inexistente" en esa línea. |
| Borrador con una regla que ningún caso ejercita | No se puede activar; se indica la regla (CA-21.3). |
| Editar una versión activa | Se crea una nueva versión en borrador; la activa no cambia (CA-22.2). |
| Activar la versión 2 con asientos pendientes de aprobación hechos con la 1 | Esos asientos conservan la versión 1 (CA-22.4). |
| Recalcular en la bandeja un asiento cuya plantilla fue retirada o desactivada | Bandeja: "plantilla no activa" (HU-10). |
| El Maker o el Auditor intentan crear o activar una plantilla | Acción denegada y registrada (CA-15.2b). |
| Lote con 51 comprobantes o más | Se rechaza la carga completa; se indica el límite de 50 (CA-01.5). |
| Archivo de más de 1 MB | Fallido: "archivo excede 1 MB"; el resto del lote continúa (CA-01.6). |
| Asiento con exactamente 48 horas en bandeja | Aún no se destaca; se destaca al superar las 48 horas (CA-10.4). |
| Archivo con extensión no soportada (PDF, imagen) | Fallido: "formato no soportado". |
| XML UBL válido pero de un tipo no soportado (nota de crédito, boleta) | Fallido: "tipo de documento no soportado en esta versión". |
| Moneda distinta de PEN o USD | Fallido: "moneda no soportada". |
| Mismo comprobante dos veces en el mismo lote | El primero se procesa; el segundo es duplicado (CA-03.5). |
| Re-subir un comprobante cancelado | Duplicado; no se reactiva (CA-03.2). |
| Emisor y receptor con el mismo RUC de la empresa | Fallido: "emisor y receptor no pueden ser la misma empresa". |
| Factura con total 0 o negativo | Fallido: "total inválido". |
| Factura 100% exonerada (IGV 0) | Se acepta; el asiento no lleva línea de IGV. |
| Diferencia de S/ 0.01 entre base + IGV y total | Se acepta (tolerancia de redondeo). |
| Diferencia de S/ 0.02 o más | Bandeja: "montos inconsistentes"; solo se puede cancelar. |
| Fecha de emisión futura (periodo no abierto) | Bandeja: "periodo cerrado o no abierto". |
| Fecha de emisión en un mes que no figura entre los periodos de la empresa | Bandeja: "periodo cerrado o no abierto". |
| Factura de agosto (ABIERTO) cargada mientras el usuario trabaja en setiembre | Se acepta: vale cualquier periodo abierto, no solo el activo. |
| El usuario entró a un periodo CERRADO | Carga y acciones de bandeja en solo lectura; los intentos se rechazan (CA-09.5). |
| Un periodo se reabre después de enviar asientos a la bandeja | El Maker usa "revalidar" y el asiento avanza si todo lo demás está bien. |
| USD con servicio caído y sin tasa previa | Bandeja: "sin tipo de cambio". |
| Cambio de plantilla a una que sigue sin corresponder | Sigue en bandeja con el motivo actualizado. |
| Acción en lote donde algunos asientos avanzan y otros no | Resultado individual por asiento (CA-11.5). |
| Dos pestañas modifican el mismo asiento | La segunda recibe "conflicto" (CA-11.6). |
| El usuario sale de la empresa en medio de la carga | El lote se procesa íntegramente para la empresa con la que se inició. |
| El usuario cierra sesión y entra como Auditor en otra pestaña con la bandeja abierta | Las acciones de edición se deniegan y quedan registradas. |
| Sesión sin rol reconocido (por ejemplo, un rol que no existe en la matriz) | Solo lectura; toda acción se deniega y se registra. |
| Cuenta de la plantilla eliminada del catálogo de la empresa | Bandeja: "cuenta inexistente". |
| Cuenta de la plantilla que en el catálogo de la empresa es padre (no de uso) | Bandeja: "cuenta no imputable". |
| Amarre del catálogo que apunta a una cuenta que no existe | Bandeja: "cuenta inexistente" en la línea de destino. |
| Cuenta de gasto con exigencia de CC, sin CC en la plantilla ni en el catálogo | Bandeja: "falta centro de costo". |
| La misma plantilla aplicada en dos empresas con catálogos distintos | Cada asiento usa las cuentas y amarres del catálogo de su empresa; los resultados pueden diferir. |

## 7. Fuera de alcance

Queda fuera de esta funcionalidad y se especificará aparte:

- Aprobación y rechazo por el Checker, matriz de delegación de autoridad (DoA), aprobación
  automática (STP) y firma del aprobador.
- Registro en el Libro Diario / Libros Contables y publicación del asiento registrado.
- Reversión de asientos registrados.
- Reglas que llamen a servicios externos, fórmulas libres escritas como texto o reglas que
  generen asientos adicionales (por ejemplo, detracciones o retenciones).
- Plantillas propias por empresa (todas nacen en el banco global).
- Que Compras y Ventas manuales usen las plantillas con reglas (siguen con sus plantillas
  actuales).
- Re-procesamiento de comprobantes fallidos (cola de fallidos / DLQ) y rol Operador de Soporte.
- Apertura, cierre y reapertura de periodos contables.
- Notas de crédito, notas de débito, boletas, recibos por honorarios y otros comprobantes.
- Monedas distintas de PEN y USD.
- Registro del pago o cobro (contado/crédito): solo se genera el asiento de provisión.
- Recepción real desde ERP, correo o webhooks; importación masiva de migración.
- Alertas y escalamiento por antigüedad en la bandeja (solo se muestra la antigüedad y se
  destacan los atrasados).
- Cambios a los módulos actuales de Compras y Ventas.
- Editar el catálogo de cuentas o los periodos desde la ingestión (se hacen en sus módulos; la
  ingestión solo los lee).

## 8. Entidades clave

- **Evidencia original**: el contenido recibido tal cual, con fecha de recepción, nombre del
  archivo, origen (archivo subido o catálogo de ejemplos), empresa y código de seguimiento.
  Nunca cambia.
- **Documento estándar**: los datos interpretados del comprobante (emisor, receptor, tipo,
  serie-número, fecha, moneda, líneas, base, IGV, total), vinculado a su evidencia y con su
  identificación para detectar duplicados.
- **Asiento borrador**: líneas Debe/Haber con cuenta, descripción, centro de costo, etiquetas,
  monto original, tasa y monto en soles. Además guarda el estado, los motivos de bandeja, la
  plantilla y su versión, el tipo de operación, el periodo, la marca de tasa provisional, la
  versión del registro (para detectar conflictos) y el vínculo al documento.
- **Plantilla contable**: identidad estable de una plantilla del banco global (código, nombre,
  tipo de operación) con sus versiones.
- **Versión de plantilla**: número, estado (borrador, activa, retirada), cuentas y centro de
  costo por defecto, reglas de comprobante y de línea, casos de prueba, autor, fecha, quién la
  activó y diferencias con la versión anterior.
- **Regla**: nombre, prioridad, condición (árbol Y/O/NO de comparaciones) y acciones.
- **Caso de prueba**: comprobante de ejemplo y asiento esperado; resultado de la última prueba.
- **Activación por empresa**: qué plantillas puede usar cada empresa, quién la activó, cuándo y
  advertencias de cuentas.
- **Plantillas activas de la empresa** (existente, del módulo de empresas): fuente de las
  activaciones iniciales (CA-23.3).
- **Catálogo de cuentas de la empresa** (existente; la ingestión solo lo lee, pero desde esta
  funcionalidad se conserva al recargar): las
  cuentas de cada empresa con código, si es de uso (U), si exige centro de costo, su centro de
  costo asociado y sus amarres Debe/Haber.
- **Tipo de cambio**: moneda, fecha y tasa.
- **Periodo contable** (existente, del módulo de empresas): empresa, ejercicio, mes y estado
  (ABIERTO o CERRADO). Un mes ausente cuenta como no abierto.
- **Evento de auditoría**: quién, rol, empresa, cuándo, qué, detalle y código de seguimiento.
- **Lote de carga**: el conjunto de comprobantes de una carga, con la plantilla elegida, el
  usuario, la fecha y el resumen de resultados.

## 9. Supuestos

- Las plantillas iniciales son las globales que ya existen en el prototipo (compra de
  mercaderías, servicios de transporte, venta, etc.), sembradas como versión 1 **activa** sin
  reglas (solo valores por defecto) y con un caso de prueba cada una. Se siembra además una
  plantilla de ejemplo con reglas y prorrateo. Las activaciones iniciales por empresa se deducen
  así: compras de mercadería → "Compra de Mercaderías"; servicios y gastos → plantillas de compra
  de servicios y gastos; ventas → plantillas de venta.
- La tabla simulada de tipo de cambio contiene la tasa venta SUNAT por fecha (ver CA-07.1).
- Los periodos de cada empresa son los que ya define el módulo de empresas (por ejemplo,
  PACHATUSANTREK: agosto 2026 CERRADO y setiembre 2026 ABIERTO); los meses que no figuran se
  consideran no abiertos.
- El catálogo de cuentas semilla (PCGE) de cada empresa contiene todas las cuentas y amarres
  que usan las plantillas semilla. Hoy le falta la cuenta de variación de mercaderías (6111101),
  destino de la compra de mercaderías, y se completa como parte de esta funcionalidad.
- La moneda funcional de todas las empresas es PEN.
- El usuario y el rol vienen del login simulado existente, y la empresa y el periodo, de la
  selección que el usuario hace al entrar a una empresa.

## 10. Criterios de finalización

### Resultados medibles

- **CF-01**: Un Maker carga un lote de 10 facturas válidas y obtiene 10 asientos pendientes de
  aprobación sin digitar ningún dato, en menos de 1 minuto desde que abre la pantalla.
- **CF-02**: Subir 5 veces el mismo comprobante produce exactamente 1 asiento y 4 duplicados
  registrados.
- **CF-03**: El 100% de los asientos en "Pendiente de aprobación" cuadran al céntimo en soles.
- **CF-04**: Cada caso del catálogo de ejemplos (CA-18.4) termina en el estado esperado y con
  el motivo esperado.
- **CF-05**: Un Maker resuelve 5 asientos con el mismo faltante en una sola acción en lote.
- **CF-06**: Para cualquier asiento, el Auditor reconstruye su historia completa desde el
  archivo original en una sola vista.
- **CF-07**: Ninguna acción denegada por rol produce cambios en los datos, y todas quedan en el
  historial.
- **CF-08**: Tras recargar el navegador, todos los lotes, asientos, historiales, catálogos de
  cuentas, periodos, plantillas y activaciones siguen presentes; tras "reiniciar datos de
  demostración", vuelven al estado inicial.
- **CF-09**: Un Admin crea una plantilla con dos reglas y un prorrateo, con sus casos de prueba, y
  la activa para una empresa en menos de 5 minutos, sin escribir código.
- **CF-10**: Ninguna versión llega a "activa" sin que todos sus casos pasen y cada regla esté
  cubierta por al menos un caso.
- **CF-11**: Activar una nueva versión no modifica ningún asiento existente; el 100 % de los
  asientos muestra la versión exacta con que se generó.

### Definición de terminado

- Todos los escenarios de aceptación de HU-01 a HU-10 se reproducen en la demostración.
- Las reglas de negocio (cuadre, duplicados, periodo, redondeo y conversión, estados, permisos,
  evaluación de reglas, prorrateo y ciclo de vida de versiones) tienen pruebas automáticas en
  verde, según la constitución.
- Se demuestra al menos un intento denegado por rol y un rechazo por cada regla de negocio.
- La aplicación compila sin errores y los módulos existentes siguen funcionando igual.

## 11. Dudas abiertas

No quedan dudas abiertas. D-01 (límites de lote), D-02 (tasa de cambio) y D-03 (umbral de
atraso) se resolvieron el 2026-09-21; ver la sección Clarifications.
