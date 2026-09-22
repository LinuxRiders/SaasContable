# SaasContable — Propuesta SDD v2 para acceso, empresas, usuarios, roles y permisos

> Instrucciones para la IA que trabajará en `SaasContable` después del nuevo flujo de Login → Estudio → Empresa. Esta versión sustituye la propuesta anterior de gestión de usuarios y empresas. **La fase inmediata es documentar y planificar; no implementar hasta actualizar `spec.md`, `plan.md` y `tasks.md`.**

## 1. Flujo SDD obligatorio

Cada funcionalidad se trabaja siempre en este orden:

1. `spec.md`: problema, actores, flujos, reglas y criterios de aceptación.
2. `plan.md`: arquitectura, estado, componentes, migración y verificación.
3. `tasks.md`: tareas atómicas en el orden real de implementación.
4. Código: únicamente tareas pendientes y aprobadas de `tasks.md`.

Cuando cambie el alcance, primero se actualiza la especificación, después el plan y finalmente las tareas. No se adapta el código directamente desde este documento.

### Spec propuesta

Crear una nueva spec, por ejemplo:

```text
specs/002-gestion-jerarquica-accesos/
  spec.md
  plan.md
  tasks.md
```

La spec anterior `specs/001-gestion-usuarios-empresas/` queda como antecedente de diseño. No se debe continuar implementando sus tareas sin reconciliarla con el flujo oficial actual.

## 2. Fuentes de verdad y prioridad

Usar esta prioridad cuando existan contradicciones:

1. Retroalimentación actual del usuario.
2. Código oficial del nuevo `pull`, especialmente `App.jsx`, `LoginView.jsx`, `Sidebar.jsx`, `Header.jsx`, `EmpresasView.jsx` y `AccountingContext.jsx`.
3. `ContextoProyecto/03-PRD.md`, `05-ADR-LOG.md`, `07-BUSINESS-RULES-REGISTRY.md` y `08-ROADMAP-Y-BACKLOG.md`.
4. `specs/empresas/`, que define Login → Panel global → Empresa activa.
5. Figma, como referencia visual y no como sustituto de las reglas.
6. El módulo anterior `src/components/gestion-usuarios-empresas/`, únicamente como fuente de piezas o ideas reutilizables.

No usar el módulo anterior como arquitectura principal. Primero decidir qué se conserva, qué se adapta y qué se elimina.

## 3. Estado actual verificado tras el nuevo pull

### Lo que ya existe

- `LoginView.jsx` solicita usuario, contraseña y código de estudio.
- `AccountingContext.jsx` crea una sesión simulada con `sesionUsuario` y la conserva en `localStorage`.
- Después del login, `empresaActiva === null` representa el **contexto global del estudio contable**.
- En contexto de estudio, el `Sidebar` muestra Cartera de Empresas, Gestión de Usuarios, Copias de Seguridad, Tablas SUNAT y Plantillas Globales.
- `EmpresasView.jsx` lista las empresas del estudio, permite elegir ejercicio/periodo y contiene un asistente de alta de empresa en tres pasos.
- Al ingresar a una empresa, `empresaActiva` cambia, `App.jsx` abre el área operativa y el `Sidebar` cambia a Compras, Ventas, Tesorería, Libros, Catálogo y Plantillas de Empresa.
- `Header.jsx` muestra estudio o empresa activa y permite salir de la empresa para regresar al panel global.

### Brechas actuales

- El login conoce solo roles rígidos `Admin` y `Maker`; no existe catálogo administrable de roles o permisos.
- La vista oficial de usuarios es plana: mezcla rol de estudio, empresas y estado sin un modelo jerárquico consistente.
- No hay secciones independientes para **Roles** y **Permisos**.
- El modo empresa no tiene gestión local de usuarios, roles ni permisos.
- No existe una relación formal entre identidad, pertenencia al estudio y asignación a empresa.
- `empresas` es una lista compartida en memoria; todavía no expresa `estudioId`, vínculo estudio–empresa ni alcance del usuario.
- Crear una empresa la convierte inmediatamente en `empresaActiva`; el flujo no permite decidir claramente entre “seguir en cartera” o “ingresar ahora”.
- El módulo anterior de gestión de accesos permanece como trabajo local y no coincide completamente con la navegación del nuevo pull.
- El proyecto oficial actual usa React, CSS propio, `theme.css` y Lucide. `package.json` ya no declara Material UI y la constitución prohíbe agregar un UI kit sin una decisión explícita. **No reinstalar ni asumir MUI.**

