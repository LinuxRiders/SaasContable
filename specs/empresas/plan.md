# PLAN: Implementación del Flujo Global de Empresas, Login y Navegación

> **Módulo:** Empresas / Flujo de Acceso Global del Estudio Contable
> **Especificación:** `specs/empresas/spec.md`
> **Constitución:** `docs/constitution.md`

---

## 1. Resumen Arquitectónico

Se implementa la estructura de navegación en 2 capas gobernada por el estado de autenticación y empresa activa:
1. **Capa 0 - Autenticación:** `LoginView.jsx` que gestiona las credenciales del usuario del estudio contable.
2. **Capa 1 - Modo Global (Estudio Contable):** `GlobalStudioView.jsx` o `EmpresasSelectorView.jsx` activo cuando `empresaActiva === null`. Contiene la barra lateral global (Cartera, Usuarios, Backups, Tablas SUNAT, Plantillas Globales) y el selector central de empresas con sus selectores de ejercicio/periodo.
3. **Capa 2 - Modo Empresa Operativa:** Se activa al pulsar "Ingresar al Periodo". El sistema fija `empresaActiva`, oculta el menú global, activa el menú operativo (Compras, Ventas, Tesorería, Libros, etc.) y añade en `Header.jsx` el botón **"⬅ Salir de Empresa"** para volver a la Capa 1.

---

## 2. Constitution Check (docs/constitution.md)

| Principio | Cumplimiento | Justificación |
|---|:---:|---|
| **I. Un Solo Núcleo** | ✅ CUMPLE | Toda la navegación y datos se integran armónicamente con los módulos existentes de compras, ventas y libros. |
| **II. Prototipo Funcional Realista** | ✅ CUMPLE | Simulación de login con usuarios y perfiles, selector de ejercicio fiscal y periodos con bloqueo ABIERTO/CERRADO. |
| **III. Dominio Puro y Aislado** | ✅ CUMPLE | La validación de RUC SUNAT y lógica de periodos se mantiene desacoplada de la UI. |
| **IV. Identidad, Tenant y Segregación** | ✅ CUMPLE | Segregación estricta: al seleccionar una empresa, todas las vistas operativas solo leen los datos correspondientes a ese `tenantId`. |
| **V. Pruebas de Dominio** | ✅ CUMPLE | Funciones de validación de RUC y cálculo de periodos preparadas para pruebas con Vitest. |
| **VI. Simplicidad y Stack Acotado** | ✅ CUMPLE | Cero dependencias adicionales pesadas. Se utiliza React 18, `lucide-react` y `theme.css`. |
| **VII. Coherencia con el Prototipo** | ✅ CUMPLE | Reutilización de `Modal.jsx`, `MetricCard.jsx` y diseño coherente con los colores corporativos y tokens de `theme.css`. |

---

## 3. Desglose de Componentes a Modificar y Crear

### A. Contexto Global (`src/context/AccountingContext.jsx`)
- Nuevos estados:
  - `sesionUsuario`: `{ usuarioId, nombre, rol, codigoEstudio, autenticado }`
  - `empresaActiva`: `Empresa | null` (por defecto `null` tras iniciar sesión).
  - `ejercicioActivo`: `"2026"` (o el ejercicio seleccionado en la tarjeta).
  - `periodoActivo`: `"SETIEMBRE_2026"` (o el periodo seleccionado en la tarjeta).
  - `estadoPeriodo`: `"ABIERTO" | "CERRADO"`
- Nuevas acciones:
  - `iniciarSesion(usuario, password, codigoEstudio)`
  - `cerrarSesion()`
  - `seleccionarEmpresaYPeriodo(empresaId, ejercicio, periodo)`
  - `salirDeEmpresa()` (fija `empresaActiva: null` y devuelve a la vista global).
  - `cambiarEstadoPeriodo(empresaId, ejercicio, periodo, nuevoEstado)`
  - `agregarEmpresa(nuevaEmpresa, modoPlan, plantillasIniciales)`
  - `exportarBackup()` y `restaurarBackup(jsonData)`

### B. Vistas Principales
1. **`src/views/LoginView.jsx` (NUEVO):**
   - Interfaz moderna de acceso con campos de usuario, contraseña y código de estudio.
   - Botón de acceso rápido con usuarios demo (`admin_pedro` - Administrador, `maria_contador` - Contador Maker).
