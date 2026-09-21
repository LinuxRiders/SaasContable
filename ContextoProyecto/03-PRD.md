# 03 · PRD — Product Requirements Document

> **Qué es:** el documento de requisitos de producto. Define **qué** y **por qué**, nunca **cómo**. El "cómo" vive en el Design Doc.
> **Dueño:** producto · **Revisión:** mensual · **Estado:** vivo · **Versión:** 1.0

---

## 1 · Contexto y evidencia

Plataforma SaaS de contabilidad tributaria peruana para estudios contables. Cliente piloto: un estudio con tres empresas analizadas en profundidad.

### Evidencia de volumen

Medida sobre los libros reales del piloto:

| Empresa | Compras | Ventas | Periodo | Comprobantes/mes |
|---|---|---|---|---|
| Maralesa Equipos y Servicios | 714 | 1,474 | 6 meses de 2026 | ~365 |
| Corporación Inti Punku EIRL | 722 | 19 | 6 meses de 2026 | ~124 |
| Corporación Llamas Romero SAC | 482 | 3,460 | año 2023 | ~330 |

Perfiles muy distintos entre sí: una empresa casi no factura pero compra mucho; otra factura siete veces más de lo que compra. **El sistema no puede asumir un perfil típico.**

### Proyección de escala

| Escenario | Estudios | Empresas | Comprobantes/mes | Movimientos a 5 años |
|---|---|---|---|---|
| Lanzamiento | 20 | ~60 | ~21,000 | ~2.5 M |
| Objetivo cercano | 60 | ~180 | ~63,000 | ~22 M |
| Crecimiento | 300 | ~1,000 | ~350,000 | ~125 M |

---

## 2 · Usuarios y jerarquía

Tres niveles de entidad, no dos. Esto gobierna todo el modelo de permisos y de configuración.

| Nivel | Qué es | Ejemplo |
|---|---|---|
| **Plataforma** | El SaaS. Dueña de los parámetros legales y del PCGE maestro | — |
| **Estudio contable** | El tenant que paga la suscripción | El estudio del Sr. Darío |
| **Empresa cliente** | La unidad contable | Maralesa, Inti Punku, Llamas Romero |

| Persona | Rol | Necesidad principal | Frecuencia de uso |
|---|---|---|---|
| Titular del estudio | Contador colegiado, experto de dominio | Asientos, ajustes, cierre, estados financieros | Diaria |
| Asistente contable | Digitación y conciliación | Registro rápido, cuadre automático, formatos SUNAT | Diaria, intensiva |
| Gerente de empresa cliente | Consumidor de información | Saldos e indicadores al instante | Semanal |
| Auditor | Revisión externa | Lectura completa incluida la bitácora | Esporádica |

---

## 3 · Requisitos funcionales

Numerados como RF-xxx. Cada uno enlaza a las reglas de negocio del documento 07.

### RF-100 · Gestión de empresas y configuración

| ID | Requisito | Prioridad |
|---|---|---|
| RF-101 | Un estudio da de alta empresas cliente con RUC, razón social, régimen tributario y ejercicio | Debe |
| RF-102 | Cada empresa activa un subconjunto del PCGE maestro; no se carga un plan propio | Debe |
| RF-103 | La configuración se resuelve en tres niveles con herencia: plataforma → estudio → empresa | Debe |
| RF-104 | Cada empresa habilita solo los módulos que usa; la evidencia muestra que no todas usan todos | Debe |
| RF-105 | Los periodos mensuales se abren y cierran; un periodo cerrado bloquea escrituras | Debe |
| RF-106 | Los parámetros legales se administran con fecha de vigencia y aplican a la fecha de operación | Debe |

### RF-200 · Registro de compras

Columnas derivadas de la hoja GASTOS del piloto.

| ID | Requisito | Prioridad |
|---|---|---|
| RF-201 | Registrar comprobante con tipo (Tabla 10 SUNAT), serie y número | Debe |
| RF-202 | Identificar la contraparte por tipo de documento (Tabla 2 SUNAT) y número; completar razón social consultando el RUC | Debe |
| RF-203 | Registrar tres fechas independientes: emisión, vencimiento y **mes de declaración** | Debe |
| RF-204 | Registrar valor en moneda extranjera y tipo de cambio, con carga automática del publicado | Debe |
| RF-205 | **Distribuir el importe entre cuentas contables** (60, 63, 64, 65, 66, 67, 33 y las que la empresa active) | Debe |
| RF-206 | **Clasificar la afectación tributaria de forma independiente de la cuenta**: gravada, no gravada, importación | Debe |
| RF-207 | Seleccionar el **tipo de asiento** que se aplicará, de un catálogo configurable | Debe |
| RF-208 | Registrar bancarización: banco, fecha, número de operación y monto | Debe |
| RF-209 | Registrar detracción, percepción y retención | Debe |
| RF-210 | Registrar el destino de la compra para prorrata: gravadas, no gravadas o comunes | Debe |
| RF-211 | Importar lotes desde el formato Excel del estudio, con reporte de filas rechazadas | Debe |
| RF-212 | Impedir el registro duplicado del mismo comprobante del mismo proveedor | Debe |
| RF-213 | Buscar comprobantes por la descripción de lo comprado | Debe |

