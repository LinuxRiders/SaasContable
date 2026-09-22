# 08 · Roadmap y Backlog

> **Qué es:** el plan de entrega y las historias. En big tech el roadmap se compromete por trimestre y se detalla solo el trimestre en curso; lo demás son intenciones, no promesas.
> **Dueño:** producto · **Revisión:** el backlog cada quincena, el roadmap cada trimestre · **Estado:** vivo

---

## 1 · Roadmap por trimestres

Solo Q1 está comprometido. Q2 en adelante es dirección, no compromiso.

| Trimestre | Objetivo | Cómo se sabe que se logró |
|---|---|---|
| **Q1 — comprometido** | Una asistente lleva una empresa completa un mes sin abrir Excel | Registro de compras, ventas y cálculo tributario en paralelo con el Excel, coincidiendo al céntimo |
| **Q2 — dirección** | El motor contable produce libros y hoja de trabajo | El contador cierra un mes en el sistema |
| **Q3 — dirección** | Módulos alimentadores y ajustes automáticos | Tesorería, almacén, planilla, activo fijo. Ajustes propuestos y aprobados |
| **Q4 — dirección** | Segundo y tercer estudio en producción | El producto funciona sin código específico para el piloto |

### Secuencia y por qué

La intuición diría empezar por el motor contable, porque es el corazón. Es un error: **el motor sin datos es una demostración vacía.** Las propias asistentes formularon la secuencia correcta al pedir "primero gastos, ingresos, hasta sacar los mensuales, y a partir de ahí ya podríamos pasar a lo otro". Además esa es la parte que produce valor semanal y genera el insumo de todo lo demás.

---

## 2 · Épicas

| Épica | Trimestre | Nivel de riesgo | Estado |
|---|---|---|---|
| E1 · Cimientos: estudio, empresa, PCGE, usuarios, periodos | Q1 | 2 | Listo para construir |
| E2 · Registro de compras | Q1 | 2 | Listo para construir |
| E3 · Registro de ventas | Q1 | 2 | Listo para construir |
| E4 · Determinación tributaria mensual | Q1 | 3 | **Bloqueado por RN-057** |
| E5 · Conciliación SIRE | Q1 | 2 | Bloqueado por SPIKE-004 |
| E6 · Motor de asientos | Q2 | 3 | Requiere DD-01 y confirmación de tipos de asiento |
| E7 · Libros y hoja de trabajo | Q2 | 3 | Requiere E6 |
| E8 · Ajustes y cierre | Q3 | 3 | Requiere catálogo completo de ajustes |
| E9 · Módulos alimentadores | Q3 | 2 | — |
| E10 · Análisis y tablero | Q3 | 1 | — |

---

## 3 · Definition of Ready

Una historia entra a un sprint solo si cumple todo:

- [ ] Criterios de aceptación escritos y verificables
- [ ] Nivel de riesgo asignado (1, 2 o 3)
- [ ] Si es nivel 3: design doc aprobado y spike ejecutado
- [ ] Las reglas del registro que toca están en 🟢
- [ ] No depende de una pregunta abierta
- [ ] Cabe en un sprint
- [ ] Datos de prueba identificados: qué filas de qué Excel del cliente

## 4 · Definition of Done

- [ ] Revisión de código por al menos un par
- [ ] Pruebas automatizadas; si es nivel 3, sobre casos reales de los Excel
- [ ] Los importes coinciden al céntimo con el Excel de referencia (nivel 3)
- [ ] Desplegado tras feature flag en ambiente de pruebas
- [ ] Cada regla implementada referencia su ID en código y en prueba
- [ ] Runbook actualizado si aplica
- [ ] **Alguien del estudio la usó y no la rechazó**
- [ ] Métricas instrumentadas

El penúltimo punto es el que evita repetir la historia del sistema comercial que el estudio compró y usa marginalmente.

---

## 5 · Historias del Q1

### E1 · Cimientos

