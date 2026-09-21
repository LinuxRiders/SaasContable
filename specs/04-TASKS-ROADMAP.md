# 04 — ROADMAP: Tareas de Implementación para AGY

> **Ejecutor:** AGY (Antigravity CLI)
> **Modo:** Terminal / Paso a Paso
> **Contexto:** `d:\Chambas\SaasContable`

---

## Tareas Atómicas de Construcción

### [TASK-01] Modelo de Tipos y Estado Central de Empresas y Plan
- **Objetivo:** Crear/actualizar los tipos de datos en TypeScript/JavaScript y el contexto de estado de React.
- **Archivos:** `src/context/AccountingContext.jsx`, `src/types/accounting.d.ts` (si aplica).
- **Criterios de Aceptación (DoD):**
  - Manejo de empresa activa seleccionable.
  - Soporte para las 3 opciones de inicialización de catálogo: PCGE default, importación de Excel, o plan en blanco.
  - Persistencia de datos en estado reactivo sin recarga de página.

---

### [TASK-02] Parser e Importador Real de `PlanContable.xlsx`
- **Objetivo:** Instalar e integrar `xlsx` (SheetJS) en el frontend para leer directamente `PlanContable.xlsx`.
- **Archivos:** `src/utils/excelParser.js`, `src/views/PlanContableView.jsx`.
- **Criterios de Aceptación (DoD):**
  - Lee las columnas `CUENTA`, `DESCRIPCION`, `MONEDA`, `AMARRE_1`, `AMARRE_2`, `RUBROS`, `DIGITO`.
  - Asigna automáticamente `elemento` (1-9) y `esCuentaU` según la profundidad del código.
  - Permite cargar el archivo local `d:\Chambas\SaasContable\PlanContable.xlsx` o subir cualquier archivo de catálogo externo vía botón "Importar Excel".

---

### [TASK-03] UI de Gestión y Registro de Empresas
- **Objetivo:** Perfeccionar la pantalla de Cartera de Empresas y el modal de creación con selección de Plan Contable.
- **Archivos:** `src/views/EmpresasView.jsx`, `src/components/Modal.jsx`.
- **Criterios de Aceptación (DoD):**
  - Muestra la tabla de empresas con estado, RUC, régimen y catálogo asignado.
  - Modal de 3 pasos para dar de alta una nueva empresa permitiendo elegir entre: PCGE 2026 oficial, Subir Excel, o Iniciar en blanco.
  - Al cambiar de empresa activa, el Plan Contable reflejado cambia dinámicamente.

---

### [TASK-04] UI del Plan Contable y Mantenimiento de Cuentas (Amarres)
- **Objetivo:** Visualizador jerárquico por elementos (1 a 9) y modal de edición de cuenta.
- **Archivos:** `src/views/PlanContableView.jsx`.
- **Criterios de Aceptación (DoD):**
  - Pestañas funcionales para filtrar por Elemento (1 a 9) y búsqueda por código/nombre.
  - Indicador visual claro de cuenta de uso `U` vs cuenta sintética.
  - Modal de Mantenimiento de Cuenta con configuración de Amarres Automáticos (Debe/Haber) y Centro de Costos.

---

### [TASK-05] Motor Lógico de Mapeo y Determinación Debe/Haber
- **Objetivo:** Implementar la función pura `generarAsientoContable(transaccion, planContable)` con reglas contables peruanas y amarres automáticos.
- **Archivos:** `src/utils/accountingEngine.js`.
- **Criterios de Aceptación (DoD):**
  - Resuelve la cuenta `U` a partir del concepto o tipo de operación.
  - Aplica la lógica de Debe y Haber de forma matemáticamente exacta.
  - Genera automáticamente los apuntes de destino para cuentas de Clase 6 (ej. 60 ➔ 20/61 o 63 ➔ 94/79).
  - Valida partida doble estricta y emite alerta detallada si hay descuadre.

---

### [TASK-06] Consolidación y Verificación de Compilación
- **Objetivo:** Conectar las vistas con el motor contable en `App.jsx`, unificar con `theme.css` y verificar que `npm run build` compile limpiamente con 0 errores.
- **Archivos:** `src/App.jsx`, `src/theme.css`.
- **Criterios de Aceptación (DoD):**
  - Compilación limpia con Vite sin advertencias de tipos o sintaxis.
  - Servidor de desarrollo levantado y accesible.\n