# 006 Reversiones Formales - Checklist de Requisitos

## Reglas de Negocio
- [ ] Sólo se pueden revertir asientos cuyo estado sea `POSTED`.
- [ ] El asiento original debe permanecer intacto (`POSTED`).
- [ ] El nuevo asiento se crea en estado `DRAFT`.
- [ ] El nuevo asiento debe tener `reversalOfId` poblado con el ID original.
- [ ] Las líneas del asiento reverso deben reflejar los montos invertidos.
- [ ] Los montos deben estar siempre en centavos (integers).
- [ ] Debe exigirse un motivo (`reason`).
- [ ] Control de periodo: Permitir reversión en periodo cerrado SOLO si el rol es Admin (o max level).

## UI / Experiencia
- [ ] Botón "Solicitar Reversión" visible sólo en detalles de asientos `POSTED`.
- [ ] Modal de confirmación y captura de justificación.
- [ ] Indicador visual en el asiento original si existen reversiones (trazabilidad).
- [ ] Textos y etiquetas en español.

## Pruebas
- [ ] Tests de Vitest para la lógica de inversión de montos en `src/domain/`.
- [ ] Tests para las reglas de validación de estado y periodo.