---

**H-001 · Alta de estudio y empresa**

**Como** administrador de plataforma
**quiero** dar de alta un estudio contable y sus empresas cliente
**para** que empiecen a operar

**Riesgo:** 2 · **Reglas:** RN-010

**Criterios de aceptación**
- Dado un RUC válido de 11 dígitos, cuando se registra la empresa, entonces se valida el dígito verificador y se rechaza si es inválido
- Dado un RUC ya registrado en el mismo estudio, cuando se intenta registrar de nuevo, entonces el sistema lo rechaza
- Dada una empresa creada, cuando se consulta, entonces muestra razón social, régimen tributario y ejercicio activo
- Dado un usuario de otro estudio, cuando consulta esta empresa, entonces recibe un error de no encontrado, no de sin permiso

**Datos de prueba:** los tres RUC del piloto.

---

**H-002 · Catálogo maestro del PCGE**

**Como** administrador de plataforma
**quiero** cargar el PCGE completo una sola vez
**para** que todas las empresas lo compartan

**Riesgo:** 2 · **Reglas:** RN-006, RN-008, RN-010

**Criterios de aceptación**
- Dado el archivo del PCGE, cuando se importa, entonces se cargan 1,705 cuentas con la distribución observada: 81 de 2 dígitos, 322 de 3, 656 de 4, 646 de 5
- Dada una cuenta cualquiera, cuando se consulta, entonces su elemento se deriva del primer dígito y su destino en estados del elemento
- Dada una cuenta con hijas, cuando se intenta marcar como imputable, entonces el sistema lo impide
- Dada una cuenta de 5 dígitos sin hijas, cuando se consulta, entonces es imputable

**Datos de prueba:** hoja CTAS de cualquiera de los tres libros.

---

**H-003 · Activación de cuentas por empresa**

**Como** contador
**quiero** marcar qué cuentas del PCGE usa cada empresa
**para** que la interfaz no muestre 1,705 opciones

**Riesgo:** 2 · **Reglas:** RN-010

**Criterios de aceptación**
- Dada una empresa nueva, cuando se crea, entonces hereda el conjunto de cuentas activas del estudio
- Dada una cuenta activa con movimientos, cuando se intenta desactivar, entonces el sistema lo impide
- Dada una cuenta no activa, cuando se intenta imputar sobre ella, entonces se rechaza

---

**H-004 · Usuarios, roles y asignación de empresas**

**Como** titular del estudio
**quiero** crear usuarios y asignarles empresas
**para** que cada quien vea solo lo suyo

**Riesgo:** 2 · **Reglas:** RN-014 relacionada

**Criterios de aceptación**
- Dado un asistente asignado a dos empresas, cuando lista empresas, entonces ve exactamente esas dos
- Dado un asistente, cuando intenta cerrar un periodo, entonces el sistema lo rechaza por rol
- Dado un gerente de empresa, cuando accede, entonces ve solo lectura de su empresa
- Dado un usuario sin asignación a una empresa, cuando consulta sus datos por identificador directo, entonces recibe no encontrado

---

**H-005 · Apertura y cierre de periodos**

**Riesgo:** 3 · **Reglas:** RN-014, RN-015

**Criterios de aceptación**
- Dado un periodo abierto, cuando se registra un asiento con fecha de ese periodo, entonces se acepta
- Dado un periodo cerrado, cuando se intenta registrar un asiento con fecha de ese periodo, entonces se rechaza con mensaje explícito
- Dado un periodo con checklist incompleto, cuando se intenta cerrar, entonces se lista qué falta
- Dado un periodo cerrado, cuando se reabre, entonces exige motivo y queda registrado en la bitácora

---

**H-006 · Parámetros legales versionados**

**Riesgo:** 3 · **Reglas:** RN-064, ADR-012

