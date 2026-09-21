# 07 · Business Rules Registry

> **Qué es:** el registro de reglas de negocio con matriz de cumplimiento. En dominios regulados (finanzas, salud, tributario) este documento es obligatorio: es la trazabilidad entre lo que la norma exige, lo que el sistema hace y cómo se prueba.
> **Dueño:** contador titular como autoridad de dominio; equipo como redactor · **Revisión:** mensual · **Estado:** vivo por acumulación

---

## Cómo se lee

Cada regla tiene tres atributos que determinan **dónde vive en el sistema**:

| Origen | Dónde vive | Quién la puede cambiar |
|---|---|---|
| **LEY** | Parámetro de plataforma, versionado por vigencia | Administrador de plataforma, al publicarse la norma |
| **CONT** — teoría contable | Invariante del núcleo, en código | Nadie. Desactivarla haría que el sistema deje de producir contabilidad válida |
| **CFG-E** — decisión del estudio | Configuración de nivel estudio, heredable | Titular del estudio |
| **CFG-M** — decisión de la empresa | Configuración de nivel empresa | Contador asignado |

Y un nivel de certeza: 🟢 confirmada · 🟡 inferida, falta un sí o un no · 🔴 supuesto nuestro, bloquea desarrollo.

**Ninguna regla 🔴 o 🟡 se codifica sin confirmación firmada del contador titular.**

---

## A · Estructura contable

| ID | Regla | Origen | Certeza |
|---|---|---|---|
| RN-001 | Todo documento operativo registrado genera al menos un asiento | CONT | 🟢 |
| RN-002 | Todo asiento cumple partida doble en moneda funcional | CONT | 🟢 |
| RN-003 | Un asiento mayorizado es inmutable; se corrige por extorno | CONT | 🟡 |
| RN-004 | El mapeo documento a cuentas es configurable, no está en el código | CFG-M | 🟢 |
| RN-005 | Solo se imputa sobre cuentas de detalle | CONT | 🟢 |
| RN-006 | El plan admite profundidad de 2 a 5 dígitos | LEY | 🟢 |
| RN-007 | Ciertas cuentas exigen auxiliar: banco, trabajador, producto | CFG-M | 🟡 |
| RN-008 | Elementos 1–5 al Estado de Situación, 6–7 a Resultados, 8 cierre, 9 analítica | CONT | 🟢 |
| RN-009 | Cada cuenta tiene naturaleza esperada; la contraria dispara alerta | CONT | 🟢 |
| RN-010 | Cada empresa activa un subconjunto del PCGE maestro | CFG-M | 🟢 |

## B · Fechas y periodos

| ID | Regla | Origen | Certeza |
|---|---|---|---|
| RN-011 | Todo comprobante tiene fecha de emisión y, opcionalmente, de cancelación | CONT | 🟢 |
| RN-012 | Cancelación igual a emisión significa cancelado; posterior o vacía genera cuenta por pagar o cobrar | CONT | 🟢 |
| RN-013 | El mes de declaración puede ser posterior al de emisión; el gasto se devenga en el de emisión | LEY | 🟢 |
| RN-014 | Un periodo cerrado no admite asientos nuevos; reabrirlo exige autorización y motivo | CONT | 🔴 |
| RN-015 | El cierre mensual es la unidad operativa; el anual consolida los doce meses | CONT | 🟢 |

## C · Compras

| ID | Regla | Origen | Certeza |
|---|---|---|---|
| RN-016 | Cada compra se clasifica como costo, gasto o inversión | CONT | 🟢 |
| RN-017 | Es costo si está en el giro y se recupera con la venta → cuenta 60 | CONT | 🟢 |
| RN-018 | Es gasto si se consume en el periodo → 63, 64, 65, 66, 67 según naturaleza | CONT | 🟢 |
| RN-019 | Es inversión si genera beneficios futuros → cuenta 33 | CONT | 🟢 |
| RN-020 | El sistema sugiere la clasificación; el usuario confirma | CFG-E | 🟢 |
| RN-021 | **La cuenta destino y la afectación tributaria son campos independientes** | CONT | 🟢 |
| RN-022 | La afectación al IGV se determina por línea, no por comprobante | LEY | 🟢 |
| RN-023 | Al ingresar el RUC se completa la razón social consultando a SUNAT | — | 🟢 |
| RN-024 | Al ingresar la base imponible se calculan IGV y total automáticamente | LEY | 🟢 |
| RN-025 | El total del sistema debe coincidir con el que SUNAT tiene; una diferencia es bloqueante | LEY | 🟢 |
| RN-026 | Las compras registran bancarización: banco, fecha, número de operación y monto | LEY | 🟢 |
| RN-027 | Las compras en moneda extranjera registran tipo de cambio y valor original | LEY | 🟢 |
| RN-028 | Las compras se separan entre nacionales e importaciones | LEY | 🟢 |
| RN-029 | Las detracciones se calculan sobre el total y se detallan en campo propio | LEY | 🟢 |
| RN-030 | Percepciones y retenciones se registran por comprobante | LEY | 🟡 |
| RN-031 | El tipo de cambio se carga automáticamente desde la publicación de SUNAT | LEY | 🟢 |
| RN-032 | El tipo de comprobante proviene de la Tabla 10 de SUNAT | LEY | 🟢 |
| RN-033 | El tipo de documento de identidad proviene de la Tabla 2 de SUNAT | LEY | 🟢 |
| RN-034 | No se admiten dos comprobantes con la misma combinación de proveedor, tipo, serie y número | LEY | 🟢 |

