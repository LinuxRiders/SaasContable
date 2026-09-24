# Data Model: DoA y Firmas

## 1. ApprovalDecision (Value Object)
Objeto devuelto por el `DoAEngine`.
```javascript
{
  level: "STP_AUTO" | "CHECKER_L1" | "CHECKER_L2" | "CHECKER_MAX",
  requiresHumanReview: boolean,
  reason: "Monto menor al umbral" | "Monto excede umbral L1" | "Tipo de cambio provisional"
}
```

## 2. DoAMatrix (Entidad / Configuración)
Matriz de configuración por tenant (`src/data/mockDoAMatrix.js`).
```javascript
{
  tenantId: "TENANT_123",
  rules: [
    {
      maxAmountCents: 500000, // 5,000.00
      currency: "PEN",
      requiresHuman: false,
      level: "STP_AUTO"
    },
    {
      maxAmountCents: 5000000, // 50,000.00
      currency: "PEN",
      requiresHuman: true,
      level: "CHECKER_L1"
    }
  ],
  flags: {
    blockStpOnProvisionalFx: true
  }
}
```

## 3. Signature (Value Object embeddido en JournalEntry)
Se adjunta al asiento al momento de transicionar a `POSTED`.
```javascript
{
  hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  algorithm: "SHA-256",
  signedByUserId: "revisor_luis",
  signedAt: "2026-09-22T08:30:00Z",
  decisionLevel: "CHECKER_L1"
}
```
