# PLAN: Catálogo de Cuentas Contables (PCGE), Importación Inteligente y Parametrización Avanzada

> **Módulo:** Plan Contable General Empresarial (PCGE) / Catálogo por Empresa
> **Especificación:** `specs/catalogo-cuentas/spec.md`
> **Constitución:** `docs/constitution.md`

---

## 1. Resumen Arquitectónico

El subsistema de catálogo de cuentas se divide en 3 capas desacopladas:
1. **Capa de Dominio y Utilidades Puras (`src/utils/`):**
   - `excelParser.js`: Utiliza `xlsx` (SheetJS) en el cliente para parsear archivos binarios a objetos canónicos JSON.
   - `planContableValidator.js`: Funciones puras para validar amarres huérfanos, jerarquías rotas, coherencia de partida doble y autogeneración de cuentas sintéticas.
   - `excelTemplateGenerator.js`: Genera y descarga el archivo Excel oficial con estilos y filas de ejemplo mediante SheetJS.
2. **Capa de Estado Central (`src/context/AccountingContext.jsx`):**
   - Maneja el diccionario `planesPorEmpresa[empresaId]` reactivo.
   - Métodos: `aplicarPlanContable(empresaId, nuevoPlan, modo)`, `clonarPlanContable(empresaOrigenId, empresaDestinoId)`, `guardarCuenta(empresaId, cuenta)`.
3. **Capa de Presentación y Modales (`src/views/` y `src/components/`):**
   - `PlanContableView.jsx`: Vista principal con métricas, tabs por elemento (1-9), filtros interactivos y barra de botones activa.
   - `ModalAuditoriaPlan.jsx`: Modal de previsualización y aprobación del Excel con semáforo y modo Reemplazo/Fusión.
   - `ModalClonarPlan.jsx`: Modal para copiar catálogo desde otra empresa del estudio.
   - `ModalCuenta.jsx`: Modal de mantenimiento con amarres y tipos de análisis.

---

## 2. Constitution Check (docs/constitution.md)

| Principio | Cumplimiento | Justificación |
|---|:---:|---|
| **I. Un Solo Núcleo** | ✅ CUMPLE | El catálogo resultante alimenta directamente a los módulos de Compras, Ventas, Libros y Liquidación. |
| **II. Prototipo Funcional Realista** | ✅ CUMPLE | Todos los botones son 100% operativos: descarga de plantilla real en Excel, subida real con SheetJS, modal de auditoría interactivo. |
| **III. Dominio Puro y Aislado** | ✅ CUMPLE | La validación de amarres y jerarquía son funciones puras en `planContableValidator.js` sin dependencias de React. |
| **IV. Identidad y Segregación** | ✅ CUMPLE | Cada empresa tiene su propio catálogo aislado en `planesPorEmpresa[empresaId]`. |
| **VI. Simplicidad y Stack Acotado** | ✅ CUMPLE | No se agregan librerías externas pesadas. Se aprovecha SheetJS (`xlsx`) ya instalado y los tokens de `theme.css`. |
| **VII. Coherencia Visual** | ✅ CUMPLE | Diseño moderno con semáforos visuales (verde/amarillo/rojo), badges de tipo `U`, cards con métricas y modales estilizados. |

---

## 3. Desglose de Componentes a Modificar y Crear

### A. Utilidades de Dominio
1. **`src/utils/excelParser.js` (ACTUALIZAR):**
   - `parsearExcelACuentas(buffer)`: Convierte el Excel a array de objetos crudos.
   - `normalizarCuentasJSON(filas)`: Limpia strings, deduce elemento (primer dígito), calcula nivel y marca `esCuentaU: true` si $\ge 6$ dígitos o no tiene hijas.
2. **`src/utils/planContableValidator.js` (NUEVO):**
   - `auditarPlanContable(cuentas)`: Retorna diagnóstico completo:
     - `totalCuentas`, `cuentasU`, `cuentasSinteticas`.
     - `amarresValidos`, `amarresHuerfanos` (destinos inexistentes).
     - `cuentasHuerfanas` (cuentas sin padre).
     - `alertas`: array con `{ tipo: 'error'|'warning'|'success', mensaje, cuentasInvolucradas }`.
   - `autoGenerarCuentasPadre(cuentas)`: Genera cuentas sintéticas para los códigos que no tengan ancestros.
3. **`src/utils/excelTemplateGenerator.js` (NUEVO):**
   - `descargarPlantillaExcel()`: Crea con `xlsx` un libro de trabajo con cabeceras estándar, 5 filas de ejemplo comentadas y dispara la descarga en el navegador.
   - `exportarPlanAExcel(cuentas, nombreArchivo)`: Exporta el catálogo activo a `.xlsx`.