## D · Asientos automáticos

| ID | Asiento | Debe | Haber | Origen | Certeza |
|---|---|---|---|---|---|
| RN-035 | Compra gravada | 60 base + 4011 IGV | 42 total | CFG-M | 🟢 |
| RN-036 | Destino a almacén | 20 | 61 | CFG-M | 🟢 |
| RN-037 | Pago a proveedor | 42 | 10 subcuenta del banco | CFG-M | 🟢 |
| RN-038 | Salida de almacén | 69 | 20 | CFG-M | 🟢 |
| RN-039 | Venta gravada | 12 | 70 + 4011 | CFG-M | 🟡 |
| RN-040 | Pago a cuenta de impuesto | 40 | 10 | CFG-M | 🟢 |
| RN-041 | Desembolso de préstamo | 10 | 45 | CFG-M | 🟢 |
| RN-042 | Provisión de planilla | 62 | 41 + 40 | CFG-M | 🟡 |
| RN-043 | Depreciación mensual | 68 | 39 | CFG-M | 🔴 |
| RN-044 | Provisión del impuesto anual | 88 | 4017 | CFG-M | 🔴 |
| RN-045 | La plantilla aplicada se elige mediante el campo "Tipo de asiento" | CFG-M | 🟢 |

## E · Ajustes automáticos

| ID | Condición detectada | Ajuste propuesto | Origen | Certeza |
|---|---|---|---|---|
| RN-046 | Cuenta del elemento 4 con saldo deudor por impuestos pagados en exceso | 37 al debe, 40 al haber | CONT | 🟢 |
| RN-047 | Cuenta 10 con saldo acreedor | Alerta de déficit; sugerir 10 al debe, 45 al haber | CONT | 🟢 |
| RN-048 | Ajuste de IGV en exceso a cuenta 16; de renta a cuenta 37 | Según PCGE | CONT | 🟡 |
| RN-049 | La cuenta 40 debe estar desagregada a subcuenta para distinguir IGV de renta | CONT | 🟢 |
| RN-050 | Saldos en moneda extranjera al cierre generan diferencia de cambio | CONT | 🟡 |
| RN-051 | Todo ajuste propuesto requiere aprobación antes de mayorizarse | CFG-E | 🔴 |
| RN-052 | Activo total menor que pasivo total dispara alerta de insolvencia | CONT | 🟢 |

## F · IGV

| ID | Regla | Origen | Certeza |
|---|---|---|---|
| RN-053 | IGV del periodo = IGV de ventas menos IGV de compras | LEY | 🟢 |
| RN-054 | El crédito no aplicado se arrastra al periodo siguiente | LEY | 🟢 |
| RN-055 | Empresas con ventas gravadas y no gravadas requieren prorrata del crédito fiscal | LEY | 🟢 |
| RN-056 | La prorrata exige clasificar cada compra por destino: gravadas, no gravadas o comunes | LEY | 🟢 |
| RN-057 | **El coeficiente de prorrata se calcula según la norma de IGV** | LEY | 🔴 |
| RN-058 | La exportación no está gravada y genera saldo a favor del exportador | LEY | 🟡 |
| RN-059 | Existen compras al 10% que se reportan por separado | LEY | 🔴 |
| RN-060 | El cálculo mensual se estructura sobre las casillas 100, 101, 105, 107, 108, 120, 157 | LEY | 🟢 |
| RN-061 | El cálculo mantiene dos bloques paralelos: SUNAT y registros propios | CFG-E | 🟢 |

**RN-057 es el bloqueante de mayor impacto del proyecto.** Ver SPIKE-001.

## G · Renta

| ID | Regla | Origen | Certeza |
|---|---|---|---|
| RN-062 | La utilidad contable sale de la diferencia entre columnas de resultados de la hoja de trabajo | CONT | 🟢 |
| RN-063 | Renta: 10% hasta 15 UIT de renta neta, 29.5% sobre el exceso, en Régimen MYPE | LEY | 🟢 |
| RN-064 | Tasas, tramos y UIT son parámetros con vigencia por año | LEY | 🟢 |
| RN-065 | Multas e intereses no son deducibles: se registran como **adición** | LEY | 🟢 |
| RN-066 | Registrar una multa como deducción produce una diferencia que SUNAT sanciona | LEY | 🟢 |
| RN-067 | Los pagos a cuenta se calculan sobre los ingresos del mes | LEY | 🟡 |
| RN-068 | Existe registro de pagos efectuados a SUNAT por periodo | CFG-E | 🟢 |