## 4. Modelo conceptual correcto

El producto tiene tres niveles:

```text
Plataforma SaaS
└── Estudio contable (tenant principal)
    ├── Usuarios y roles del estudio
    ├── Plantillas de roles y configuración heredable
    └── Empresas cliente (ámbitos operativos)
        ├── Usuarios asignados a esa empresa
        ├── Roles heredados o locales
        ├── Permisos efectivos
        └── Módulos contables y configuración propia
```

### Decisión de nombres

- Lo que el usuario llamó “empresa general” se representa en la interfaz como **Estudio contable** o **Panel del estudio**.
- Las organizaciones creadas desde el estudio son **Empresas cliente**.
- Una empresa cliente no es un tenant separado del estudio. Es un ámbito contable aislado dentro del tenant.
- Una misma identidad puede pertenecer a un estudio y tener accesos diferentes en varias empresas.

### Entidades mínimas

| Entidad | Responsabilidad |
|---|---|
| `Identity` | Persona/cuenta que inicia sesión. |
| `Study` | Tenant principal que contrata y administra la cartera. |
| `StudyMembership` | Relación de una identidad con el estudio y su rol global. |
| `LegalCompany` | Empresa identificada por RUC. |
| `StudyCompanyLink` | Relación entre estudio y empresa cliente; contiene estado y configuración heredable. |
| `CompanyAssignment` | Relación de un usuario con una empresa específica. |
| `Permission` | Acción atómica, por ejemplo `users.invite` o `period.close`. |
| `StudyRoleTemplate` | Rol reutilizable definido por el estudio. |
| `CompanyRole` | Rol aplicado dentro de una empresa, heredado o local. |
| `AuditEvent` | Registro de cambios de usuarios, roles, permisos y asignaciones. |

## 5. Decisión recomendada para herencia de roles

Usar una **herencia híbrida y controlada**.

### Nivel plataforma

- Define el catálogo de permisos disponibles.
- Define políticas que nadie puede desactivar: aislamiento entre estudios, periodo cerrado, auditoría y Maker ≠ Checker sobre la misma operación.
- Puede ofrecer roles base del producto, pero el estudio decide cuáles adoptar.

### Nivel estudio

- El titular o administrador crea plantillas de rol para reutilizar en sus empresas.
- Ejemplos: `Administrador del estudio`, `Gestor de cartera`, `Contador aprobador`, `Asistente de registro`, `Auditor`, `Gerente cliente`.
- El rol global del estudio controla acciones globales: crear empresas, invitar personal del estudio, administrar plantillas y consultar la cartera.
- Tener un rol en el estudio no concede por sí solo acceso operativo a todas las empresas.

### Nivel empresa

Cada rol de empresa puede tener uno de tres orígenes:

1. **Heredado y sincronizado:** referencia una plantilla del estudio. Los cambios futuros de la plantilla se reflejan en la empresa.
2. **Copiado y personalizado:** crea una copia local. Los cambios futuros del estudio ya no modifican esa copia.
3. **Local:** se crea solamente para una empresa.

La interfaz debe mostrar siempre el origen: `Heredado del estudio`, `Personalizado` o `Local`.

### Límite de delegación

- Un administrador de empresa solo puede conceder permisos que el estudio le delegó para esa empresa.
- Un rol local puede reducir o combinar permisos dentro de ese límite; no puede elevarse por encima del estudio.
- Las políticas obligatorias no se pueden sobrescribir.
- Cambiar una plantilla heredada debe mostrar cuántas empresas y usuarios serán afectados antes de confirmar.

