# TASKS: Tareas Atómicas de Construcción - Catálogo de Cuentas (PCGE)

> **Módulo:** Plan Contable General Empresarial (PCGE) / Catálogo por Empresa
> **Especificación:** `specs/catalogo-cuentas/spec.md`
> **Plan:** `specs/catalogo-cuentas/plan.md`
> **Ejecutor:** AGY (Antigravity CLI) o Asistente AI
> **Directorio de Trabajo:** `d:\Chambas\SaasContable`

---

## Roadmap de Tareas

- [x] **[TASK-01]** Modelo de Datos Extendido y Estado Multi-Catálogo en `AccountingContext.jsx`
- [x] **[TASK-02]** Motor Parser y Normalizador JSON con SheetJS (`src/utils/excelParser.js`)
- [x] **[TASK-03]** Motor de Semáforo y Auditoría de Integridad Contable (`src/utils/planContableValidator.js`)
- [x] **[TASK-04]** Generador y Descargador de Plantilla Oficial Excel (`src/utils/excelTemplateGenerator.js`)
- [x] **[TASK-05]** Modal de Auditoría, Previsualización y Aprobación de Plan (`src/components/ModalAuditoriaPlan.jsx`)
- [x] **[TASK-06]** Modal de Clonado de Catálogo entre Empresas del Estudio (`src/components/ModalClonarPlan.jsx`)
- [x] **[TASK-07]** Modal de Mantenimiento de Cuenta con Amarres y Tipo de Análisis (`src/components/ModalCuenta.jsx`)
- [x] **[TASK-08]** Integración Completa en `PlanContableView.jsx` (Todos los botones activos) y Build Limpio (`npm run build`)

---

## Detalle de Tareas para Ejecución

### [TASK-01] Modelo de Datos Extendido y Estado Multi-Catálogo
- **Objetivo:** Actualizar `src/types/accounting.d.ts` y `src/context/AccountingContext.jsx` para soportar `tipoAnalisis`, `ajusteDiferenciaCambio`, y los métodos de gestión de planes contables por empresa.
- **Archivos:** `src/types/accounting.d.ts`, `src/context/AccountingContext.jsx`.
- **Criterios de Aceptación (DoD):**
  - Interfaz `CuentaContable` incluye campos: `tipoAnalisis` (`"Por Documento / RUC" | "Banco / Conciliación" | "Centro de Costos" | "Solo Monto / Sin Análisis"`), `ajusteDiferenciaCambio: boolean`, y `tieneMovimientos: boolean`.
  - Métodos implementados y exportados en `AccountingContext`:
    - `aplicarPlanContable(empresaId, cuentas, modo: 'REEMPLAZAR' | 'FUSIONAR')`
    - `clonarPlanContable(empresaOrigenId, empresaDestinoId)`
    - `guardarCuenta(empresaId, cuentaData)`
    - `eliminarCuenta(empresaId, codigo)`

---

### [TASK-02] Motor Parser y Normalizador JSON con SheetJS
- **Objetivo:** Refinar `src/utils/excelParser.js` para procesar archivos `.xlsx` y `.csv` en el navegador y convertirlos a un array JSON canónico estandarizado.
- **Archivos:** `src/utils/excelParser.js`.
- **Criterios de Aceptación (DoD):**
  - Lee dinámicamente columnas `CUENTA` (o `CODIGO`), `DESCRIPCION`, `MONEDA`, `AMARRE_1`, `AMARRE_2`, `TIPO_ANALISIS`, `EXIGE_CC`.
  - Normaliza códigos limpiando espacios y signos extraños.
  - Asigna `elemento` (primer dígito 1 a 9), `nivel` según longitud, y determina `esCuentaU: true` si la longitud es $\ge 6$ dígitos o no tiene subcuentas hijas.
  - Manejo de excepciones y errores si el archivo no es un Excel válido.

---

### [TASK-03] Motor de Semáforo y Auditoría de Integridad Contable
- **Objetivo:** Crear `src/utils/planContableValidator.js` con funciones puras para diagnosticar la salud contable del plan antes de aprobarlo.
- **Archivos a crear:** `src/utils/planContableValidator.js`.
- **Criterios de Aceptación (DoD):**
  - Función `auditarPlanContable(cuentas)` que calcula:
    - `totalCuentas`, `cuentasU`, `cuentasSinteticas`.
    - `amarresValidos`, `amarresHuerfanos` (cuentas destino que no existen en el catálogo).
    - `cuentasHuerfanas` (cuentas de nivel analítico cuyos ancestros padre no existen).
    - Array de `alertas` con tipos `success`, `warning`, `error`.
  - Función `autoGenerarCuentasPadre(cuentas)` que crea automáticamente los ancestros sintéticos de las cuentas huérfanas.

---