**RF-205 y RF-206 son dos ejes independientes y así deben modelarse.** Un gasto financiero (cuenta 67) puede ser no gravado; una compra de mercadería (cuenta 60) puede ser importación. Colapsarlos en un solo campo es un error de modelado que invalida el cálculo tributario.

### RF-300 · Registro de ventas

| ID | Requisito | Prioridad |
|---|---|---|
| RF-301 | Registrar ventas con distribución entre cuentas de ingreso (70, 75, 76, 77) | Debe |
| RF-302 | Registrar exportaciones sin IGV | Debe |
| RF-303 | Registrar notas de crédito y débito vinculadas al comprobante original | Debe |
| RF-304 | Mantener un bloque de **regularizaciones** separado de las operaciones del periodo | Debe |
| RF-305 | Importar lotes desde Excel | Debe |

### RF-400 · Determinación tributaria

Estructurada sobre las casillas del formulario de declaración, tal como el piloto ya lo hace.

| ID | Requisito | Prioridad |
|---|---|---|
| RF-401 | Producir el cuadro mensual con las casillas: 100 valor ventas, 101 IGV ventas, 105 inafectos ventas, 107 valor compras, 108 IGV compras, 120 inafectos compras, 157 IGV importaciones | Debe |
| RF-402 | Separar compras nacionales, importaciones y compras al 10% | Debe |
| RF-403 | Calcular el saldo de IGV del periodo y arrastrar el crédito no aplicado al siguiente | Debe |
| RF-404 | Aplicar prorrata del crédito fiscal cuando la empresa tenga ventas gravadas y no gravadas, mostrando el coeficiente usado y su derivación | Debe |
| RF-405 | Calcular el pago a cuenta mensual del impuesto a la renta | Debe |
| RF-406 | **Mantener dos bloques paralelos: lo que SUNAT reporta y lo que el estudio tiene registrado**, con las diferencias visibles | Debe |
| RF-407 | Registrar los pagos efectuados a SUNAT por periodo | Debería |
| RF-408 | Generar los registros de compras y ventas en formato oficial | Debe |

RF-406 no es una funcionalidad avanzada: el piloto ya tiene esos dos bloques en su hoja de cálculo. Es parte del núcleo del cálculo tributario desde el día uno.

### RF-500 · Motor contable

| ID | Requisito | Prioridad |
|---|---|---|
| RF-501 | Generar asientos a partir de plantillas configurables por tipo de operación y por empresa | Debe |
| RF-502 | Validar partida doble antes de persistir cualquier asiento | Debe |
| RF-503 | Mayorizar y mantener saldos por cuenta, periodo y auxiliar | Debe |
| RF-504 | Presentar el libro mayor en formato de cuenta T | Debe |
| RF-505 | Producir la hoja de trabajo con seis pares de columnas: sumas del mayor, saldos, ajuste, inventario, resultado por función, resultado por naturaleza | Debe |
| RF-506 | Señalar el descuadre indicando qué asientos son sospechosos, no solo la diferencia | Debe |
| RF-507 | Extornar asientos mediante asiento inverso; nunca editar ni eliminar | Debe |
| RF-508 | Alternar entre vista consolidada tributaria y vista estructurada contable | Debe |

### RF-600 · Ajustes y cierre

| ID | Requisito | Prioridad |
|---|---|---|
| RF-601 | Detectar cuentas con naturaleza invertida y proponer el asiento de ajuste | Debe |
| RF-602 | Requerir aprobación humana de cada ajuste antes de mayorizarlo | Debe |
| RF-603 | Alertar cuando la cuenta de efectivo quede acreedora y sugerir el registro de financiamiento | Debe |
| RF-604 | Calcular diferencia de cambio de saldos en moneda extranjera al cierre | Debería |
| RF-605 | Ejecutar un checklist de cierre verificable antes de permitir cerrar el periodo | Debe |

### RF-700 · Módulos alimentadores

