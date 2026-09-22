# SPEC: Gestión Integral de Empresas, Sesión y Navegación Multi-Tenant

> **Módulo:** Empresas / Flujo de Acceso Global del Estudio Contable
> **Documentos de Referencia:** `ContextoProyecto/03-PRD.md` (RF-101 a RF-108), `docs/constitution.md`, Figma `118-2`, `118-369`, `118-868`, `153-2`, `154-2`

---

## 1. Visión General del Flujo

El sistema adopta una arquitectura jerárquica de 3 niveles:

1. **Nivel 0 (Acceso / Login):** Autenticación en el servidor del Estudio Contable.
2. **Nivel 1 (Panel General Global):** Entorno de administración del Estudio (sin empresa activa aún). Permite gestionar clientes, usuarios, copias de seguridad, tablas SUNAT, plantillas maestras y seleccionar con qué empresa y periodo operar.
3. **Nivel 2 (Panel de la Empresa Seleccionada):** Contexto operativo bloqueado a la empresa y periodo activo. Da acceso a compras, ventas, tesorería, conciliación, libros, liquidación IGV, catálogo de cuentas y plantillas de automatización propias.

---

## 2. Definición Detallada de Pantallas y Flujo

```
 ┌────────────────────────┐
 │   Pantalla 0: Login    │  (Usuario, Contraseña, Código Estudio)
 └───────────┬────────────┘
             │ Iniciar Sesión (Autenticación simulada)
             ▼
 ┌────────────────────────────────────────────────────────┐
 │        Pantalla 1: Panel General Global (Estudio)       │
 ├────────────────────────────┬───────────────────────────┤
 │ Sidebar Global:            │ Centro: Selector Empresas │
 │ • 🏢 Cartera de Empresas   │ • Buscador predictivo     │
 │ • 👥 Usuarios del Estudio  │ • Tarjetas de Empresas    │
 │ • 💾 Copias de Seguridad   │ • Selector de Ejercicio   │
 │ • 📋 Tablas Maestras SUNAT │ • Selector de Periodo     │
 │ • ⚙️ Plantillas Globales   │ • Botón: "Ingresar"       │
 │ • 🚪 Cerrar Sesión         │                           │
 └────────────────────────────┴─────────────┬─────────────┘
                                            │ Presionar "Ingresar al Periodo"
                                            ▼
 ┌────────────────────────────────────────────────────────┐
 │     Pantalla 2: Panel de la Empresa Seleccionada       │
 ├────────────────────────────────────────────────────────┤
 │ Header: [🏢 Empresa Activa | RUC | Periodo] [⬅ Salir]  │
 ├────────────────────────────┬───────────────────────────┤
 │ Sidebar de la Empresa:     │ Vistas Operativas:        │
 │ • 🛒 Compras               │ • Registro de Documentos  │
 │ • 💰 Ventas                │ • Emisión y Cobranzas     │
 │ • 🏦 Tesorería & Bancos    │ • Movimientos bancarios   │
 │ • 📊 Conciliación          │ • Cruce con extracto      │
 │ • 📖 Libros (Diario/Mayor) │ • Vouchers y asientos     │
 │ • 📑 Liquidación de IGV    │ • Impuestos del mes       │
 │ • 🔒 Cierre Contable       │ • Regularización anual    │
 │ • 📑 Catálogo de Cuentas   │ • PCGE del cliente        │
 │ • ⚡ Plantillas de Empresa │ • Automatizaciones        │
 └────────────────────────────┴───────────────────────────┘
```

### 🔒 Pantalla 0: Login (Acceso Seguro)

- **Propósito:** Identificación del usuario en el entorno del estudio contable.
- **Campos:**
  - `usuario`: Nombre de usuario (ej. `admin_pedro` o `contador_maria`).
  - `password`: Clave de acceso.
  - `codigoEstudio`: Identificador de la base de datos o servidor del estudio (ej. `ESTUDIO-01`, `ESTUDIO-LIMA`).
  - `recordarSesion`: Checkbox para persistir sesión.
- **Comportamiento:**
  - Al presionar **"Iniciar Sesión"**, el sistema valida las credenciales contra los usuarios mock/registrados.
  - Carga el contexto del estudio y redirige inmediatamente a la **Pantalla 1 (Panel General Global)**.
  - No hay empresa activa seleccionada en este punto (`empresaActiva: null`).

### 🌐 Pantalla 1: Panel General Global (Post-Login)

Esta es la vista inicial tras iniciar sesión. El usuario está en el contexto del Estudio Contable, con acceso a herramientas administrativas y al selector de empresas.

#### 1. Barra Lateral Izquierda (Herramientas del Estudio)

- 🏢 **Cartera de Empresas:** Vista para administrar el directorio completo de empresas clientes (listar, buscar, filtrar por régimen, crear nueva, editar datos fiscales, archivar).
- 👥 **Gestión de Usuarios del Estudio:** Vista de administración de usuarios internos del estudio, roles (`Maker`, `Checker`, `Admin`, `Auditor`) y asignación de permisos sobre qué empresas puede operar cada usuario.
- 💾 **Copias de Seguridad (Backup):**
  - Generar respaldo completo del estudio o por empresa (descarga JSON).
  - Restaurar datos a partir de un archivo de respaldo.
  - Botón de "Reset a datos semilla" (según RD-08 / AGENTS.md).