### Autorización efectiva

Para operar dentro de una empresa se requiere la intersección de:

```text
sesión válida
+ pertenencia activa al estudio
+ vínculo activo estudio–empresa
+ asignación activa del usuario a esa empresa
+ permisos del rol de empresa
+ políticas obligatorias y segregación de funciones
```

Para una acción global del estudio se evalúa el rol global, sin exigir una empresa activa.

## 6. Flujo objetivo completo

### F00 — Login

1. La persona ingresa usuario, contraseña y código de estudio.
2. El sistema carga la identidad y su membresía del estudio.
3. Se abre el Panel del estudio sin empresa activa.
4. La cartera muestra solamente las empresas a las que la persona tiene acceso, salvo que su rol global tenga alcance total de cartera.

El login existente se conserva como punto de entrada. No duplicar la creación del estudio dentro del flujo normal. El alta de estudios pertenece a una administración de plataforma separada y futura.

### F01 — Panel global del estudio

El estudio administra:

- Cartera de empresas.
- Usuarios del estudio.
- Roles y permisos del estudio.
- Plantillas de roles para empresas.
- Invitaciones y accesos pendientes.
- Auditoría de accesos.
- Configuración maestra existente.

Navegación global propuesta:

```text
Administración del estudio
├── Cartera de empresas
├── Usuarios
├── Roles y permisos
├── Invitaciones
└── Auditoría de accesos
```

### F02 — Crear, invitar o vincular una empresa

Desde Cartera de empresas:

1. Elegir `Crear o vincular empresa`.
2. Ingresar RUC.
3. Si el RUC no existe en la cartera, completar datos legales y crear el vínculo.
4. Si ya está vinculado al estudio, impedir el duplicado.
5. Si en el sistema futuro existe para otro estudio, solicitar o confirmar el nuevo vínculo sin compartir datos contables entre estudios.
6. Definir configuración inicial: módulos, ejercicio, periodo, PCGE activo y plantillas.
7. Elegir la política inicial de roles:
   - aplicar plantillas del estudio;
   - copiar roles para personalizarlos;
   - configurar después.
8. Confirmar la creación.
9. Mostrar dos acciones: `Volver a la cartera` e `Ingresar a la empresa`.

Crear una empresa desde el estudio crea el vínculo y su espacio operativo; no crea automáticamente usuarios nuevos.

### F03 — Gestión de usuarios del estudio

1. Invitar o seleccionar una identidad existente.
2. Asignar un rol global del estudio.
3. Elegir las empresas a las que tendrá acceso.
4. Para cada empresa, asignar un rol de empresa y vigencia.
5. Revisar conflictos de segregación.
6. Dejar la invitación en estado pendiente hasta su aceptación.

Estados mínimos: `Pendiente`, `Pendiente de activación`, `Habilitado`, `Suspendido`, `Expirado` y `Revocado`.

### F04 — Gestión de roles y permisos del estudio

La pantalla debe permitir:

- Listar roles de sistema y roles personalizados.
- Crear un rol desde cero o duplicar una plantilla.
- Editar nombre, descripción y permisos.
- Ver usuarios y empresas afectadas.
- Desactivar un rol sin borrar el historial.
- Impedir eliminar un rol con asignaciones activas hasta reasignarlas.
- Mostrar conflictos con políticas obligatorias.

Los permisos se presentan agrupados por capacidad, no como una lista técnica interminable:

```text
Empresas: ver, crear, editar, archivar, ingresar
Usuarios: ver, invitar, editar, suspender, asignar empresas
Roles: ver, crear, editar, asignar
Operaciones: registrar, modificar, aprobar, anular
Periodos: abrir, cerrar, reabrir
Reportes: ver, exportar
Auditoría: consultar
```

### F05 — Ingresar a una empresa