| ID | Requisito | Prioridad |
|---|---|---|
| RF-701 | Cuentas bancarias por banco y moneda, con saldo consultable al instante | Debe |
| RF-702 | Conciliación de extracto bancario | Debería |
| RF-703 | Almacén con kardex valorizado y método de valuación por empresa | Debería |
| RF-704 | Planilla y recibos por honorarios | Debería |
| RF-705 | Activo fijo con depreciación mensual automática | Debería |
| RF-706 | Multas con creación automática de adición tributaria | Debe |
| RF-707 | Documento legal de responsabilidad y cronograma de descuento en planilla | Podría |

### RF-800 · Acceso y seguridad

| ID | Requisito | Prioridad |
|---|---|---|
| RF-801 | Control de acceso por rol (RBAC) sobre acciones | Debe |
| RF-802 | Control de acceso por relación (ReBAC) sobre empresas asignadas | Debe |
| RF-803 | Separación estructural entre quien registra y quien aprueba | Debe |
| RF-804 | Bitácora inmutable de toda escritura, con usuario, momento y valores | Debe |
| RF-805 | Aislamiento verificable de datos entre estudios | Debe |

### RF-900 · Análisis

| ID | Requisito | Prioridad |
|---|---|---|
| RF-901 | Navegación desde cualquier importe hasta el documento origen | Debe |
| RF-902 | Comparativo mes contra mes por cuenta con diferencia calculada | Debe |
| RF-903 | Tablero de indicadores con gráficos | Debería |
| RF-904 | Bandeja de inconsistencias y tareas pendientes del periodo | Debe |
| RF-905 | Exportación a Excel de cualquier vista | Debe |

---

## 4 · Requisitos no funcionales

| ID | Requisito | Verificación |
|---|---|---|
| RNF-01 | Consulta de saldo bajo 300 ms en percentil 95 con 5 años de datos | Prueba de carga |
| RNF-02 | Registro de un comprobante bajo 1 s hasta confirmación | Prueba de carga |
| RNF-03 | Registro de un comprobante de 20 ítems igual o más rápido que en Excel | Prueba cronometrada con usuario real |
| RNF-04 | Generación de hoja de trabajo bajo 10 s | Prueba de carga |
| RNF-05 | Importación de 5,000 filas bajo 2 min, en segundo plano con avance visible | Prueba de carga |
| RNF-06 | Cero uso de punto flotante en cálculos monetarios | Revisión de código y prueba de propiedad |
| RNF-07 | Todo modelo de lectura reconstruible desde el libro diario | Trabajo nocturno de verificación |
| RNF-08 | Asiento mayorizado inmutable a nivel de permisos de base de datos | Prueba de intrusión |
| RNF-09 | Máximo dos clics a cualquier función frecuente | Auditoría de navegación |
| RNF-10 | Empresa activa visible en todo momento | Revisión de diseño |
| RNF-11 | Escalamiento horizontal sin cambios de modelo de datos hasta 1,000 empresas | Prueba de carga con datos sintéticos |
| RNF-12 | Cifrado en tránsito y en reposo de datos tributarios | Revisión de seguridad |

---

## 5 · Fuera de alcance

- Emisión de comprobantes electrónicos.
- Presentación automática de declaraciones ante SUNAT.
- Regímenes tributarios distintos de General y MYPE en la versión 1.
- Contabilidad de costos industriales avanzada.
- Módulo comercial de precios y márgenes.
- Mercados fuera de Perú.

---

## 6 · Criterio de lanzamiento

**Versión mínima viable:** una asistente puede llevar una empresa completa durante un mes sin abrir Excel, y producir el registro de compras, el registro de ventas y el cálculo tributario que hoy produce a mano, con la misma velocidad o mayor.

**Prueba de aceptación:** operación en paralelo durante dos meses sobre una empresa real. Los números deben coincidir al céntimo con la hoja de cálculo. Si no coinciden, no hay lanzamiento.

---

## 7 · Decisiones pendientes de producto

| # | Pregunta | Bloquea |
|---|---|---|
| PD-01 | ¿La suscripción se cobra por estudio, por empresa gestionada o por usuario? | Modelo de facturación |
| PD-02 | ¿Qué tan estandarizada está la plantilla entre estudios distintos? | Riesgo de que el producto sirva solo al piloto |
| PD-03 | ¿Calculamos la planilla completa o solo registramos el resumen? | Esfuerzo del módulo, factor 10 |
| PD-04 | ¿Se guardan credenciales de SUNAT para automatizar descargas? | Diseño de integración y custodia de secretos |
| PD-05 | ¿Requisito de residencia de datos en Perú? | Región de nube |
