# 05 · ADR Log — Architecture Decision Records

> **Qué es:** el registro de decisiones estructurales. Cada ADR es **inmutable**: si la decisión cambia, se escribe uno nuevo que supera al anterior. El rastro del razonamiento es el activo, no la conclusión.
> **Dueño:** arquitectura · **Cadencia:** se agrega uno cada vez que se decide algo caro de revertir · **Estado:** vivo por acumulación

**Regla:** un ADR se escribe cuando la decisión es difícil de revertir, afecta a más de un módulo, o alguien va a preguntar "¿por qué está hecho así?" dentro de un año.

---

## Índice

| ADR | Decisión | Estado |
|---|---|---|
| [001](#adr-001) | Español como idioma del dominio | Aceptado |
| [002](#adr-002) | Decimal de precisión fija en todo cálculo monetario | Aceptado |
| [003](#adr-003) | Asientos inmutables, corrección por extorno | Aceptado |
| [004](#adr-004) | Sin event sourcing como framework | Aceptado |
| [005](#adr-005) | Monolito modular, no microservicios | Aceptado |
| [006](#adr-006) | Multi-tenancy por discriminador con políticas de fila | Aceptado |
| [007](#adr-007) | RBAC combinado con ReBAC | Aceptado |
| [008](#adr-008) | Configuración jerárquica en tres niveles | Aceptado |
| [009](#adr-009) | PCGE como catálogo maestro de plataforma | Aceptado |
| [010](#adr-010) | Auxiliares como dimensión, no como subcuentas | Aceptado |
| [011](#adr-011) | Cuenta contable y afectación tributaria como ejes independientes | Aceptado |
| [012](#adr-012) | Parámetros legales versionados por vigencia | Aceptado |
| [013](#adr-013) | Motor de asientos declarativo y configurable | Aceptado |
| [014](#adr-014) | Proyecciones materializadas reconstruibles | Aceptado |
| [015](#adr-015) | Trabajo pesado en cola con trabajadores idempotentes | Aceptado |
| [016](#adr-016) | Capa anticorrupción obligatoria para datos de SUNAT | Aceptado |
| [017](#adr-017) | El sistema propone, el humano aprueba | Aceptado |

---

<a name="adr-001"></a>
## ADR-001 · Español como idioma del dominio

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** El dominio contable peruano tiene vocabulario propio y preciso. El experto de dominio no habla inglés técnico.

**Decisión.** Las clases, métodos y campos del núcleo de dominio se nombran en español, con la terminología del glosario. La infraestructura usa inglés.

**Consecuencias.** Mezcla de idiomas en la base de código, con la frontera documentada. A cambio, el contador puede leer el nombre de una clase y saber si está bien. Además evita ambigüedad real: `Credit` en inglés significa otra cosa en contexto bancario que "Haber" en contabilidad.

---

<a name="adr-002"></a>
## ADR-002 · Decimal de precisión fija en todo cálculo monetario

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** Un céntimo de error de redondeo descuadra un cierre y le cuesta horas al contador.

**Decisión.** Importes en `DECIMAL(16,2)`, tipos de cambio en `DECIMAL(12,6)`, tasas en `DECIMAL(9,6)`. Ningún punto flotante en ninguna capa, incluida la interfaz. Los importes viajan al navegador como texto. Una sola política de redondeo, aplicada en un único lugar del código.

**Consecuencias.** Serialización más cuidadosa y aritmética más verbosa. No negociable.

---

<a name="adr-003"></a>
## ADR-003 · Asientos inmutables, corrección por extorno

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** Los libros contables tienen exigencia legal de integridad. Editar un asiento ya mayorizado destruye la auditabilidad.

**Decisión.** Un asiento mayorizado no se edita ni se elimina. La corrección se hace con un asiento inverso que referencia al original. Los permisos de base de datos impiden `UPDATE` y `DELETE` sobre esas tablas: la protección no depende del código de aplicación.

**Consecuencias.** Más filas y una interfaz que debe explicar el extorno al usuario. A cambio, el libro diario es un registro auditable por construcción.

---

<a name="adr-004"></a>
## ADR-004 · Sin event sourcing como framework

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** La tentación de event sourcing es fuerte en contabilidad.

**Decisión.** Modelo transaccional clásico con asientos append-only e inmutables, más proyecciones materializadas. Sin framework de event sourcing.

**Justificación.** El libro diario **es** el registro de eventos por definición legal, y ya es inmutable, ordenado y auditable. Añadir una capa de eventos técnicos encima duplica conceptos, confunde al equipo y no aporta capacidad que el negocio pida.

**Consecuencias.** Se renuncia a reconstruir estados históricos de estructuras que no sean el mayor. El negocio no lo pide.

---

<a name="adr-005"></a>
## ADR-005 · Monolito modular, no microservicios

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** Sistema nuevo, dominio todavía en descubrimiento, equipo pequeño.

**Decisión.** Un despliegue, con módulos de límites explícitos que corresponden a los contextos delimitados del dominio. Los módulos se comunican por eventos internos, no por llamadas directas a sus internos.

**Condición de salida.** Cuando la generación de libros o la importación masiva compitan por recursos con el registro interactivo, se extrae ese trabajador a servicio propio. Ya está aislado tras la cola, así que es un cambio de despliegue.

**Consecuencias.** Un fallo puede afectar a todo el sistema. Se acepta a cambio de eliminar la complejidad operativa de un sistema distribuido en la etapa donde el riesgo real es el modelado del dominio.

---

<a name="adr-006"></a>
## ADR-006 · Multi-tenancy por discriminador con políticas de fila

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** 20 estudios al lanzamiento, 300 en el escenario de crecimiento. Datos tributarios de terceros.

**Decisión.** Base y esquema compartidos, con `estudio_id` y `empresa_id` en toda tabla de dominio, y políticas de seguridad a nivel de fila aplicadas por el motor de base de datos.

**Alternativas descartadas.** Base o esquema por tenant: 300 migraciones por cada cambio de esquema, y sin posibilidad de reportes consolidados del estudio. Filtro solo en la aplicación: un olvido en un `WHERE` filtra datos de un cliente a otro, lo que es inaceptable en este dominio.

**Consecuencias.** Un fallo en el filtro sería catastrófico, por eso la protección va en la base y se prueba en cada entrega. La ruta de escape existe: mover un estudio grande a instancia propia no requiere cambiar el modelo, porque el discriminador ya está.

**Esta es la decisión más cara de revertir de todo el sistema.**

---

<a name="adr-007"></a>
## ADR-007 · RBAC combinado con ReBAC

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** El rol dice qué acciones puede hacer alguien, pero no sobre qué empresas. Un asistente accede a las empresas que le asignaron, no a todas las del estudio.

**Decisión.** RBAC para acciones, ReBAC para recursos. La autorización efectiva es la intersección, y el resultado establece el contexto de tenant de la conexión.

**Adicional, y no configurable:** separación entre quien registra y quien aprueba. Es control interno contable, no una política de seguridad ajustable.

**Consecuencias.** Modelo de autorización más complejo que un RBAC puro. Es lo que el requisito exige.

---

<a name="adr-008"></a>
## ADR-008 · Configuración jerárquica en tres niveles

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** El estudio es quien paga y quiere que sus empresas compartan configuración; cada empresa necesita poder desviarse.

**Decisión.** Plataforma → estudio → empresa, con herencia y sobreescritura. Se resuelve de abajo hacia arriba. Cada valor guarda su nivel de origen.

**Consecuencias.** Toda lectura de configuración pasa por un resolutor. La interfaz debe mostrar si un valor es heredado o propio, o el usuario no entenderá por qué cambió algo que él no tocó.

---

<a name="adr-009"></a>
## ADR-009 · PCGE como catálogo maestro de plataforma

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** Los tres libros del piloto contienen el mismo plan de 1,705 cuentas, sin personalizar: 81 de 2 dígitos, 322 de 3, 656 de 4, 646 de 5. Profundidad máxima 5, elementos 1 a 9.

**Decisión.** Un catálogo maestro del PCGE a nivel de plataforma. Por empresa, solo el conjunto de cuentas activadas, más cuentas propias adicionales si hicieran falta.

**Consecuencias.** Alta de cliente nuevo: marcar cuentas en vez de cargar 1,705 filas. Actualización normativa: una vez para todos. Reportes comparables entre empresas sin traducción. **Supera la decisión de la v1 de tener un plan independiente por empresa**, que era más costosa y no correspondía a la realidad observada.

---

<a name="adr-010"></a>
## ADR-010 · Auxiliares como dimensión, no como subcuentas

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** El contador describió verbalmente cuentas como "6211 más el trabajador". Podía significar subcuenta por tercero o dimensión analítica.

**Decisión.** Proveedor, cliente, trabajador, banco, producto y centro de costo son dimensiones asociadas al movimiento contable, no niveles del código de cuenta.

**Evidencia.** El plan real llega hasta 5 dígitos del PCGE estándar y no contiene subcuentas por tercero.

**Consecuencias.** El plan queda estable y comparable entre empresas. El análisis por tercero se hace agrupando por dimensión. Si se hubieran modelado como subcuentas, el plan crecería a decenas de miles de filas por empresa.

---

<a name="adr-011"></a>
## ADR-011 · Cuenta contable y afectación tributaria como ejes independientes

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** Un análisis preliminar interpretó que "las compras no gravadas van a la cuenta 67". La estructura real del registro de compras del piloto muestra otra cosa: un bloque de columnas por cuenta contable (60, 63, 64, 65, 66, 67, 33) y un bloque separado de afectación tributaria (gravada, no gravada, importación).

**Decisión.** `cuenta_destino` y `afectacion_igv` son campos independientes de la línea de comprobante.

**Consecuencias.** Un gasto financiero puede ser no gravado; una compra de mercadería puede ser importación. Colapsar los dos ejes en un campo habría invalidado el cálculo tributario y habría sido caro de descubrir en producción.

---

<a name="adr-012"></a>
## ADR-012 · Parámetros legales versionados por vigencia

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** Tasa de IGV, UIT, tramos de renta, umbral de bancarización, tasas de detracción, Tabla 2 y Tabla 10 de SUNAT, casillas de formulario. Todos cambian por norma.

**Decisión.** Cada uno es un registro con fecha de vigencia. El cálculo resuelve el parámetro aplicable **a la fecha de la operación**, nunca a la fecha actual.

**Consecuencias.** Ningún número legal escrito en el código: ni el 18%, ni el 29.5%, ni el 10%. Recalcular un periodo antiguo produce el número correcto de ese periodo. Una actualización normativa se despliega como dato, no como código.

---

<a name="adr-013"></a>
## ADR-013 · Motor de asientos declarativo y configurable

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** El mapeo de documento a cuentas varía por empresa y cambia con el tiempo. La hoja de registro de compras del piloto tiene una columna literal "Tipo de asiento" con valores discretos: el estudio ya elige plantilla al registrar.

**Decisión.** Las reglas de generación de asientos se expresan en plantillas declarativas, versionadas, con vigencia, editables desde la interfaz por el contador titular. Los módulos de captura publican eventos y no conocen códigos de cuenta.

**Restricción.** El evaluador de expresiones es un lenguaje cerrado: sin acceso a archivos, sin bucles, sin llamadas externas. Una plantilla es una fórmula, no un programa.

**Consecuencias.** Mayor complejidad inicial. A cambio, agregar un módulo no toca el núcleo, y una auditoría puede responder "plantilla X, versión 3, vigente desde tal fecha" en vez de "está en el código".

---

<a name="adr-014"></a>
## ADR-014 · Proyecciones materializadas reconstruibles

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** Responder una consulta de saldo en menos de 300 ms sobre millones de movimientos.

**Decisión.** Saldos, hoja de trabajo y cálculo tributario son proyecciones actualizadas por evento, idempotentes, y **reconstruibles en su totalidad desde el libro diario**. Un trabajo nocturno recalcula y compara; una diferencia dispara alerta.

**Excepción.** Al solicitar el cierre de periodo, el sistema fuerza el drenado de la cola y muestra estado sincronizado con indicador visible. El contador no puede cerrar sobre un número eventual.

**Consecuencias.** Consistencia eventual en lecturas, pero verificable por máquina en vez de por confianza.

---

<a name="adr-015"></a>
## ADR-015 · Trabajo pesado en cola con trabajadores idempotentes

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** Importar 5,000 filas de SIRE, mayorizar un cierre o generar libros no puede bloquear la interfaz. El pico de carga se concentra en los días de vencimiento del cronograma SUNAT.

**Decisión.** Todo trabajo pesado va a una cola. Los eventos se publican mediante bandeja transaccional escrita en la misma transacción que el agregado. Los trabajadores son idempotentes e identifican cada trabajo por clave. Escalan independientemente de la API.

**Consecuencias.** Reintentar tras un fallo no duplica asientos, lo cual es crítico en contabilidad. El pico de vencimientos se absorbe multiplicando trabajadores sin tocar la API.

---

<a name="adr-016"></a>
## ADR-016 · Capa anticorrupción obligatoria para datos de SUNAT

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** SUNAT devuelve datos estructuralmente inválidos con regularidad: base imponible en cero en exportaciones, monto duplicado en la columna de valor gravado.

**Decisión.** Todo dato externo entra a un área de preparación, se diagnostica contra un catálogo de anomalías conocidas, y solo pasa al dominio tras conciliación o corrección explícita con motivo y usuario registrados.

**Consecuencias.** Un paso adicional en el flujo del asistente. Ese paso ya existe hoy, pero es manual y sin registro. Ahora queda auditado.

---

<a name="adr-017"></a>
## ADR-017 · El sistema propone, el humano aprueba

**Estado:** aceptado · **Fecha:** setiembre 2026

**Contexto.** Clasificación de compras entre costo, gasto e inversión; asientos de ajuste; correcciones de datos de SUNAT. Todas exigen criterio profesional.

**Decisión.** Ninguna decisión de criterio se aplica sola. El sistema sugiere con su razonamiento visible y registra quién aprobó y cuándo.

**Consecuencias.** Más pasos en el flujo, compensados con aprobación masiva de sugerencias de alta confianza. Protege la responsabilidad profesional del estudio, que es la que está en juego ante SUNAT.

---

## Plantilla para ADRs nuevos

```markdown
<a name="adr-NNN"></a>
## ADR-NNN · [Decisión en una frase afirmativa]

**Estado:** propuesto | aceptado | supera al ADR-MMM | superado por ADR-MMM
**Fecha:**

**Contexto.** La situación que obliga a decidir y las fuerzas en tensión.

**Decisión.** Qué se decidió, en presente y afirmativo.

**Alternativas descartadas.** Cuáles y por qué.

**Consecuencias.** Lo bueno, lo malo, y lo que ahora es más difícil de hacer.
```