1. La persona elige empresa, ejercicio y periodo.
2. El sistema valida su asignación y rol de empresa.
3. Se activa el contexto de empresa.
4. El menú operativo muestra solo los módulos y acciones permitidos.
5. El encabezado mantiene visibles empresa, RUC, periodo y origen del acceso.
6. `Salir de empresa` vuelve al Panel del estudio sin cerrar sesión.

### F06 — Administración local de la empresa

El modo empresa añade un grupo de navegación:

```text
Administración de la empresa
├── Usuarios de la empresa
├── Roles y permisos
└── Configuración de acceso
```

Desde ahí, un administrador autorizado puede:

- Invitar usuarios con alcance exclusivo a esa empresa.
- Asignar roles heredados, copiados o locales.
- Crear o editar roles locales dentro del límite delegado.
- Ver permisos efectivos y su origen.
- Suspender acceso solo a esa empresa.

Un gerente cliente o usuario local de empresa no debe obtener acceso al panel global del estudio salvo que también tenga una membresía global con permisos.

### F07 — Cambios, baja y auditoría

- Cambiar un rol conserva el historial.
- Quitar una empresa a un usuario no elimina su cuenta ni sus otros accesos.
- Suspender la membresía del estudio bloquea todas sus asignaciones dentro de ese estudio.
- Antes de revocar, se revisan pendientes y se reasignan tareas.
- Toda modificación relevante genera un evento de auditoría visible.

## 7. Separación de usuarios por alcance

### Usuarios del estudio

Personal interno que puede recibir permisos globales y asignaciones a varias empresas: titular, administrador, contador y asistente.

### Usuarios de empresa

Personas invitadas con alcance limitado a una empresa: gerente, auditor externo o personal delegado del cliente.

Ambos son identidades del mismo sistema. La diferencia está en sus membresías y asignaciones, no en crear dos tipos incompatibles de cuenta.

## 8. Navegación que debe conservarse y ampliarse

### Contexto estudio (`empresaActiva === null`)

Conservar la navegación dinámica actual y añadir `roles_estudio`, `invitaciones` y `auditoria_accesos` cuando sus tareas sean aprobadas.

### Contexto empresa (`empresaActiva !== null`)

Conservar los módulos operativos actuales y añadir `usuarios_empresa` y `roles_empresa` dentro de Configuración/Administración.

No crear otra aplicación, otro login ni un segundo dashboard paralelo. `App.jsx` sigue componiendo el contexto y las vistas, pero no debe contener la lógica de formularios o permisos.

## 9. Estrategia para adaptar lo anterior

### Conservar

- Estados de invitación y activación.
- Asignación explícita de usuarios a empresas.
- Matriz de accesos y detección de conflictos SoD.
- Baja parcial por empresa, reasignación y auditoría.
- Componentes pequeños que no dupliquen el flujo actual.

### Rehacer o integrar

- La cartera anterior se reemplaza por la `EmpresasView` oficial del nuevo pull, dividiéndola en componentes sin perder su flujo de alta y selección de periodo.
- La creación de estudio/titular anterior no aparece después del login; queda fuera del alcance normal del usuario del estudio.
- El directorio anterior debe separar rol global de estudio y roles por empresa.
- La invitación anterior debe permitir origen global o local de empresa.
- La matriz anterior debe mostrar permisos efectivos, origen del rol y ámbito.

### No reutilizar directamente

- Un estado paralelo que mantenga otra lista diferente de empresas.
- Pantallas que llamen “empresa” al estudio.
- Accesos automáticos a todos los RUC por tener un rol general.
- Roles rígidos embebidos en componentes.
- La activación automática de una empresa recién creada sin decisión del usuario.

## 10. Arquitectura frontend propuesta

Mantener las vistas como adaptadores y separar el módulo por ámbito:

```text
src/components/access-management/
  study/
    StudyUsers/
    StudyRoles/
    Invitations/
    AccessAudit/
  company/
    CompanyUsers/
    CompanyRoles/
    EffectivePermissions/
  shared/
    RoleEditor/
    PermissionMatrix/
    ScopeBadge/
    AssignmentEditor/
  state/
    AccessManagementContext.jsx
    accessManagementReducer.js
    selectors.js
  fixtures/
    accessFixtures.js
```