**Criterios de aceptación**
- Dado un parámetro con dos vigencias, cuando se calcula una operación de una fecha, entonces se usa el vigente a esa fecha
- Dada una operación anterior a la primera vigencia registrada, cuando se calcula, entonces el sistema lo rechaza en vez de asumir un valor
- Dado un cambio de tasa de IGV, cuando se recalcula un periodo antiguo, entonces el resultado no cambia

---

### E2 · Registro de compras

---

**H-010 · Registro de comprobante con consulta de RUC**

**Riesgo:** 2 · **Reglas:** RN-023, RN-032, RN-033, RN-034

**Criterios de aceptación**
- Dado un RUC, cuando se ingresa, entonces se completa la razón social consultando el servicio de SUNAT
- Dado que el servicio no responde, cuando se ingresa el RUC, entonces permite digitar la razón social manualmente y marca el registro como no verificado
- Dado un tipo de comprobante, cuando se selecciona, entonces proviene de la Tabla 10 de SUNAT
- Dado un comprobante ya registrado con igual proveedor, tipo, serie y número, cuando se intenta registrar, entonces se rechaza

---

**H-011 · Cálculo automático de IGV por línea**

**Riesgo:** 3 · **Reglas:** RN-022, RN-024, RN-064

**Criterios de aceptación**
- Dada una línea gravada con base 415467.01, cuando se confirma, entonces el IGV es 74784.06 y el total 490251.07
- Dada una línea no gravada, cuando se confirma, entonces el IGV es 0.00 y el total igual a la base
- Dado un comprobante anterior a un cambio de tasa, cuando se calcula, entonces usa la tasa vigente a la fecha de emisión
- Dada una base de 0, cuando se confirma, entonces se rechaza con mensaje explícito
- Dado un comprobante con líneas gravadas y no gravadas, cuando se totaliza, entonces cada bloque suma por separado

**Datos de prueba:** primeras 50 filas de la hoja GASTOS de Maralesa 2026.

---

**H-012 · Los dos ejes: cuenta destino y afectación**

**Riesgo:** 3 · **Reglas:** RN-021, RN-017, RN-018, RN-019

**Criterios de aceptación**
- Dada una línea, cuando se registra, entonces se pide cuenta destino y afectación tributaria como campos separados
- Dada una línea con cuenta 67 y afectación no gravada, cuando se confirma, entonces se acepta
- Dada una línea con cuenta 60 y afectación importación, cuando se confirma, entonces se acepta
- Dada una línea sin cuenta destino, cuando se confirma, entonces se rechaza
- Dada una cuenta destino no activa en la empresa, cuando se selecciona, entonces no aparece en la lista

Este es el criterio que evita el error de modelado corregido en ADR-011.

---

**H-013 · Tres fechas independientes**

**Riesgo:** 3 · **Reglas:** RN-011, RN-012, RN-013

**Criterios de aceptación**
- Dado un comprobante, cuando se registra, entonces admite fecha de emisión, de vencimiento y mes de declaración por separado
- Dada una fecha de cancelación anterior a la de emisión, cuando se confirma, entonces se rechaza
- Dado un mes de declaración posterior al de emisión, cuando se confirma, entonces se acepta y se exige justificación
- Dado un comprobante sin fecha de cancelación, cuando se consulta la antigüedad de deuda, entonces aparece como pendiente

---

**H-014 · Bancarización**

**Riesgo:** 2 · **Reglas:** RN-026

**Criterios de aceptación**
- Dado un comprobante, cuando se registra el pago, entonces admite banco, fecha de operación, número de operación y monto
- Dado un total superior al umbral vigente sin medio de pago, cuando se confirma, entonces se marca con observación y no otorga crédito fiscal
- Dado el umbral como parámetro, cuando cambia por norma, entonces los comprobantes antiguos conservan su evaluación original

---

**H-015 · Moneda extranjera y tipo de cambio**

**Riesgo:** 3 · **Reglas:** RN-027, RN-031

