# TASKS: Tareas Atómicas de Construcción - Flujo de Empresas y Sesión

> **Módulo:** Empresas / Flujo de Acceso Global del Estudio Contable
> **Especificación:** `specs/empresas/spec.md`
> **Plan:** `specs/empresas/plan.md`
> **Ejecutor:** AGY (Antigravity CLI) o Asistente AI
> **Directorio de Trabajo:** `d:\Chambas\SaasContable`

---

## Roadmap de Tareas

- [x] **[TASK-01]** Modelo de Estado Global: Sesión de Estudio y Contexto Jerárquico
- [x] **[TASK-02]** Pantalla 0: Vista de Login y Validación de Credenciales
- [x] **[TASK-03]** Navegación Dinámica en Sidebar: Modo Global vs. Modo Empresa
- [x] **[TASK-04]** Header Contextual: Banner de Empresa Activa, Periodo y Botón "⬅ Salir de Empresa"
- [x] **[TASK-05]** Pantalla 1: Selector Central de Empresas con Filtros, Ejercicio y Periodo
- [x] **[TASK-06]** Modal Asistente de Alta de Empresa en 3 Pasos (con Plan Contable y Plantillas)
- [x] **[TASK-07]** Vistas Globales del Estudio: Copias de Seguridad (Backup) y Tablas SUNAT
- [x] **[TASK-08]** Verificación Integral de Flujo y Compilación Limpia (`npm run build`)

---

## Detalle de Tareas para Ejecución

### [TASK-01] Modelo de Estado Global: Sesión de Estudio y Contexto Jerárquico
- **Objetivo:** Extender `src/context/AccountingContext.jsx` para soportar la sesión de usuario del estudio (`sesionUsuario`), la empresa activa (`empresaActiva`), el ejercicio (`ejercicioActivo`), el periodo (`periodoActivo`), y los métodos de transición.
- **Archivos a modificar:** `src/context/AccountingContext.jsx`, `src/types/accounting.d.ts` (si aplica).
- **Criterios de Aceptación (DoD):**
  - Estado `sesionUsuario` inicializado desde `localStorage` o null si no hay sesión.
  - Estado `empresaActiva` inicializado en `null` al iniciar sesión.
  - Funciones exportadas en el contexto:
    - `iniciarSesion(usuario, password, codigoEstudio)`
    - `cerrarSesion()`
    - `seleccionarEmpresaYPeriodo(empresaId, ejercicio, periodo)`
    - `salirDeEmpresa()` -> Fija `empresaActiva: null`.
    - `cambiarEstadoPeriodo(empresaId, ejercicio, periodo, estado)`
  - Lista de empresas mock en `src/data/mockEmpresas.js` actualizada con los campos `ejerciciosDisponibles`, `periodos`, y `plantillasActivasIds`.

---

### [TASK-02] Pantalla 0: Vista de Login y Validación de Credenciales
- **Objetivo:** Crear el componente `src/views/LoginView.jsx` que permita al usuario autenticarse en el servidor del estudio contable.
- **Archivos a crear/modificar:** `src/views/LoginView.jsx`, `src/App.jsx`.
- **Criterios de Aceptación (DoD):**
  - Formulario con campos: Usuario, Contraseña, Código del Estudio/Servidor (`ESTUDIO-01`), y botón "Iniciar Sesión".
  - Botones de acceso rápido para pruebas ("Admin Pedro", "Contador María").
  - Validación de campos con mensajes de error visuales.
  - Si no está autenticado, la aplicación solo muestra `LoginView`. Al autenticar, da paso a la vista principal.

---

### [TASK-03] Navegación Dinámica en Sidebar: Modo Global vs. Modo Empresa
- **Objetivo:** Adaptar `src/components/Sidebar.jsx` para que cambie de menú automáticamente dependiendo de si `empresaActiva` es `null` (Modo Global) o contiene una empresa (Modo Empresa).
- **Archivos a modificar:** `src/components/Sidebar.jsx`.
- **Criterios de Aceptación (DoD):**
  - **En Modo Global (`empresaActiva === null`):**
    - 🏢 Cartera de Empresas (vista por defecto)
    - 👥 Gestión de Usuarios
    - 💾 Copias de Seguridad (Backup)
    - 📋 Tablas Maestras SUNAT
    - ⚙️ Plantillas de Automatización Globales
    - 🚪 Cerrar Sesión (con confirmación)
  - **En Modo Empresa (`empresaActiva !== null`):**
    - 🛒 Compras
    - 💰 Ventas
    - 🏦 Tesorería & Bancos
    - 📊 Conciliación Bancaria
    - 📖 Libros Contables (Diario / Mayor)
    - 📑 Liquidación de IGV
    - 🔒 Cierre de Ejercicio
    - 📑 Catálogo de Cuentas (Plan Contable del cliente)
    - ⚡ Plantillas de Automatización de la Empresa