### B. Estado en `src/context/AccountingContext.jsx`
- Acciones a incorporar:
  - `aplicarPlanContable(empresaId, cuentas, modo)`:
    - Si `modo === 'REEMPLAZAR'`: reemplaza todo el catálogo.
    - Si `modo === 'FUSIONAR'`: agrega cuentas nuevas y actualiza nombres respetando saldos existentes.
  - `clonarPlanContable(empresaOrigenId, empresaDestinoId)`: copia profunda del catálogo de una empresa a otra.
  - `guardarCuenta(empresaId, cuentaData)`: crea o actualiza una cuenta individual.
  - `eliminarCuenta(empresaId, codigo)`: elimina la cuenta si no tiene movimientos registrados.

### C. Componentes de UI
1. **`src/components/ModalAuditoriaPlan.jsx` (NUEVO):**
   - Cabecera con resumen y badge de estado.
   - Panel de métricas KPI: Total leídas, Cuentas U, Cuentas con Amarre, Inconsistencias.
   - Panel de Alertas del Semáforo con badges explicativos y botón de solución rápida ("Autogenerar padres").
   - Tabla interactiva con paginación/scroll y buscador para revisar las cuentas antes de aprobar.
   - Selector de modo: `[Reemplazo Total]` vs `[Fusión (Merge)]`.
   - Botón destacado **"✅ Aprobar y Aplicar Plan"** y **"❌ Descartar"**.
2. **`src/components/ModalClonarPlan.jsx` (NUEVO):**
   - Selector desplegable de empresas del estudio disponibles.
   - Vista previa del número de cuentas de la empresa seleccionada.
   - Botón "Clonar Plan a la Empresa Activa".
3. **`src/components/ModalCuenta.jsx` (NUEVO o Refactorizado):**
   - Formulario completo para editar o crear cuenta.
   - Selectores predictivos para Amarre 1 (Debe) y Amarre 2 (Haber).
   - Selector de `Tipo de Análisis` (Documento/RUC, Banco, Centro Costos, Solo Monto).
   - Switches de `Cuenta de Uso (U)`, `Requiere CC` y `Ajuste Dif. Cambio`.
4. **`src/views/PlanContableView.jsx` (ACTUALIZAR):**
   - Conectar todos los botones de la barra superior:
     - "📥 Descargar Plantilla" $\rightarrow$ `descargarPlantillaExcel()`
     - "📤 Subir Excel" $\rightarrow$ input file hidden $\rightarrow$ abre `ModalAuditoriaPlan`
     - "📋 Copiar Plan" $\rightarrow$ abre `ModalClonarPlan`
     - "💾 Exportar Catálogo" $\rightarrow$ genera Excel/JSON
     - "➕ Nueva Cuenta" $\rightarrow$ abre `ModalCuenta` en modo creación
   - Pestañas por elemento (1 al 9) y filtros rápidos (`Solo U`, `Solo Amarres`, `Solo Dólares`).

---

## 4. Escenarios de Demostración y Validación

1. **Escenario 1 (Descarga de Plantilla):**
   - Hacer clic en "Descargar Plantilla Excel" $\rightarrow$ El navegador descarga inmediatamente `Plantilla_PCGE_Estandar.xlsx` con columnas y ejemplos.
2. **Escenario 2 (Importación con Auditoría y Aprobación):**
   - Hacer clic en "Subir Excel" $\rightarrow$ Seleccionar archivo $\rightarrow$ Se abre el `ModalAuditoriaPlan`.
   - Verificar que el semáforo calcule las métricas y liste las alertas.
   - Elegir modo "Reemplazo Total" o "Fusión".
   - Presionar "Aprobar y Aplicar Plan" $\rightarrow$ El catálogo de la empresa se actualiza y la tabla principal refleja las cuentas importadas.
3. **Escenario 3 (Clonado entre Empresas):**
   - Cambiar a una empresa vacía $\rightarrow$ Pulsar "Copiar Plan desde Otra Empresa" $\rightarrow$ Elegir "Pollería El Carbón" $\rightarrow$ Confirmar $\rightarrow$ El catálogo se clona en 1 segundo.
4. **Escenario 4 (Mantenimiento de Cuenta y Amarres):**
   - En una cuenta de gasto (ej. `6311`), presionar "Editar" $\rightarrow$ Cambiar amarres y tipo de análisis a "Centro de Costos" $\rightarrow$ Guardar $\rightarrow$ Se actualiza reactivamente.
