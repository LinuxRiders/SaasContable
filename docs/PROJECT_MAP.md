# Mapa del proyecto — Gestión jerárquica de accesos

Fecha de actualización: 2026-09-21  
Estado: Specs 001 y 002 implementadas y verificadas  
Alcance: MVP frontend, sin integración con backend IAM

## 1. Flujo vigente

El pull actual ya proporciona el inicio de sesión, el estudio contable de la sesión, la creación de empresas y la selección de empresa/período. La gestión de accesos se integra sobre ese flujo; no vuelve a crear el estudio, el titular ni una identidad IAM paralela.

```text
Login existente
  └─ Estudio contable activo (ámbito global)
       ├─ Cartera de empresas
       ├─ Usuarios del estudio
       ├─ Roles globales y plantillas de empresa
       └─ Empresa seleccionada (ámbito empresa)
            ├─ Operaciones contables existentes
            ├─ Usuarios asignados a la empresa
            └─ Roles heredados, copiados o locales
```

La jerarquía funcional es:

- Una sesión pertenece a un estudio contable.
- El estudio administra una cartera de empresas.
- Una persona puede pertenecer al estudio y tener acceso a cero, una, varias o todas las empresas.
- El rol global habilita administración del estudio.
- Cada asignación de empresa tiene su propio rol operativo.
- Los roles de empresa pueden usar una plantilla del estudio, copiarla para personalizarla o crearse localmente.
- Un rol local solo puede contener permisos delegables del ámbito empresa.

## 2. Integración existente conservada

| Responsabilidad | Archivo | Decisión |
|---|---|---|
| Login y sesión mock | `src/views/LoginView.jsx`, `src/context/AccountingContext.jsx` | Se conservan como entrada oficial. |
| Estudio de la sesión | `sesionUsuario.codigoEstudio` | Es el tenant activo del MVP. |
| Cartera y empresa activa | `AccountingContext` y `src/views/EmpresasView.jsx` | Continúan siendo la fuente oficial. |
| Navegación | `activeTab` en `src/App.jsx` | Se conserva; no se añadió router. |
| Operación contable | Vistas existentes de compras, ventas, tesorería, libros y cierre | No fue modificada por esta entrega. |

## 3. Módulo implementado

```text
src/components/gestion-usuarios-empresas/
  fixtures/
    accessFixtures.js
  state/
    AccessManagementContext.jsx
  screens/
    AccessManagementView.jsx
    RolesManagementView.jsx
    parts/
      AccessMatrix.jsx
      InviteUserModal.jsx
      RoleEditorModal.jsx
  styles/
    accessManagement.css
```

Los adaptadores de primer nivel son `src/views/UsuariosView.jsx` y `src/views/RolesPermisosView.jsx`.

`src/App.jsx` monta `AccessManagementProvider` dentro de `AccountingProvider`, de modo que el módulo lee la sesión, la cartera y la empresa activa sin duplicarlas.

## 4. Navegación por ámbito

### Estudio

- Cartera de Empresas
- Gestión de Usuarios
- Roles y Permisos
- Configuración global ya existente

### Empresa

- Módulos contables ya existentes
- Usuarios de la Empresa
- Roles y Permisos

Los enlaces y las acciones administrativas se muestran según los permisos efectivos del usuario de sesión. La cartera también se filtra por asignaciones cuando el usuario no tiene alcance total.

## 5. Capacidades del MVP

- Directorio global y por empresa.
- Búsqueda por nombre, correo o documento.
- Invitación pendiente con rol global y roles distintos por empresa.
- Matriz usuario por empresa.
- Suspensión de membresía global.
- Revocación de una asignación sin eliminar la identidad ni las demás empresas.
- Catálogo de roles globales y plantillas de empresa.
- Creación y edición de roles.
- Herencia por referencia de plantillas del estudio.
- Copia de plantilla como rol local personalizable.
- Restricción de permisos locales al catálogo delegable de empresa.
- Registro de eventos de auditoría en estado local.

## 6. Límites intencionales

- No hay llamadas al backend IAM.
- No se envían correos reales ni se ejecuta 2FA real.
- Los cambios de usuarios y roles viven en memoria y se reinician al recargar.
- La sesión del Login existente conserva su comportamiento actual con `localStorage`.
- No se modificaron los módulos contables fuera de los puntos mínimos de navegación y filtrado de cartera.

## 7. Verificación

- `npm run build`: correcto con Vite 6; 1630 módulos transformados.
- Flujo probado: Login administrador → estudio → gestión de usuarios → roles → ingreso a empresa → usuarios/roles de empresa → salida al estudio.
- Invitación probada: alta local con estado `PENDIENTE`, rol global y asignación de empresa.
- Herencia probada: copia de `Contador aprobador` como rol local personalizado sin modificar la plantilla original.
- Menús y acciones condicionados por permisos efectivos.

## 8. Documentación SDD

- `specs/001-gestion-usuarios-empresas/`: adaptación e integración del módulo al flujo real del pull.
- `specs/002-gestion-jerarquica-accesos/`: jerarquía de roles, permisos, herencia y alcance.
- Cada Spec mantiene el orden obligatorio `spec.md` → `plan.md` → `tasks.md`.

El archivo `docs/implementation-report-legacy.md` queda únicamente como historial de la primera propuesta descartada; no describe la implementación vigente.