**Criterios de aceptación**
- Dado un comprobante en dólares, cuando se registra, entonces exige tipo de cambio
- Dado el tipo de cambio publicado para la fecha, cuando se registra, entonces se carga automáticamente
- Dada una fecha sin publicación (feriado o fin de semana), cuando se registra, entonces aplica la regla definida y muestra qué fecha usó
- Dado un comprobante en moneda extranjera, cuando se consulta, entonces conserva tanto el importe original como el convertido

---

**H-016 · Detracción, percepción y retención**

**Riesgo:** 2 · **Reglas:** RN-029, RN-030

---

**H-017 · Importación masiva desde Excel**

**Riesgo:** 2 · **Reglas:** RN-084

**Criterios de aceptación**
- Dado un archivo con el formato del estudio, cuando se importa, entonces se procesa en segundo plano con avance visible
- Dadas filas con errores, cuando se importa, entonces se cargan las válidas y se reporta cada rechazo con su motivo y número de fila
- Dado el mismo archivo importado dos veces, cuando se procesa, entonces no se duplican comprobantes
- Dado un archivo de 5,000 filas, cuando se importa, entonces termina en menos de 2 minutos

---

**H-018 · Búsqueda por descripción de ítem**

**Riesgo:** 1 · **Reglas:** RN-085

---

### E3 · Registro de ventas

**H-020** a **H-024**: estructura paralela a compras, con cuentas de ingreso 70, 75, 76, 77, más bloque de regularizaciones separado y soporte de exportaciones sin IGV.

---

### E4 · Determinación tributaria

**Bloqueada hasta que SPIKE-001 resuelva RN-057.**

---

**H-030 · Cuadro mensual por casillas**

**Riesgo:** 3 · **Reglas:** RN-060

**Criterios de aceptación**
- Dado un mes con compras y ventas registradas, cuando se genera el cuadro, entonces produce las casillas 100, 101, 105, 107, 108, 120 y 157
- Dado el cuadro generado, cuando se compara con la hoja CALCULO IMP. del Excel del mismo mes, entonces coincide al céntimo
- Dada una casilla cualquiera, cuando se hace clic, entonces se listan los comprobantes que la componen

**Datos de prueba:** enero a junio de 2026 de Maralesa; año 2023 de Llamas Romero.

---

**H-031 · Arrastre de crédito fiscal**

**Riesgo:** 3 · **Reglas:** RN-053, RN-054

**Criterios de aceptación**
- Dado un mes con crédito mayor que débito, cuando se determina, entonces el saldo se arrastra al mes siguiente
- Dada una secuencia de meses, cuando se recalcula desde el primero, entonces los arrastres encadenan igual que en el Excel de referencia

---

**H-032 · Prorrata**

**Riesgo:** 3 · **Reglas:** RN-055, RN-056, RN-057 🔴

**No entra a sprint hasta que RN-057 esté en 🟢.**

---

**H-033 · Conciliación SUNAT contra registros**

**Riesgo:** 3 · **Reglas:** RN-061

**Criterios de aceptación**
- Dado un mes, cuando se consulta, entonces se muestran dos bloques paralelos con las mismas casillas: lo declarado según SUNAT y lo registrado por el estudio
- Dada una diferencia entre bloques, cuando se consulta, entonces se resalta y se puede navegar a los comprobantes que la explican

---

## 6 · Métricas de producto

| Métrica | Línea base | Meta | Cómo se mide |
|---|---|---|---|
| Tiempo de consulta de saldo | Medio día a dos días | Menos de 10 s | Instrumentación |
| Tiempo de registro de un comprobante de 20 ítems | Por medir en SPIKE-005 | Igual o menor que en Excel | Cronómetro |
| Discrepancias con SIRE detectadas antes de declarar | Sin cobertura garantizada | 100% | Conteo mensual |
| Multas atribuibles a un cálculo del sistema | — | **Cero** | Reporte del estudio |
| Días para cerrar un mes | Por medir | Reducción del 50% | Instrumentación |
