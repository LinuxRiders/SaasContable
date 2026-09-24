# 006 Reversiones Formales (S6) - Especificación

> [!WARNING]
> **PENDIENTE DE REALINEAR CON SDD v3.0.** Este spec se escribió sobre el modelo anterior (compra/venta). No implementar hasta rehacerlo con `/speckit-specify` tomando como base el SDD v3.0 (§5, §20, §21) y el contrato del spec 001 (`specs/001-motor-plantillas-contables/contracts/`). Debe usar `lines` con `side` invertido (§13.2), conservar la plantilla y el tipo de documento del original y respetar `accountingDate` (RD-12).

## Resumen
Implementación del subsistema de reversión formal (S6) del ContableOS. Este módulo permite la reversión de asientos contables (`JournalEntry`) que ya se encuentran en estado `POSTED`. La reversión no modifica el asiento original (inmutabilidad), sino que genera un nuevo asiento con los montos invertidos, el cual sigue el ciclo de vida completo de Maker-Checker (DRAFT → PENDING_APPROVAL → POSTED).

## Historias de Usuario
- **US1**: Solicitar reversión de un asiento POSTED. Genera un nuevo `JournalEntry` inverso en estado DRAFT con `reversalOfId` apuntando al original.
- **US2**: Ciclo Maker-Checker para reversiones. El nuevo asiento sigue exactamente el mismo flujo de validación y publicación.
- **US3**: Control de periodos. No se puede revertir un asiento de un periodo cerrado sin autorización de nivel máximo según el DoA.
- **US4**: Trazabilidad visual. Ver desde un asiento original si tiene reversiones vinculadas y acceder a ellas.

## Requisitos No Funcionales [RD-07, RD-11, RD-12, RF-07, CU-03, HU-04]
- **Inmutabilidad**: El asiento original debe mantener su estado `POSTED` y no debe alterarse. No existe estado REVERSED — el asiento original permanece en POSTED.
- **Auditoría**: Todas las acciones de reversión deben ser auditables (quién, cuándo, por qué).
- **Consistencia**: Los montos invertidos deben sumar 0 junto con el original al publicar.

## Principios Constitucionales
- Aplicación de principios I a VII de ContableOS.
- Separación de lógica de dominio y servicios asíncronos.

## Trazabilidad SDD
| SDD Ref | Cobertura |
|---------|----------|
| RD-07 | Inmutabilidad de POSTED |
| RD-11 | Reversiones en borrador |
| RD-12 | Control de periodos |
| RF-07 | Reversión de asiento |
| CU-03 | Flujo de reversión |
| HU-04 | Reversión manual |