- 📋 **Tablas Maestras SUNAT:** Catálogos normativos precargados (Tipos de Documento 01/03/07, Tipos de Operación, Monedas PEN/USD, Códigos de Aduana, Tipos de Medios de Pago).
- ⚙️ **Plantillas de Automatización Globales:** Banco centralizado de plantillas de asientos (compras, ventas, planilla, provisiones) que pueden ser clonadas o aplicadas a las empresas clientes.
- 🚪 **Cerrar Sesión:** Cierra la sesión activa y retorna a la Pantalla 0 (Login).

#### 2. Centro de la Pantalla: Selector Central de Empresas

- **Buscador predictivo:** Filtro en tiempo real por RUC, Razón Social o Régimen Tributario.
- **Tarjetas de Empresa:** Cada tarjeta muestra:
  - Razón Social y Nombre Comercial (Abreviatura).
  - RUC y Régimen Tributario (badge de color).
  - Moneda funcional (`PEN` / `USD`).
  - Estado (`ACTIVA` / `SUSPENDIDA`).
  - **Selector de Ejercicio:** Desplegable con años disponibles (ej. `2026`, `2025`, `2024`).
  - **Selector de Periodo:** Desplegable con los meses (Enero a Diciembre + Cierre Anual).
  - **Badge de Estado del Periodo:** Indicador visual `ABIERTO` (verde) o `CERRADO` (rojo).
  - **Botón Principal:** `Ingresar al Periodo` (ej. "Ingresar a Setiembre 2026").
  - **Acciones Rápidas:** Botones para editar ficha, ver catálogo de cuentas, o ver plantillas asignadas a esa empresa.

### 🔄 La Transición de Contexto (Locking de Empresa)

Al presionar **"Ingresar al Periodo"**:

1. El estado global fija:
   ```javascript
   {
     empresaActiva: empresaSeleccionada,
     ejercicioActivo: "2026",
     periodoActivo: "SETIEMBRE_2026",
     estadoPeriodo: "ABIERTO"
   }
   ```
2. La interfaz conmuta de **Modo Global** a **Modo Empresa**.
3. El Sidebar global se oculta y se activa el **Sidebar Operativo de la Empresa**.
4. En el Header superior se despliega la cabecera de la empresa activa:
   - Nombre de la Empresa y RUC.
   - Periodo seleccionado con badge de estado.
   - Botón visible y destacado: **"⬅ Salir de Empresa"** (o "Cambiar de Empresa").
   - Al pulsar "Salir de Empresa", se limpia `empresaActiva: null` y se regresa de inmediato al Panel Global (Pantalla 1).

### 🏢 Pantalla 2: Panel de la Empresa Seleccionada

Al ingresar, el usuario dispone de los módulos operativos vinculados estrictamente a los datos de la empresa y periodo activo:

- 🛒 **Módulo de Compras:** Registro de facturas de compras, notas de crédito/débito, crédito fiscal IGV y generación de asientos automáticos.
- 💰 **Módulo de Ventas:** Registro de comprobantes de pago emitidos, cuentas por cobrar, débito fiscal IGV.
- 🏦 **Módulo de Tesorería:** Catálogo de cuentas bancarias y cajas propias de la empresa, ingresos, egresos y control de saldos.
- 📊 **Conciliación Bancaria:** Importación de extractos bancarios en Excel y conciliación con movimientos contables.
- 📖 **Libros Contables:** Visualización de Libro Diario, Libro Mayor y Balance de Comprobación alimentados por los vouchers de la empresa.
- 📑 **Liquidación de IGV:** Determinación mensual del impuesto (Crédito vs. Débito Fiscal).
- 🔒 **Cierre Contable:** Asientos de regularización de cierre del ejercicio.
- 📑 **Catálogo de Cuentas / Plan Contable:** Plan contable específico asignado a esta empresa (PCGE 2026, Importado de Excel o Personalizado).
- ⚡ **Plantillas de Automatización de la Empresa:** Plantillas contables activas para la empresa seleccionada (con opción de crear reglas específicas para sus giros de negocio).

---

## 3. Modelo de Datos de Dominio

