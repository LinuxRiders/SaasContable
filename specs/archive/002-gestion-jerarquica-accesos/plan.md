# Plan 002 — Roles, permisos y herencia

## 1. Estado

Un solo reducer mantiene `users`, `roles`, `assignments` y `auditEvents`. Las empresas proceden del `AccountingContext`.

## 2. Selectores

- Roles disponibles por empresa: plantillas activas + roles locales de esa empresa.
- Empresas accesibles por usuario: alcance total global o IDs de asignaciones activas.
- Usuarios por empresa: membresías activas con asignación activa.
- Permisos efectivos: permisos del rol de empresa limitados al catálogo delegable.

## 3. UI

- `AccessManagementView`: directorio y matriz.
- `RolesManagementView`: catálogo y editor.
- `InviteUserModal`: invitación y asignaciones.
- `RoleEditorModal`: alta/edición de roles.

## 4. Restricciones

React/CSS/Lucide; sin UI kit, backend o rutas nuevas. Formularios controlados y modales existentes.