## H · Multas y responsabilidad

| ID | Regla | Origen | Certeza |
|---|---|---|---|
| RN-069 | Cada multa se registra con monto, tributo, periodo y causa | CFG-E | 🟢 |
| RN-070 | Cada multa se asigna a un responsable identificado | CFG-E | 🟢 |
| RN-071 | El cobro al responsable se formaliza en documento firmado antes de descontar | LEY | 🟢 |
| RN-072 | El descuento se fracciona en cuotas mensuales con cronograma | CFG-E | 🟢 |
| RN-073 | El monto cobrado al trabajador se reconoce como ingreso | CONT | 🟢 |
| RN-074 | El documento legal de responsabilidad genera su propio asiento | CFG-M | 🟢 |
| RN-075 | El descuento debe respetar el límite legal sobre la remuneración | LEY | 🔴 |

## I · Almacén

| ID | Regla | Origen | Certeza |
|---|---|---|---|
| RN-076 | El kardex registra entradas y salidas en unidades | CONT | 🟢 |
| RN-077 | El saldo se recalcula con cada movimiento | CONT | 🟢 |
| RN-078 | Las salidas se valorizan según el método elegido por la empresa | CFG-M | 🟡 |
| RN-079 | El costo total de existencias debe coincidir con el saldo de la cuenta 20 | CONT | 🟢 |

## J · Conciliación con SUNAT

| ID | Regla | Origen | Certeza |
|---|---|---|---|
| RN-080 | El SIRE entrega solo cabecera, nunca el detalle de ítems | — | 🟢 |
| RN-081 | En exportaciones, SUNAT devuelve base en cero o duplica el monto gravado; el sistema debe detectarlo | — | 🟢 |
| RN-082 | Toda corrección de un dato de SUNAT registra usuario, fecha, valores y motivo | LEY | 🔴 |
| RN-083 | El sistema genera los registros de compras y ventas en formato oficial | LEY | 🟢 |

## K · Interfaz

| ID | Regla | Origen | Certeza |
|---|---|---|---|
| RN-084 | Carga masiva desde el formato Excel del estudio | CFG-E | 🟢 |
| RN-085 | Búsqueda por descripción de ítem dentro de los comprobantes | — | 🟢 |
| RN-086 | Alertas automáticas de inconsistencias, faltantes y descuadres | — | 🟢 |
| RN-087 | Todo importe en pantalla es navegable hasta su documento origen | — | 🟢 |
| RN-088 | Comparativo mes contra mes por cuenta con diferencia calculada | — | 🟢 |
| RN-089 | La hoja de trabajo tiene seis pares de columnas: sumas del mayor, saldos, ajuste, inventario, resultado por función, resultado por naturaleza | CONT | 🟢 |

---

## Matriz de estado

| Origen | Reglas | 🟢 | 🟡 | 🔴 |
|---|---|---|---|---|
| LEY | 30 | 24 | 4 | 2 |
| CONT | 30 | 25 | 4 | 1 |
| CFG-E | 10 | 8 | 0 | 2 |
| CFG-M | 14 | 11 | 3 | 0 |
| Sin origen normativo | 5 | 4 | 0 | 1 |
| **Total** | **89** | **72** | **11** | **6** |

**81% de las reglas están confirmadas.** Los seis supuestos rojos se concentran en tres zonas y todos tienen un spike o una pregunta asignada:

| Regla roja | Zona | Cómo se resuelve |
|---|---|---|
| RN-057 prorrata del IGV | Tributario | SPIKE-001 sobre el Excel de Maralesa |
| RN-059 compras al 10% | Tributario | SPIKE-003 |
| RN-014, RN-051 cierre y aprobaciones | Control interno | Pregunta al contador |
| RN-043, RN-044 asientos de depreciación e impuesto | Contable | Pregunta al contador |
| RN-075 límite legal de descuento | Laboral | Consulta normativa |
| RN-082 auditoría de correcciones | Cumplimiento | Decisión del equipo, no del cliente |

---

## Reglas que NUNCA son configurables

Este subconjunto es el que hace que el sistema produzca contabilidad válida. Si alguna de estas se pudiera desactivar desde la interfaz, el producto dejaría de ser un sistema contable:

- RN-002 · partida doble
- RN-003 · inmutabilidad del asiento mayorizado
- RN-008 · destino de elementos a estados financieros
- RN-009 · naturaleza esperada por cuenta
- RN-021 · independencia entre cuenta destino y afectación tributaria
- RN-079 · concordancia entre kardex y cuenta 20
- Separación entre quien registra y quien aprueba

---

## Procedimiento de mantenimiento

1. Toda regla nueva entra como 🔴 hasta que el contador titular la confirme.
2. En la sesión mensual se recorren las 🟡 y 🔴; confirmarlas o corregirlas es el único punto fijo de esa agenda.
3. Una regla confirmada genera un acta de aprobación firmada, que es documento inmutable.
4. Cada regla codificada referencia su ID en el código y en la prueba automatizada. Una regla sin prueba no se considera implementada.
