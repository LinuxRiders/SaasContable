# Checklist de Requerimientos SDD

## Dominio
- [ ] `JournalState` incluye `PENDING_INPUT`, `PENDING_APPROVAL`, `CANCELLED` (SDD 10.2).
- [ ] `JournalEntry` usa montos en centavos (enteros) y `entityVersion` (NRF-13).
- [ ] Validador RD-03: Rechaza si Σ Débitos != Σ Créditos en moneda funcional.
- [ ] Validador RD-09: Tasa FX provisional calculada por línea sin derivas flotantes.
- [ ] Validador RD-12: Verifica que el `accountingPeriod` esté abierto.
- [ ] Motor AST inyecta valores y evalúa reglas lógicas/aritméticas (RF-03).
- [ ] Motor AST previene sobrescritura sin versionado de entidad concurrente.

## Servicios
- [ ] `translationService` orquesta la traducción sin lógica de negocio pura.
- [ ] `stagingService` lista documentos en `PENDING_INPUT`.
- [ ] `stagingService` expone actualización y re-evaluación para el Maker.
- [ ] `stagingService` expone cancelación con justificación (RF-10, CU-07).
- [ ] Validación SLA 48h (NRF-10) reportable.
- [ ] Admin role sortea cualquier validación de UI/permisos para pruebas.

## UI / Componentes
- [ ] `BandejaView` en React 18 (español).
- [ ] Manejo de concurrencia optimista: error amigable si `entityVersion` cambia.
- [ ] Formulario `MakerEditor` permite completar `analyticTags` faltantes.
