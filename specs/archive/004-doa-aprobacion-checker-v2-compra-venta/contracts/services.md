# Contratos y Servicios

## 1. DoAEngine (`src/domain/ingestion/doaEngine.js`)
Puro, síncrono.
```javascript
/**
 * Evalúa un asiento y devuelve la decisión de ruteo.
 * @param {Object} journalEntry - El asiento contable en centavos.
 * @param {Object} doaMatrix - Configuración DoA del tenant.
 * @returns {ApprovalDecision}
 */
export function evaluateRisk(journalEntry, doaMatrix) { ... }
```

## 2. SignatureService (`src/domain/ingestion/signatureService.js`)
Puro, asíncrono (debido a crypto.subtle) o síncrono simulado.
```javascript
/**
 * Genera una firma determinística del payload.
 * @param {Object} payload - Asiento a firmar.
 * @param {string} userId - ID del usuario aprobador.
 * @returns {Promise<Signature>}
 */
export async function generateSignature(payload, userId, level) { ... }
```

## 3. ApprovalService (`src/services/ingestion/approvalService.js`)
Impuro, maneja almacenamiento y roles.
```javascript
/**
 * Orquesta el flujo de aprobación o rechazo de un asiento.
 * @param {Object} context - { tenantId, userId, role }
 * @param {string} entryId - ID del asiento a revisar.
 * @param {string} action - "APPROVE" | "REJECT"
 * @param {string} [rejectReason] - Requerido si action === "REJECT"
 * @returns {Promise<{ok: boolean, data?: any, error?: any}>}
 */
export async function processApproval(context, entryId, action, rejectReason) { ... }
```
