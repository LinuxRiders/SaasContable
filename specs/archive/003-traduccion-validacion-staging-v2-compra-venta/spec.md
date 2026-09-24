# Spec 003: Traducción, Validación y Bandeja Staging (HITL)

> [!WARNING]
> **PENDIENTE DE REALINEAR CON SDD v3.0.** Este spec se escribió sobre el modelo anterior (compra/venta). No implementar hasta rehacerlo con `/speckit-specify` tomando como base el SDD v3.0 (§5, §20, §21) y el contrato del spec 001 (`specs/001-motor-plantillas-contables/contracts/`). Traduce con "la plantilla AST activa" por tipo de documento. Debe rehacerse sobre la interpretación contable completa (§5.3): esquema, perspectiva, clasificación, selección de plantilla, roles de cuenta y registro tardío (RD-12), usando `accountingEngine` del spec 001, y con los motivos de pendiente del §5.5.

## 1. Introducción
Esta especificación (S2 y S3) cubre el Motor de Traducción de Documentos Canónicos a Asientos Contables (JournalEntry) utilizando plantillas AST, así como el flujo de validación automática (Reglas de Negocio RD-03, RD-09, RD-12) y el enrutamiento a la Bandeja Staging (PENDING_INPUT) para intervención humana (Maker) cuando hay excepciones.

## 2. Subsistemas (SDD S2 y S3)
* **S2 (Motor de Traducción)**: Toma un `CanonicalDocument`, verifica tasas FX, aplica el `TenantContext` y usa el Motor AST para generar un `JournalEntry` en estado `DRAFT`.
* **S3 (Máquina de Estados: Validación y HITL)**: Evalúa el `DRAFT`. Valida cuadre (RD-03), integridad del período (RD-12) y completitud de tags. Si es exitoso, avanza a `PENDING_APPROVAL`. Si falla o faltan datos, va a `PENDING_INPUT` (Staging). Un `Maker` interviene, completa datos, y re-evalúa el AST o cancela el documento.

## 3. Historias de Usuario
* **US1 (P1)**: Como sistema, quiero traducir un `CanonicalDocument` a un `JournalEntry` (DRAFT) evaluando la plantilla AST activa.
* **US2 (P1)**: Como sistema, quiero validar el cuadre estricto (RD-03), el período contable abierto (RD-12) y los tags. Si pasa, el estado es `PENDING_APPROVAL`; si falla, `PENDING_INPUT`.
* **US3 (P1)**: Como Maker, quiero revisar la Bandeja Staging (PENDING_INPUT), ingresar datos faltantes (ej. centros de costo) y re-procesar el documento.
* **US4 (P2)**: Como Maker, quiero cancelar documentos en Staging proveyendo una justificación, pasando el estado a `CANCELLED`.
* **US5 (P3)**: Como sistema, quiero emitir alertas SLA si un documento permanece en Staging por más de 48h sin intervención.

## 4. Reglas de Negocio
* **RD-03**: Ecuación Patrimonial Rígida (Σ Débitos = Σ Créditos en moneda funcional). Montos en CENTAVOS.
* **RD-09**: Redondeo FX provisional flag, calculado una sola vez por línea.
* **RD-12**: Solo asentar en períodos abiertos.
* **RF-03**: Evaluación AST conditional y aritmética.
* **RF-04/10**: Bandeja Staging, concurrencia optimista, cancelación justificada.
* **NRF-10/13**: SLA 48h y Concurrencia Optimista.

## Eventos Emitidos [§11]
- `JournalEntryDrafted` — emitido cuando el motor AST genera el asiento en DRAFT (gatillo: traducción exitosa)
- `JournalEntrySentToStaging` — emitido cuando el asiento va a PENDING_INPUT (gatillo: validación falla, requiere Maker)
- `JournalEntryCancelled` — emitido cuando el Maker cancela el documento (gatillo: PENDING_INPUT → CANCELLED)

## Trazabilidad SDD
Etiquetas de trazabilidad: [RF-03], [RF-04], [RF-10], [RF-11], [RD-03], [RD-09], [RD-12], [CU-01], [CU-07], [CU-08], [HU-02], [HU-07]
