# SPEC: Catálogo de Cuentas Contables (PCGE), Importación Inteligente y Parametrización Avanzada

> **Módulo:** Plan Contable General Empresarial (PCGE) / Catálogo por Empresa
> **Documentos de Referencia:** `ContextoProyecto/07-BUSINESS-RULES-REGISTRY.md` (RN-005 a RN-010), `docs/constitution.md`, Figma `118-1105`, `118-1854`, `PlanContable.xlsx`

---

## 1. Visión General del Módulo

Cada empresa cliente gestiona su propio Catálogo de Cuentas Contables independiente (`planesPorEmpresa[empresaId]`).
El módulo provee un ecosistema profesional de grado empresarial con **5 capacidades centrales**:
1. **Flujo de Importación Inteligente con Staging y Aprobación:** Ingesta de archivos Excel (`.xlsx`/`.csv`) convertidos en tiempo real a JSON canónico, pasando por un **Modal de Auditoría y Previsualización** con semáforo de integridad antes de ser aprobados e implementados en la empresa.
2. **Generador de Plantilla Oficial Descargable:** Generación dinámica de la plantilla Excel estandarizada (`Plantilla_PCGE_Estandar.xlsx`) para que los clientes llenen sus cuentas bajo el contrato esperado por el sistema.
3. **Semáforo de Integridad Contable:** Validación de partida doble en amarres (6 $\rightarrow$ 9/79 y 60 $\rightarrow$ 20/61), verificación de cuentas destino existentes y control de jerarquías (padres sintéticos vs. hijas analíticas).
4. **Parametrización Contable Avanzada:** Control de cuenta de uso `U`, **Tipo de Análisis** (Por Documento/RUC, Banco/Cta Cte, Centro de Costos, Sin Análisis) y ajuste por **Diferencia de Cambio**.
5. **Clonado entre Empresas y Modos de Ingesta:** Capacidad de clonar el catálogo de otra empresa del estudio, y elegir entre **Reemplazo Total** o **Fusión / Actualización (Merge)**.

---

## 2. Modelo de Datos Canónico de Cuenta Contable

```typescript
export interface CuentaContable {
  codigo: string;                      // Código numérico (ej. "101", "1041101", "6011101")
  descripcion: string;                 // Denominación oficial de la cuenta
  elemento: number;                    // 1 a 9 según el primer dígito del código
  nivel: number;                       // 1 (Elemento), 2 (Rubro), 3 (Subcuenta), 4 (Divisionaria), 5 (Detalle)
  esCuentaU: boolean;                  // true = Cuenta Imputable / Movimiento, false = Cuenta Sintética / Padre
  moneda: "MN" | "ME" | "AMBAS";       // Moneda Nacional (PEN), Moneda Extranjera (USD) o Ambas
  
  // Parámetros de Operación y Validación Contable
  tipoAnalisis: TipoAnalisisCuenta;    // Exigencia de datos en el asiento
  requiereCC: boolean;                 // Exige Centro de Costos si es true (Clase 6 y 9)
  ajusteDiferenciaCambio: boolean;     // Sujeto a diferencia de cambio mensual (cuentas monetarias en USD)
  
  // Reglas de Amarres Automáticos (Destino Contable)
  amarre1?: string;                    // Cuenta Destino Debe (ej. "9411101" o "2011101")
  amarre2?: string;                    // Cuenta Destino Haber (ej. "7911101" o "6111101")
  amarre3?: string;                    // Centro de Costo por defecto (ej. "CC-ADMIN")
  
  // Clasificación para Estados Financieros (Figma 118-1854)
  rubroEF1?: string;                   // Balance General: "Activo Corriente", "Pasivo", etc.
  rubroEF2?: string;                   // Estado de Resultados: "Por Función", "Por Naturaleza"
  digitoBalance?: string;              // Dígito DBG según PCGE

  // Control de Saldos e Inmutabilidad en el Prototipo
  saldoDeudor: number;
  saldoAcreedor: number;
  tieneMovimientos: boolean;           // Si es true, impide eliminación o cambio de nivel
}

export type TipoAnalisisCuenta = 
  | "Por Documento / RUC"             // Cuentas 12, 42, 16, 46 (exige RUC, serie, número)
  | "Banco / Conciliación"            // Cuenta 104 (exige medio de pago y nro operación)
  | "Centro de Costos"                // Cuentas 62, 63, 64, 65, 68, 94, 95
  | "Solo Monto / Sin Análisis";      // Cuentas 101, 50, etc.
```

---

## 3. Flujo Detallado de Importación Inteligente (Excel $\rightarrow$ JSON $\rightarrow$ Auditoría $\rightarrow$ Aprobación)