2. **`src/views/EmpresasView.jsx` (ACTUALIZADO como Selector Global de Empresas):**
   - Buscador predictivo por RUC, Razón Social o Régimen.
   - Tarjetas informativas de empresas con selectores de Ejercicio y Periodo.
   - Botón interactivo "Ingresar al Periodo".
   - Acceso al asistente de Nueva Empresa (3 pasos).
3. **`src/views/BackupsView.jsx` (NUEVO o Integrado en Modal):**
   - Opciones para exportar JSON del estudio, importar respaldo y reset a datos iniciales.
4. **`src/views/TablasSunatView.jsx` (NUEVO):**
   - Consulta interactiva de tablas maestras SUNAT (Monedas, Tipos de Comprobante, Operaciones).
5. **`src/views/PlantillasGlobalesView.jsx` (NUEVO o Mejorado):**
   - Catálogo de plantillas maestras reutilizables para todas las empresas.

### C. Componentes de Navegación
1. **`src/components/Sidebar.jsx` (ACTUALIZADO):**
   - Soporte de 2 modos de visualización según `empresaActiva`:
     - **Modo Global (`empresaActiva === null`):**
       - 🏢 Cartera de Empresas
       - 👥 Gestión de Usuarios
       - 💾 Copias de Seguridad
       - 📋 Tablas Maestras SUNAT
       - ⚙️ Plantillas de Automatización
       - 🚪 Cerrar Sesión
     - **Modo Empresa (`empresaActiva !== null`):**
       - 🛒 Compras
       - 💰 Ventas
       - 🏦 Tesorería
       - 📊 Conciliación
       - 📖 Libros Contables
       - 📑 Liquidación IGV
       - 🔒 Cierre
       - 📑 Catálogo de Cuentas
       - ⚡ Plantillas de la Empresa
2. **`src/components/Header.jsx` (ACTUALIZADO):**
   - En Modo Empresa: Muestra nombre de la empresa activa, RUC, periodo activo (badge `ABIERTO`/`CERRADO`) y botón destacado **"⬅ Salir de Empresa"**.
   - En Modo Global: Muestra el nombre del Estudio Contable y perfil del usuario conectado.

---

## 4. Complexity Tracking

| Decisión | Complejidad | Justificación |
|---|---|---|
| Autenticación simulada en memoria/localStorage | Baja | Permite simular roles y múltiples usuarios sin necesidad de un backend real. |
| Doble modo en Sidebar y Header | Media | Evita usar un router pesado; se controla mediante la presencia o ausencia de `empresaActiva` en el contexto. |
| Persistencia en `localStorage` | Baja | Mantiene la sesión y las empresas registradas tras recargar la página. |

---

## 5. Escenarios de Demostración y Validación

1. **Escenario 1 (Flujo de Login):**
   - Abrir aplicación $\rightarrow$ Se presenta la Pantalla 0 (Login).
   - Probar con credenciales incorrectas $\rightarrow$ Error visible.
   - Probar con `admin_pedro` $\rightarrow$ Ingresa a Pantalla 1 (Panel Global del Estudio).
2. **Escenario 2 (Exploración Global):**
   - En Pantalla 1, navegar entre Cartera de Empresas, Usuarios, Copias de Seguridad, Tablas Maestras y Plantillas Globales.
   - Comprobar que no hay módulos operativos de compras o ventas visibles en este modo.
3. **Escenario 3 (Ingreso a una Empresa):**
   - En el selector de empresas, ubicar "Pollería El Carbón S.A.C.".
   - Cambiar el periodo a "Setiembre 2026".
   - Presionar "Ingresar al Periodo".
   - Verificar que la pantalla transmuta al entorno operativo de la empresa, con el Header mostrando la empresa y periodo, y el sidebar mostrando Compras, Ventas, Tesorería, etc.
4. **Escenario 4 (Salir de la Empresa):**
   - Presionar el botón "⬅ Salir de Empresa" en el Header.
   - Verificar que se limpia el contexto y se regresa inmediatamente al Selector Global de Empresas.
5. **Escenario 5 (Apertura de Nueva Empresa en 3 Pasos):**
   - Desde la vista global de Cartera de Empresas, presionar "+ Nueva Empresa".
   - Paso 1: Ingresar RUC `20601234567` $\rightarrow$ Simulación de consulta SUNAT.
   - Paso 2: Seleccionar modalidad de Plan Contable (PCGE 2026 Oficial) y plantillas iniciales.
   - Paso 3: Confirmar $\rightarrow$ La nueva empresa aparece de inmediato en el selector y permite ingresar a su periodo contable.
