# Plan de Implementación: MVP Frontend Gestión de Accesos, Usuarios y Empresas

**Alcance:** Frontend interactivo en memoria (React 18 + Vite). Sin persistencia (`localStorage`/cookies) ni backend.
**Documento base:** [CLAUDE_SAASCONTABLE.md](file:///home/victor/Documentos/contable/SaasContable/CLAUDE_SAASCONTABLE.md) y Diagrama 3 (Mermaid).
**Diseño de referencia:** [Figma — Sistema Contable](https://www.figma.com/design/xYos8C778nGhK8EA6Pnmgb/Sistema-Contable?node-id=196-2).

---

## Estructura de Fases y Tareas

### Fase 0 — Arquitectura Base, Fixtures y Estado en Memoria
* **Objetivo:** Establecer el origen único de la verdad en memoria sin tocar contratos de `AccountingContext`.
* **Archivos a crear:**
  * `src/components/gestion-usuarios-empresas/fixtures/initialAccessState.js`: Datos iniciales inmutables de estudio de prueba, titular, identidades IAM mock, empresas legales mock y vínculos.
  * `src/components/gestion-usuarios-empresas/state/accessControlTypes.js`: Definición de acciones (`CREAR_ESTUDIO`, `INVITAR_TITULAR`, `ACTIVAR_TITULAR_IAM`, `VERIFICAR_RUC`, `VINCULAR_EMPRESA`, `INVITAR_COLABORADOR`, `ACTIVAR_COLABORADOR`, `ASIGNAR_FUNCIONES`, `SIMULAR_APROBACION`, `REVOCAR_ACCESO`).
  * `src/components/gestion-usuarios-empresas/state/accessControlReducer.js`: Reducer puro en memoria.
  * `src/components/gestion-usuarios-empresas/state/AccessControlContext.jsx`: Proveedor para envolver la sección de gestión en `App.jsx`.
  * `src/components/gestion-usuarios-empresas/shared/`: Componentes reutilizables (`SimulatedBanner`, `WizardStepper`, `StatusBadge`).

---

### Fase 1 (F01) — Alta de Estudio y Titular
* **Referencia Figma:** Frames `196:2` (Crear estudio), `196:112` (Invitar titular), `196:332` (Aceptar en IAM), `196:442` (Confirmar 2FA).
* **Entradas:** Nombre del estudio, identificador/slug, ciudad/país, plan, correo del titular.
* **Componentes y `parts/`:**
  * `src/components/gestion-usuarios-empresas/screens/EstudioTitular/EstudioTitularModal.jsx`
  * `src/components/gestion-usuarios-empresas/screens/EstudioTitular/parts/PasoEstudio.jsx` (Formulario con campos de Figma `196:2`).
  * `src/components/gestion-usuarios-empresas/screens/EstudioTitular/parts/PasoTitular.jsx` (Invitación simulada al titular `196:112`).
  * `src/components/gestion-usuarios-empresas/screens/EstudioTitular/parts/PasoActivacionIam.jsx` (Simulación de activación IAM y 2FA `196:332` y `196:442`).
* **Comportamiento interactivo:**
  * Stepper interactivo: 1. Estudio -> 2. Titular -> 3. Activación.
  * Al confirmar, el estudio pasa de "Borrador" a "Activo" y el titular queda vinculado como Administrador General del estudio.

---

### Fase 2 (F02) — Cartera de Empresas y Verificación de RUC
* **Referencia Figma:** Frames `153:2` (Cartera), `154:2` (Verificar RUC), `155:2` (Configurar módulos y PCGE), `155:112` (Revisar vínculo), `169:2` (Asignar personas); Ruta alternativa: `196:222` (Solicitar vínculo) y `199:2` (Autorizar vínculo).
* **Entradas:** RUC, razón social, régimen, módulos habilitados (Compras, Ventas, Tesorería, Libros), asignación de PCGE y contador responsable.
* **Componentes y `parts/`:**
  * `src/components/gestion-usuarios-empresas/screens/CarteraEmpresas/CarteraEmpresas.jsx` (Reemplaza la vista monolítica).
  * `src/components/gestion-usuarios-empresas/screens/CarteraEmpresas/parts/TablaCartera.jsx` (Distinción entre empresa legal y estado del vínculo).
  * `src/components/gestion-usuarios-empresas/screens/CarteraEmpresas/parts/ModalVerificarRuc.jsx` (Búsqueda en catálogo mock).
  * `src/components/gestion-usuarios-empresas/screens/CarteraEmpresas/parts/ModalConfigurarVinculo.jsx` (Ruta RUC nuevo).
  * `src/components/gestion-usuarios-empresas/screens/CarteraEmpresas/parts/ModalAutorizarVinculo.jsx` (Ruta RUC existente).
* **Comportamiento interactivo:**
  * Búsqueda por RUC de 11 dígitos.
  * Si el RUC no existe en mock -> Permite registrar ficha legal, configurar vínculo y pasar a "Configuración pendiente" o "Listo".
  * Si el RUC ya existe -> Muestra flujo de autorización de vínculo simulado.
  * Evita duplicidad de vínculos en la cartera.

---

### Fase 3 (F03) — Invitación de Colaborador y Activación IAM
* **Referencia Figma:** Frames `80:2` (Directorio), `85:2` (Identidad y rol), `90:2` (RUC, función y vigencia), `157:2` (Revisar y enviar), `90:230` (Invitación pendiente), `203:2` (Aceptar IAM), `203:112` (Confirmar 2FA).
* **Entradas:** Nombres, correo, rol base de estudio, empresas asignadas, función por empresa y vigencia.
* **Componentes y `parts/`:**
  * `src/components/gestion-usuarios-empresas/screens/DirectorioUsuarios/DirectorioUsuarios.jsx`
  * `src/components/gestion-usuarios-empresas/screens/InvitacionColaborador/InvitacionColaboradorModal.jsx`
  * `src/components/gestion-usuarios-empresas/screens/InvitacionColaborador/parts/PasoIdentidadRol.jsx`
  * `src/components/gestion-usuarios-empresas/screens/InvitacionColaborador/parts/PasoAsignacionEmpresas.jsx`
  * `src/components/gestion-usuarios-empresas/screens/InvitacionColaborador/parts/PasoResumenInvitacion.jsx`
  * `src/components/gestion-usuarios-empresas/screens/InvitacionColaborador/parts/ModalSimularActivacion.jsx` (Permite simular aceptación de invitación, login y 2FA).
* **Comportamiento interactivo:**
  * Al enviar invitación, el colaborador aparece en estado `PENDIENTE` (nunca salta directo a activo).
  * Se permite simular reenviar invitación o simular que el colaborador la abre y la acepta, pasando por verificación y 2FA hasta quedar `HABILITADO`.

---

### Fase 4 (F04 y F05) — Matriz de Accesos, Segregación (SoD) y Simulación de Aprobación
* **Referencia Figma:** Frames `85:224` (Matriz por RUC y SoD), `85:113` (Detalle y asignaciones).
* **Entradas:** Selección de persona, empresa vinculada y función operativa.
* **Componentes y `parts/`:**
  * `src/components/gestion-usuarios-empresas/screens/MatrizSegregacion/MatrizSegregacion.jsx`
  * `src/components/gestion-usuarios-empresas/screens/MatrizSegregacion/parts/SimuladorAutorizacionModal.jsx` (Simula solicitud de comprobante, verificación de política SoD: "quien registra no aprueba", y requerimiento de segundo actor).
  * `src/components/gestion-usuarios-empresas/screens/MatrizSegregacion/parts/BitacoraAuditoria.jsx` (Registro en memoria de decisiones de autorización simuladas).
* **Comportamiento interactivo:**
  * Matriz cruzada de Personas vs. Empresas con badges de rol y vigencia.
  * Selector de persona de demostración para probar un caso permitido, uno denegado y uno que requiere aprobación independiente.

---

### Fase 5 (F06) — Cambio de Funciones, Revocación y Reasignación
* **Referencia Figma:** Frame `90:116` (Baja · Revocar y reasignar).
* **Entradas:** Motivo de revocación, ámbito a revocar (solo una empresa o el estudio completo), responsable de reasignación de pendientes.
* **Componentes y `parts/`:**
  * `src/components/gestion-usuarios-empresas/screens/BajaReasignacion/BajaReasignacionModal.jsx`
* **Comportamiento interactivo:**
  * Permite revocar el acceso a una empresa sin que el usuario pierda su pertenencia al estudio ni a otras empresas.
  * Transferencia simulada de tareas pendientes y guardado del evento en la bitácora de auditoría en memoria.

---

### Fase 6 — Conexión de Vistas Adaptadoras y Verificación Integral (QA) [COMPLETADA]
* Conectar `src/views/UsuariosView.jsx` y `src/views/EmpresasView.jsx` como adaptadores limpios. [✓]
* Envolver con `AccessControlProvider` en `App.jsx` manteniendo `App.jsx` liviano. [✓]
* Probar navegación completa `[C1]` y `[C5]`. [✓]
* Verificar que al recargar la página (`F5`), todo vuelva al estado inicial del fixture sin errores. [✓]
* Ejecutar `npm run build` para asegurar compilación sin errores. [✓ - Exitoso en 5.59s]

---

## Resumen de Entregables por Fase

- **F01 (Estudio y Titular):** `EstudioTitularModal.jsx` (Crear estudio -> Invitar titular -> Activar IAM -> Confirmar 2FA).
- **F02 (Cartera de Empresas y Verificación RUC):** `CarteraEmpresas.jsx`, `TablaCartera.jsx`, `ModalVerificarRuc.jsx` (bifurcación RUC nuevo vs RUC existente con código de autorización).
- **F03 (Invitación y Directorio):** `DirectorioUsuarios.jsx`, `InvitacionColaboradorModal.jsx`, `ModalInvitacionPendiente.jsx` (cuenta IAM existente vs nueva, enrolamiento 2FA, transición de PENDIENTE a HABILITADO).
- **F04 (Matriz ReBAC y SoD):** `MatrizSegregacion.jsx` (matriz interactiva por vínculo con KPIs en tiempo real de RUCs sin aprobador y conflictos SoD).
- **F05 (Simulación de Autorización):** `SimuladorAutorizacionModal.jsx` (casos permitido, denegado y segundo actor independiente por principio de 4 ojos), `BitacoraAuditoriaModal.jsx`.
- **F06 (Baja y Reasignación):** `BajaReasignacionModal.jsx`, `ModalDetalleUsuario.jsx` (revocación granular por empresa vs baja del estudio con reasignación).

---

## Iteración de Pulido y Microcopy (Sección 8) [COMPLETADA]

- Retiro de banners de aviso técnico `SimulatedBanner` y sustitución por `ModuloContextBar` discreto. [✓]
- Reubicación de controles "Ver como" y "Restablecer datos" con modal de confirmación. [✓]
- Limpieza de microcopy técnico ("DEMO EN MEMORIA", códigos "F01-F06", "Diagrama 3", URLs IAM simuladas). [✓]
- Dinamización de métricas en el Directorio (reemplazo de badge estático por cálculo real de usuarios "Sin asignación"). [✓]
- Ajustes responsive y accesibilidad (tablas con desplazamiento táctil `overflow-x: auto` y modales con márgenes adaptativos). [✓]
- Compilación final: `npm run build` exitoso (`✓ built in 4.96s`). [✓]