### [TASK-04] Generador y Descargador de Plantilla Oficial Excel
- **Objetivo:** Crear `src/utils/excelTemplateGenerator.js` para generar dinámicamente en el cliente el archivo `Plantilla_PCGE_Estandar.xlsx` con formato oficial.
- **Archivos a crear:** `src/utils/excelTemplateGenerator.js`.
- **Criterios de Aceptación (DoD):**
  - Genera libro Excel con cabeceras: `CUENTA`, `DESCRIPCION`, `NIVEL`, `MONEDA`, `AMARRE_1_DEBE`, `AMARRE_2_HABER`, `TIPO_ANALISIS`, `EXIGE_CC`.
  - Incluye al menos 6 filas de ejemplo representativas (Caja, Facturas por Cobrar, Mercaderías, Proveedores, Gastos por Servicios, Amarres de destino 94/79).
  - Función `descargarPlantillaExcel()` que dispara la descarga directa en el navegador.
  - Función `exportarPlanAExcel(cuentas, nombreArchivo)` para exportar el catálogo activo.

---

### [TASK-05] Modal de Auditoría, Previsualización y Aprobación
- **Objetivo:** Crear el componente `src/components/ModalAuditoriaPlan.jsx` que muestra el resultado del Excel parseado antes de guardarlo en la empresa.
- **Archivos a crear:** `src/components/ModalAuditoriaPlan.jsx`.
- **Criterios de Aceptación (DoD):**
  - Tarjetas de métricas: Total Cuentas, Cuentas U, Cuentas con Amarre, Inconsistencias.
  - Semáforo de Alertas visual (Verde / Amarillo / Rojo).
  - Botón interactivo "Autogenerar padres sintéticos" si se detectan cuentas huérfanas.
  - Tabla con buscador para explorar las cuentas leídas del Excel.
  - Selector de modo: `[Reemplazo Total]` vs `[Fusión (Merge)]`.
  - Botón verde **"✅ Aprobar y Aplicar Plan"** (aplica el plan en la empresa activa y cierra el modal).
  - Botón **"❌ Descartar"** (cancela la operación sin tocar la empresa).

---

### [TASK-06] Modal de Clonado de Catálogo entre Empresas
- **Objetivo:** Crear `src/components/ModalClonarPlan.jsx` para copiar el plan de otra empresa cliente del estudio.
- **Archivos a crear:** `src/components/ModalClonarPlan.jsx`.
- **Criterios de Aceptación (DoD):**
  - Desplegable con las empresas del estudio registradas (excepto la empresa activa actual).
  - Muestra el nombre comercial, RUC y cantidad de cuentas activas de la empresa seleccionada.
  - Botón "Clonar Plan Contable" que copia las cuentas a la empresa activa y muestra mensaje de éxito.

---

### [TASK-07] Modal de Mantenimiento de Cuenta con Amarres
- **Objetivo:** Crear o mejorar el modal para crear nueva cuenta o editar una existente.
- **Archivos a crear/modificar:** `src/components/ModalCuenta.jsx`.
- **Criterios de Aceptación (DoD):**
  - Breadcrumb jerárquico superior (ej. `6 GASTOS > 63 SERVICIOS > 631 TRANSPORTE`).
  - Inputs para Código y Denominación.
  - Selector de `Tipo de Análisis` (Documento/RUC, Banco/Cta Cte, Centro de Costos, Solo Monto).
  - Selectores o inputs predictivos para `Amarre 1 (Debe)` y `Amarre 2 (Haber)` con validación de existencia en el catálogo.
  - Switches para `Cuenta de Uso (U)`, `Requiere CC` y `Ajuste por Dif. de Cambio`.
  - Guardado reactivo en el contexto de la empresa activa.

---

### [TASK-08] Integración en `PlanContableView.jsx` y Build Limpio
- **Objetivo:** Conectar todos los botones de la barra superior y verificar que ningún botón esté inerte o sin funcionalidad.
- **Archivos a modificar:** `src/views/PlanContableView.jsx`, `src/App.jsx`.
- **Criterios de Aceptación (DoD):**
  - Botón **"📥 Descargar Plantilla"**: Descarga `Plantilla_PCGE_Estandar.xlsx`.
  - Botón **"📤 Subir Excel"**: Abre file input y luego el `ModalAuditoriaPlan`.
  - Botón **"📋 Copiar Plan"**: Abre `ModalClonarPlan`.
  - Botón **"💾 Exportar Catálogo"**: Descarga el Excel/JSON del plan activo.
  - Botón **"➕ Nueva Cuenta"**: Abre `ModalCuenta` en modo creación.
  - Pestañas de Elementos (1 a 9) y filtros rápidos (`Solo U`, `Solo Amarres`, `Solo Dólares`) operan en tiempo real.
  - `npm run build` ejecuta con 0 errores de compilación y advertencias.
