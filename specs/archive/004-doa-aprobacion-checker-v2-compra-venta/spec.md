# Feature 004: DoA, Aprobación y Checker

> [!WARNING]
> **PENDIENTE DE REALINEAR CON SDD v3.0.** Este spec se escribió sobre el modelo anterior (compra/venta). No implementar hasta rehacerlo con `/speckit-specify` tomando como base el SDD v3.0 (§5, §20, §21) y el contrato del spec 001 (`specs/001-motor-plantillas-contables/contracts/`). Permite al Admin saltarse la segregación de funciones. Debe alinearse con RF-05: la intervención manual o la extracción dudosa obligan a un Checker; el Admin de Plantillas no aprueba (§14).

## 1. Visión General
Este feature implementa el Subsistema S4 del SDD (Motor DoA y Firmas). Su propósito es evaluar el riesgo de los asientos contables generados (`JournalEntry`) en estado `PENDING_APPROVAL`, y determinar si pueden ser aprobados automáticamente (STP - Straight Through Processing) o si requieren la revisión de un humano (Checker).

## 2. Reglas de Negocio (Business Rules)
- **DoA (Delegation of Authority):** Matriz configurable por tenant que determina los límites de aprobación según monto (en centavos), tipo de documento, moneda y riesgo inherente.
- **Segregación de Funciones (SoD):** El usuario que ingresa el documento (Maker) no puede aprobarlo (Checker). Única excepción: rol Admin (para testing).
- **Provisional FX:** Si la transacción involucra una tasa de cambio provisional, se fuerza la revisión manual, bloqueando el STP (RD-09).
- **Transición Criptográfica:** El pase de `PENDING_APPROVAL` a `POSTED` requiere obligatoriamente una firma (simulada con hash SHA-256 de payload, userId y timestamp) (RD-06).
- **Rechazo:** El Checker puede rechazar el asiento, pasando su estado a `REJECTED`, requiriendo un motivo obligatorio.

## 3. Arquitectura
Se adhiere a los principios de la Constitución del Proyecto:
- **Dominio Puro (ACL):** Toda la lógica del Motor DoA y validación de firmas reside en `src/domain/ingestion/`. Sin dependencias de UI o localStorage.
- **Servicios:** `src/services/ingestion/approvalService.js` orquesta la persistencia, el chequeo de roles y el firmado.
- **UI:** Vistas en React para listar los pendientes y un panel lateral/modal para el Checker con el detalle del asiento, payload original y formulario de firma.

## 4. Máquina de Estados
Transiciones permitidas en este módulo:
- `PENDING_APPROVAL (Evaluando_DoA)` → `Esperando_Firma_STP` (bajo riesgo)
- `PENDING_APPROVAL (Evaluando_DoA)` → `Esperando_Firma_Humana` (riesgo alto o FX provisional)
- `PENDING_APPROVAL` → `POSTED` (firma válida generada)
- `PENDING_APPROVAL` → `REJECTED` (Checker rechaza con motivo)

## Eventos Emitidos [§11]
- `JournalEntryRejected` — emitido cuando el Checker rechaza el asiento (gatillo: PENDING_APPROVAL → REJECTED)

## Trazabilidad SDD
Etiquetas de trazabilidad: [RF-05], [RF-10], [RD-05], [RD-06], [CU-01 Alt 2/3], [HU-03]
