# Data Model: Delegación de Autoridad, Firma y Aprobación

**Feature**: 004-doa-aprobacion-checker · `@typedef` en `src/domain/approval/types.js`

## 1. DoaMatrix — `<tenantId>:doaMatrix` (arreglo de versiones; la última es la vigente)

```js
/** @typedef {Object} DoaMatrix
 * @property {string} tenantId
 * @property {number} version
 * @property {'STP_AUTO'|'CHECKER_L1'|'CHECKER_L2'|'CHECKER_MAX'} defaultLevel
 * @property {Array<{ id: string, description: string, when: Expression, level: string }>} rules
 * @property {Record<string, 'CHECKER_L1'|'CHECKER_L2'|'CHECKER_MAX'>} checkerLevels
 * @property {Array<{ id: string, userId: string, scope: { documentTypeCodes?: string[], maxTotalMinor?: number }, reason: string, createdBy: string, createdAt: string, expiresAt: string|null }>} sodExceptions
 * @property {string[]|null} diffFromPrevious
 * @property {string} updatedBy
 * @property {string} updatedAt
 */
```

**Semilla (empresas `01` y `02`)**, en unidades mínimas de PEN:

| id | Condición (`approval.*`) | Nivel |
|---|---|---|
| `R-STP` | `totalFunctionalMinor <= 500000` | `STP_AUTO` |
| `R-L1` | `totalFunctionalMinor > 500000` y `<= 5000000` | `CHECKER_L1` |
| `R-L2` | `totalFunctionalMinor > 5000000` | `CHECKER_L2` |
| `R-PAYROLL` | `operationTypeCode == 'PAYROLL'` | `CHECKER_L1` |
| `R-ASSET` | `operationTypeCode == 'FIXED_ASSET_ACQUISITION'` | `CHECKER_L1` |
| `R-ASSET-L2` | `operationTypeCode == 'FIXED_ASSET_ACQUISITION'` y `totalFunctionalMinor > 1000000` | `CHECKER_L2` |
| `R-REV-CLOSED` | `isReversal` y `reversalOfClosedPeriod` | `CHECKER_MAX` |

`defaultLevel: 'CHECKER_L1'` · `checkerLevels: { revisor_luis: 'CHECKER_L1', gerente_rosa: 'CHECKER_MAX' }` · `sodExceptions: []`.

`totalFunctionalMinor` = Σ `functionalAmountMinor` de las líneas `DEBIT`.

## 2. ApprovalDecision — `entry.approvalDecision`

```js
/** @typedef {Object} ApprovalDecision
 * @property {'STP_AUTO'|'CHECKER_L1'|'CHECKER_L2'|'CHECKER_MAX'} level
 * @property {boolean} requiresHumanReview
 * @property {Array<{ source: 'MATRIX'|'SYSTEM_FLOOR'|'DEFAULT', ruleId: string|null, description: string, level: string }>} reasons
 * @property {number} matrixVersion
 * @property {string} evaluatedAt
 * @property {'SIGNING_SERVICE_DOWN'|'PERIOD_CLOSED'|null} blockedBy
 */
```

## 3. Signature — `<tenantId>:signatures` (solo agregado)

```js
/** @typedef {Object} Signature
 * @property {string} id
 * @property {string} journalEntryId
 * @property {number} entityVersion
 * @property {'STP'|'HUMAN'} kind
 * @property {string} signerId              // 'stp-agent' o userId
 * @property {string} role                  // 'SYSTEM' | 'CHECKER'
 * @property {string} level
 * @property {string} contentHash
 * @property {string} signature
 * @property {string} signedAt
 * @property {string|null} sodExceptionId
 */
```

El asiento guarda `approvedBy`, `signatureRef` (id) y `signedAt`.

## 4. Rechazo

Campos nuevos del asiento: `rejectedBy`, `rejectedAt`, `rejectionReason`, `supersededByEntryId`; en el asiento que lo reemplaza, `supersedesEntryId`.

## 5. Configuración de demo

`demoSettings.signingServiceDown` (booleano, por defecto `false`).

## 6. Alertas — `<tenantId>:alerts` (colección compartida con el spec 007)

`{ id, type: 'SIGNING_SERVICE_DOWN', journalEntryIds, createdAt, resolvedAt }`.
