# Especificaciones del proyecto

Cada funcionalidad se documenta en una carpeta numerada y se trabaja siempre en este orden:

1. `spec.md`: define qué se debe construir y sus criterios de aceptación.
2. `plan.md`: explica cómo se implementará la Spec.
3. `tasks.md`: contiene las tareas ejecutables. El desarrollo se realiza desde esta lista y cada tarea se marca al completarse.

## Regla de ejecución

- No programar directamente desde `spec.md` o `plan.md`.
- Antes de comenzar, leer los tres documentos en orden.
- Implementar únicamente tareas no completadas de `tasks.md`.
- Marcar `[x]` solo después de implementar y verificar la tarea.
- Si cambia el alcance, actualizar primero `spec.md`, luego `plan.md` y finalmente regenerar o ajustar `tasks.md`.
- Los mapas generales y reportes de estado viven en `docs/`; no sustituyen las tareas de una Spec.

## Specs

- [001 — Gestión de usuarios y empresas](./001-gestion-usuarios-empresas/spec.md)
- [002 — Gestión jerárquica de accesos](./002-gestion-jerarquica-accesos/spec.md)
