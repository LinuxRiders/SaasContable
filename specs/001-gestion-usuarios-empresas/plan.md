# Plan 001 — Adaptación al Login, estudio y empresa actuales

## 1. Estrategia

Usar `AccountingContext` como dueño de sesión, cartera, empresa activa y periodo. Sustituir el estado anterior duplicado por un contexto especializado que solo gestione identidades, membresías, roles, asignaciones y auditoría.

## 2. Integración

- `App.jsx`: incorporar `AccessManagementProvider` dentro de `AccountingProvider` y registrar vistas de usuarios/roles en ambos ámbitos.
- `Sidebar.jsx`: conservar navegación dinámica y agregar accesos de usuarios y roles dentro de empresa.
- `EmpresasView.jsx`: filtrar la cartera por asignaciones del usuario de sesión.
- `UsuariosView.jsx`: adaptador del directorio según el ámbito actual.
- `RolesPermisosView.jsx`: adaptador del catálogo de roles según el ámbito actual.

## 3. Migración

Eliminar pantallas anteriores que duplican estudio/cartera. Reutilizar conceptos de invitación, matriz y baja mediante componentes nuevos y más pequeños. No mantener ambos reducers activos.

## 4. Verificación

- Admin y Maker desde accesos rápidos del Login.
- Panel global y empresa activa.
- Invitación, asignación y baja parcial.
- Build de producción.