```
 ┌────────────────────────────────────────────────────────┐
 │   1. Usuario hace clic en "📤 Subir Excel"             │
 └──────────────────────────┬─────────────────────────────┘
                            │ Selecciona archivo .xlsx o .csv
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   2. Motor SheetJS en Frontend (excelParser.js)        │
 │   - Convierte filas a JSON canónico en memoria         │
 │   - Calcula niveles, elemento y detecta cuentas 'U'    │
 └──────────────────────────┬─────────────────────────────┘
                            │ Transfiere a motor de validación
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   3. Semáforo de Integridad (planContableValidator.js) │
 │   - Valida amarres huérfanos (destinos no existentes)   │
 │   - Valida cuentas huérfanas (sin ancestros padre)      │
 │   - Valida consistencia de partida doble en amarres    │
 └──────────────────────────┬─────────────────────────────┘
                            │ Abre estado "Staging / Borrador"
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   4. MODAL DE AUDITORÍA Y PREVISUALIZACIÓN             │
 ├────────────────────────────────────────────────────────┤
 │ • Métricas: Total Cuentas, Cuentas U, Con Amarre       │
 │ • Alertas del Semáforo (Verde / Amarillo / Rojo)       │
 │ • Tabla interactiva: Búsqueda y edición in-situ        │
 │ • Selector de Modo:                                    │
 │   [ ] Reemplazo Total     [ ] Fusión (Merge)           │
 ├────────────────────────────────────────────────────────┤
 │ • Botones:                                             │
 │   [❌ Descartar]           [✅ Aprobar y Aplicar Plan]   │
 └──────────────────────────┬─────────────────────────────┘
                            │ Usuario presiona "Aprobar y Aplicar Plan"
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   5. Catálogo Activo de la Empresa Actualizado         │
 │   - Se almacena en planesPorEmpresa[empresaActiva.id]  │
 │   - Notificación de éxito y actualización de vistas    │
 └────────────────────────────────────────────────────────┘
```

---

## 4. Componentes y Botones de la Interfaz (100% Funcionales)

### A. Barra Superior de Acciones
1. **📥 Descargar Plantilla Excel:** Descarga en el acto `Plantilla_PCGE_Estandar.xlsx` con cabeceras estándar (`CUENTA`, `DESCRIPCION`, `NIVEL`, `MONEDA`, `AMARRE_1_DEBE`, `AMARRE_2_HABER`, `TIPO_ANALISIS`, `EXIGE_CC`) y filas de ejemplo comentadas.
2. **📤 Subir Excel:** Abre el selector de archivos local, parsea el archivo y despliega el **Modal de Auditoría y Previsualización**.
3. **📋 Copiar Plan desde Otra Empresa:** Despliega un modal selector con las empresas del estudio; al seleccionar una empresa fuente, duplica su catálogo completo en la empresa activa.
4. **💾 Exportar Catálogo Actual:** Descarga un archivo Excel o JSON con las cuentas vigentes de la empresa activa.
5. **➕ Nueva Cuenta:** Abre el modal de creación manual de cuenta individual.

### B. Barra de Filtros y Búsqueda
- **Pestañas por Elemento:** `Todos (1-9)`, `1 Activo Disponible/Exigible`, `2 Realizable`, `3 Inmovilizado`, `4 Pasivo`, `5 Patrimonio`, `6 Gastos por Naturaleza`, `7 Ingresos`, `8 Saldos Intermediarios`, `9 Analítica de Costos`.
- **Filtros Rápidos:**
  - `Solo Cuentas de Uso (U)` (filtra cuentas imputables).
  - `Solo con Amarres` (filtra cuentas que tengan destinos Debe/Haber).
  - `Solo en Dólares (ME)`.
- **Buscador Predictivo:** Búsqueda en tiempo real por código o nombre con resaltado de coincidencias.

### C. Modal de Auditoría y Previsualización
- Resumen de lectura: Total filas, Cuentas de uso `U`, Amarres válidos, Amarres con advertencia.
- **Lista de Alertas:**
  - 🟢 Todo válido: Plan listo para aprobación directa.
  - 🟡 Advertencia: Cuentas padre faltantes (botón *"Auto-generar cuentas sintéticas"*).
  - 🔴 Error: Amarres que apuntan a cuentas inexistentes o códigos duplicados.
- Selector de modo:
  - `Reemplazo Total`: Sustituye todo el plan previo.
  - `Fusión (Merge)`: Agrega cuentas nuevas y actualiza nombres respetando las existentes.
- Botón **"Aprobar y Aplicar Plan"**: Confirma la carga en el estado de la empresa.
- Botón **"Descartar"**: Cierra el modal sin afectar el catálogo actual.

### D. Modal de Mantenimiento de Cuenta (`ModalCuenta.jsx`)
- Breadcrumb dinámico superior (ej. `6 GASTOS > 63 SERVICIOS > 631 TRANSPORTE`).
- Código y Denominación oficial.
- Moneda (`MN`, `ME`, `AMBAS`).
- Switch `Cuenta de Uso (U)`.
- Selector `Tipo de Análisis` (`Por Documento / RUC`, `Banco / Conciliación`, `Centro de Costos`, `Solo Monto`).
- Configuración de Amarres Automáticos:
  - Amarre 1 (Debe) con selector/predictivo de cuentas disponibles.
  - Amarre 2 (Haber) con selector/predictivo de cuentas disponibles.
  - Switch `Requiere Centro de Costos`.
  - Switch `Ajuste por Diferencia de Cambio`.
