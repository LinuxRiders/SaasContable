# Contrato: Formato JSON de Comprobante de Entrada · CA-01.1

Además del XML UBL 2.1 de SUNAT (mapeo en [research.md R-05](../research.md)), se aceptan
archivos `.json` con esta forma. Simula lo que enviaría un ERP externo por API. Los montos vienen
como **cadenas decimales** con 2 decimales, para evitar ambigüedad de coma flotante en el origen.

```json
{
  "tipoDocumento": "01",
  "serieNumero": "F001-00000456",
  "fechaEmision": "2026-09-15",
  "moneda": "USD",
  "emisor":   { "ruc": "20555555551", "razonSocial": "TRANSPORTES ANDINOS DEMO SAC" },
  "receptor": { "ruc": "20450656934", "razonSocial": "PACHATUSANTREK SAC" },
  "lineas": [
    { "descripcion": "Flete Cusco - Puno", "valor": "847.46", "tributo": "IGV" }
  ],
  "totales": {
    "baseGravada": "847.46",
    "baseExonerada": "0.00",
    "baseInafecta": "0.00",
    "igv": "152.54",
    "total": "1000.00"
  }
}
```

## Reglas

| Campo | Obligatorio | Regla |
|---|:-:|---|
| `tipoDocumento` | ✔ | Solo `"01"`; otro valor → "Tipo de documento no soportado en esta versión" |
| `serieNumero` | ✔ | `^[A-Z0-9]{4}-\d{1,8}$`; se normaliza con ceros a la izquierda hasta 8 dígitos |
| `fechaEmision` | ✔ | `YYYY-MM-DD`, fecha válida |
| `moneda` | ✔ | `PEN` o `USD` |
| `emisor.ruc` / `receptor.ruc` | ✔ | 11 dígitos |
| `emisor.razonSocial` / `receptor.razonSocial` | — | Texto; si falta, se muestra el RUC |
| `lineas` | ✔ | Al menos 1; `tributo` ∈ `IGV`, `EXO`, `INA` (por defecto `IGV`) |
| `totales.total` | ✔ | > 0 |
| `totales.igv`, bases | — | Por defecto `"0.00"` |

Un monto con más de 2 decimales o que no sea numérico → "Monto inválido en <campo>".