```typescript
export interface SesionEstudio {
  usuarioId: string;
  nombre: string;
  rol: "Maker" | "Checker" | "Admin" | "Auditor";
  codigoEstudio: string;
  autenticado: boolean;
  fechaAcceso: string;
}

export interface PeriodoContable {
  ejercicio: string; // ej. "2026"
  mes: number; // 1 a 12 (o 13 para Cierre)
  nombrePeriodo: string; // ej. "SETIEMBRE_2026"
  estado: "ABIERTO" | "CERRADO";
  fechaCierre?: string;
  cerradoPor?: string;
}

export interface Empresa {
  id: string; // Identificador único (ej. "EMP-01")
  ruc: string; // RUC de 11 dígitos
  razonSocial: string; // Razón social oficial SUNAT
  nombreComercial: string; // Nombre comercial
  abreviatura: string; // Nombre corto para pestañas
  regimenTributario: RegimenTributario;
  monedaBase: "PEN" | "USD"; // Moneda funcional principal
  monedaSecundaria: "USD" | "PEN";
  ejercicioInicial: string; // ej. "2026"

  // Periodos y Ejercicios
  ejerciciosDisponibles: string[]; // ["2026", "2025", "2024"]
  periodoActivo: string; // ej. "SETIEMBRE_2026"
  periodos: PeriodoContable[];

  // Plan Contable y Catálogo
  planAsignadoTipo: "PCGE_2026" | "IMPORTAR_EXCEL" | "EN_BLANCO";
  nombrePlan: string; // Ej. "PCGE Oficial 2026"
  digitosRegistro: number; // Nivel analítico (ej. 7)
  totalCuentasActivas: number;

  // Plantillas de Automatización Asignadas
  plantillasActivasIds: string[]; // IDs de plantillas aplicables a la empresa

  // Parámetros y Automatizaciones Contables (Figma 118-868)
  cierreAutomaticoDestino: boolean; // Clase 6 a 9/79 automático
  validarRucSunatEnLinea: boolean;
  diferenciaCambioAutomatica: boolean;
  bloquearVouchersPeriodoCerrado: boolean;
  exigirCentroCostosGastos: boolean;

  // Ubicación y Contacto
  direccionFiscal: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  telefono: string;
  correoContable: string;

  estado: "ACTIVA" | "EN_REVISION" | "SUSPENDIDA";
  fechaCreacion: string;
}

export type RegimenTributario =
  | "Régimen General (29.5%)"
  | "Régimen MYPE Tributario"
  | "Régimen Especial (RER)"
  | "Nuevo RUS";
```

---

## 4. Requisitos Funcionales y Reglas de Negocio (RF)

- **RF-101 (Login de Estudio Contable):**
  - Permite ingresar con credenciales predefinidas (`admin_pedro` / `123456`, código `ESTUDIO-01`).
  - Muestra mensajes de error claros ante credenciales incorrectas.
  - Persiste la sesión en `localStorage` bajo clave de esquema seguro.
- **RF-102 (Navegación en Modo Global vs. Modo Empresa):**
  - Cuando `empresaActiva === null`, el sistema muestra el Panel General Global con el sidebar del estudio (Cartera, Usuarios, Backups, Tablas SUNAT, Plantillas Globales).
  - Cuando `empresaActiva !== null`, el sistema muestra el entorno operativo de la empresa con el sidebar operativo (Compras, Ventas, Tesorería, Conciliación, Libros, Liquidación, Cierre, Catálogo de Cuentas, Plantillas).
- **RF-103 (Selector de Empresas y Periodo):**
  - Muestra la lista de empresas del estudio con filtros de búsqueda por texto y régimen.
  - Permite cambiar interactivamente el año (ejercicio) y mes (periodo) antes de ingresar.
  - Al presionar **"Ingresar al Periodo"**, se valida el estado del periodo (`ABIERTO` o `CERRADO`) y se establece el contexto activo.
- **RF-104 (Botón Salir de Empresa):**
  - El Header de la empresa muestra permanentemente el botón **"⬅ Salir de Empresa"**.
  - Al hacer clic, limpia la selección de empresa y retorna de inmediato a la Pantalla 1 sin perder datos.
- **RF-105 (Alta de Empresa en 3 Pasos):**
  - **Paso 1 (Identificación):** RUC de 11 dígitos validado (inicio 10, 15, 17, 20), Razón Social, Abreviatura, Régimen Tributario, Moneda Base.
  - **Paso 2 (Configuración de Plan y Plantillas):**
    - Modalidad de Plan: `PCGE 2026 Oficial`, `Subir Excel (PlanContable.xlsx)` o `Catálogo en Blanco`.
    - Plantillas de automatización iniciales: activación de plantillas para compras de mercadería, servicios y ventas.
    - Switches de automatización (Amarres 6 a 9/79 automáticos, validación RUC, diferencia de cambio).
  - **Paso 3 (Confirmación):** Resumen visual de la configuración y botón **"Aperturar Empresa"**.
- **RF-106 (Gestión de Plantillas de Automatización):** _(Implementado por `specs/001-ingestion-comprobantes`)_
  - En Modo Global: Administrar el banco maestro de plantillas aplicables a todo el estudio (`PlantillasGlobalesView`).
  - En Modo Empresa: Seleccionar cuáles plantillas maestras están activas para esa empresa y verificar compatibilidad con el catálogo (`PlantillasEmpresaView`).
- **RF-107 (Copias de Seguridad y Respaldo):**
  - Exportar base de datos completa a archivo JSON descargable.
  - Importar archivo de respaldo para restaurar estado.
  - Reset a datos semilla oficiales.
- **RF-108 (Control de Periodos Cerrados):**
  - Si el periodo activo está en estado `CERRADO`, las operaciones de registro y modificación en compras, ventas y catálogo quedan deshabilitadas (modo sólo lectura con advertencia visual).