---

### [TASK-04] Header Contextual: Banner de Empresa Activa, Periodo y Botón "⬅ Salir de Empresa"
- **Objetivo:** Actualizar `src/components/Header.jsx` para mostrar la información del entorno actual y permitir el desacople de empresa.
- **Archivos a modificar:** `src/components/Header.jsx`.
- **Criterios de Aceptación (DoD):**
  - En Modo Global: Muestra el nombre del Estudio Contable y el perfil del usuario activo (`sesionUsuario.nombre`, badge de rol).
  - En Modo Empresa: Muestra claramente el badge de la Empresa (`razonSocial`, `ruc`), el periodo activo (`ejercicioActivo` - `periodoActivo`), el badge de estado (`ABIERTO` en verde / `CERRADO` en rojo) y un botón llamativo: **"⬅ Salir de Empresa"** o **"Cambiar Empresa"**.
  - Al pulsar "Salir de Empresa", invoca `salirDeEmpresa()` y regresa instantáneamente al selector global.

---

### [TASK-05] Pantalla 1: Selector Central de Empresas con Filtros, Ejercicio y Periodo
- **Objetivo:** Refinar `src/views/EmpresasView.jsx` para que funcione como el selector central de empresas con tarjetas interactivas de clientes.
- **Archivos a modificar:** `src/views/EmpresasView.jsx`.
- **Criterios de Aceptación (DoD):**
  - Barra de búsqueda predictiva que filtra en tiempo real por RUC, Razón Social o Régimen.
  - Tarjetas de empresas mostrando: RUC, Razón Social, Régimen, Moneda, Estado y total de cuentas.
  - Selectores desplegables por tarjeta para:
    - **Año (Ejercicio):** 2026, 2025, 2024.
    - **Mes (Periodo):** Enero a Diciembre + Cierre Anual.
  - Badge visual de estado del periodo (`ABIERTO` o `CERRADO`).
  - Botón principal de acción: **"Ingresar al Periodo"** (ej. "Ingresar a Setiembre 2026") que activa el contexto y realiza la transición a la vista operativa de la empresa.
  - Botones de acción secundaria: "Editar Empresa", "Ver Catálogo", "Plantillas".

---

### [TASK-06] Modal Asistente de Alta de Empresa en 3 Pasos
- **Objetivo:** Perfeccionar el modal de creación de empresa para incluir la parametrización de plan contable y plantillas de automatización.
- **Archivos a modificar:** `src/views/EmpresasView.jsx` o `src/components/ModalNuevaEmpresa.jsx`.
- **Criterios de Aceptación (DoD):**
  - **Paso 1 (Datos Fiscales):** RUC (validación 11 dígitos, botón simular SUNAT que llena razón social y dirección), Nombre Comercial, Régimen Tributario, Moneda Base.
  - **Paso 2 (Plan Contable y Automatización):**
    - Opción 1: Duplicar PCGE Maestro 2026 Oficial.
    - Opción 2: Importar Excel (`PlanContable.xlsx`).
    - Opción 3: Iniciar en Blanco.
    - Selección de plantillas iniciales para la empresa (Compras, Ventas, Servicios).
    - Switches para automatizaciones: Amarres automáticos Clase 6 a 9/79, diferencia de cambio.
  - **Paso 3 (Resumen y Apertura):** Verificación de datos ingresados y botón "Aperturar Empresa". La empresa se añade a la lista y puede seleccionarse de inmediato.

---

### [TASK-07] Vistas Globales del Estudio: Copias de Seguridad y Tablas SUNAT
- **Objetivo:** Crear o conectar las vistas de administración global del estudio contable.
- **Archivos a crear/modificar:** `src/views/BackupsView.jsx`, `src/views/TablasSunatView.jsx`, `src/App.jsx`.
- **Criterios de Aceptación (DoD):**
  - `BackupsView`: Botón para descargar respaldo JSON de todas las empresas y configuraciones; input file para restaurar respaldo JSON; botón para resetear a datos de fábrica/semilla.
  - `TablasSunatView`: Tabla interactiva con búsqueda para consultar tipos de documento (01, 03, 07, 08), monedas, y códigos de SUNAT.

---

### [TASK-08] Verificación Integral de Flujo y Compilación Limpia
- **Objetivo:** Asegurar que todo el flujo funcione sin errores en consola y que el comando de build de Vite sea 100% exitoso.
- **Archivos a verificar:** `src/App.jsx`, `src/theme.css`.
- **Criterios de Aceptación (DoD):**
  - `npm run build` compila con éxito (0 errores).
  - Flujo completo probado: Login -> Panel Global -> Selector de Empresa con selección de periodo -> Ingreso a Empresa -> Navegación operativa -> Salir de Empresa -> Selector Global.