Antes de crear esta carpeta, la `plan.md` debe decidir si se renombra y migra la carpeta anterior o si se adapta en el lugar. No mantener dos módulos de accesos activos.

### Estado

- `AccountingContext` sigue siendo dueño de sesión, empresa activa, ejercicio, periodo y datos contables existentes.
- El estado de usuarios, roles, permisos, invitaciones y asignaciones debe tener un solo origen de verdad en un contexto especializado.
- La lista visible de empresas debe derivarse de la cartera oficial y de las asignaciones; no duplicarse en fixtures incompatibles.
- Para esta fase no hay backend. Mantener el comportamiento actual de sesión y usar mocks/estado frontend según defina la nueva spec. No ampliar persistencia de accesos sin aprobación.

### Stack

- React 18, JavaScript, Context/reducer, Lucide y `theme.css`.
- No agregar router, TypeScript, gestor global ni UI kit.
- No reinstalar Material UI mientras `AGENTS.md` y la constitución mantengan el stack actual.

## 11. Fases de implementación propuestas

1. **Reconciliación:** actualizar mapa, identificar archivos oficiales y aislar el módulo anterior.
2. **Modelo de acceso:** fixtures, entidades, reducer, selectores y permisos efectivos.
3. **Panel del estudio:** usuarios, roles, permisos, invitaciones y asignación de empresas.
4. **Alta de empresa:** integrar herencia inicial de roles sin duplicar la cartera existente.
5. **Panel de empresa:** usuarios y roles locales/heredados.
6. **Matriz y auditoría:** origen de permisos, SoD, baja y reasignación.
7. **Pulido y verificación:** responsive, accesibilidad, build y recorridos manuales.

Cada fase debe existir primero en `tasks.md` y cerrarse solo después de verificarse.

## 12. Escenarios de aceptación de la nueva propuesta

1. Admin inicia sesión y llega al Panel del estudio sin empresa activa.
2. Crea una empresa, elige heredar roles y decide si entra o vuelve a cartera.
3. Crea una plantilla de rol en el estudio y ve en qué empresas se usa.
4. Invita a un colaborador, le da rol global y lo asigna a dos empresas con roles distintos.
5. El colaborador inicia sesión y ve exactamente esas dos empresas.
6. Entra a una empresa y solo ve acciones permitidas por su rol local.
7. Un administrador de empresa copia un rol heredado, lo personaliza y no cambia la plantilla del estudio.
8. El sistema impide conceder permisos por encima del límite delegado.
9. Maker no puede aprobar la misma operación que registró, aunque su rol tenga ambas capacidades generales.
10. Revocar acceso a una empresa conserva los demás accesos y el historial.
11. Suspender la membresía del estudio bloquea todos los accesos de ese estudio.
12. Salir de empresa regresa al Panel del estudio sin cerrar sesión.

## 13. Límites de la fase

- No conectar ni modificar backend.
- No crear autenticación, 2FA, correos o permisos reales.
- No modificar módulos contables ajenos salvo integración mínima aprobada.
- No afirmar que SUNAT verificó un RUC si se usan datos mock.
- No borrar el trabajo anterior hasta que la nueva `plan.md` indique qué se migra.
- No programar desde esta propuesta: primero crear la nueva cadena `spec.md → plan.md → tasks.md`.

## 14. Próximo paso obligatorio

La siguiente IA debe:

1. Actualizar `docs/PROJECT_MAP.md` con el código del nuevo pull y separar estado oficial de trabajo local anterior.
2. Crear `specs/002-gestion-jerarquica-accesos/spec.md` con los flujos F00–F07 y las decisiones abiertas.
3. Pedir validación del usuario sobre la spec, especialmente herencia de roles y delegación local.
4. Crear `plan.md` y `tasks.md` solo después de esa validación.
5. No modificar pantallas hasta que existan tareas aprobadas.
