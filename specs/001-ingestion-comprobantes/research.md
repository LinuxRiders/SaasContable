# Research — 001 Ingestión de Comprobantes

**Fase 0 del plan.** Resuelve las incógnitas técnicas antes del diseño. Cada entrada tiene el
formato Decisión / Justificación / Alternativas descartadas. Las decisiones resumidas en
[plan.md](plan.md#decisiones-técnicas) remiten aquí (R-xx).

---

## R-01 — Representación de montos

- **Decisión**: todos los montos del dominio se guardan como **enteros en céntimos**
  (`amountCents`). Las tasas de cambio se guardan como **enteros en milésimas** (`rateMilli`,
  p. ej. 3.751 → `3751`), porque SUNAT publica las tasas con 3 decimales. El formato para
  mostrar (`S/ 1,180.00`) solo se aplica en la UI.
- **Justificación**: constitución II ("prohibida la aritmética flotante acumulativa") y RNF-01.
  Con enteros, las sumas son exactas y la única operación que redondea es la conversión de
  moneda.
- **Alternativas descartadas**: números decimales en coma flotante con `toFixed(2)`, como hace
  hoy `registrarCompra` (acumula error en sumas largas); una librería decimal (`decimal.js`,
  `big.js`), que es una dependencia innecesaria (constitución VI).

## R-02 — Conversión USD → PEN sin descuadre por redondeo (RD-09, RF-07)

- **Decisión**: se convierten con redondeo una sola vez (half-up) el **total** y el **IGV**. La
  **base en soles se deriva**: base PEN = total PEN − IGV PEN. Las líneas de amarre usan esa base
  derivada. Cada monto en soles se calcula una sola vez y el asiento cuadra por construcción.
  Fórmula: `round(amountCents × rateMilli / 1000)`, con aritmética entera.
- **Justificación**: si se convirtieran por separado base, IGV y total, el redondeo podría dejar
  un céntimo de diferencia. Eso mandaría a la bandeja por "descuadre" una factura válida, que el
  Maker no puede corregir (no edita montos). La derivación respeta RD-09: no hay redondeo
  acumulativo y la cuenta por pagar o cobrar coincide exactamente con el total del comprobante.
- **Alternativas descartadas**: convertir las tres cifras y llevar la diferencia a una cuenta de
  diferencia de cambio (676/776), que es contablemente incorrecto, porque no es una diferencia de
  cambio; repartir el residuo en la línea mayor, que es menos transparente para el auditor.

## R-03 — Validación de consistencia de montos en moneda original (RF-09)

- **Decisión**: la regla "montos inconsistentes" se evalúa **en la moneda del comprobante**, con
  tolerancia de 1 unidad mínima (S/ 0.01 o USD 0.01):
  - `|base gravada + base exonerada/inafecta + IGV − total| ≤ 1`
  - `|IGV − round(base gravada × 18%)| ≤ 1`
- **Justificación**: la spec expresa la tolerancia en soles pensando en facturas en PEN. En USD,
  la inconsistencia es del emisor y debe medirse en su moneda; convertir primero mezclaría el
  redondeo de la conversión con el error del documento.
- **Alternativas descartadas**: evaluar después de convertir, porque confunde el error de origen
  con el redondeo propio.

## R-04 — Hash de idempotencia (RD-04, RF-03)

- **Decisión**: la clave es `tenantId|rucEmisor|tipoDoc|serieNumero|fechaEmision`, normalizada
  (sin espacios, en mayúsculas y con la serie-número en formato `F001-00000123`). El hash es
  **SHA-256 en hexadecimal** calculado con Web Crypto (`crypto.subtle.digest`), una API asíncrona
  disponible en el navegador y en Node 18 o superior (necesario para Vitest). Se guarda además un
  índice `dedupHash → documentId` por empresa.
- **Justificación**: es lo que pide el SDD (hash criptográfico), usa una API nativa (constitución
  VI) y el índice permite encontrar el original en O(1).
- **Alternativas descartadas**: comparar la clave en texto plano, que funciona pero se aparta del
  SDD y expone datos en el índice; una librería de hash, que es innecesaria.

## R-05 — Lectura de XML UBL 2.1 (SUNAT) (RF-04)

- **Decisión**: se usa `DOMParser` nativo con consultas por namespace. Mapeo mínimo:

  | Dato estándar | Ruta UBL 2.1 (Invoice) |
  |---|---|
  | Tipo de documento | `cbc:InvoiceTypeCode` (debe ser `01`) |
  | Serie-número | `cbc:ID` |
  | Fecha de emisión | `cbc:IssueDate` |
  | Moneda | `cbc:DocumentCurrencyCode` |
  | RUC / razón social emisor | `cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID` (`schemeID="6"`) / `cac:PartyLegalEntity/cbc:RegistrationName` |
  | RUC / razón social receptor | `cac:AccountingCustomerParty/…` (misma ruta) |
  | IGV total | `cac:TaxTotal/cbc:TaxAmount` |
  | Bases por tributo | `cac:TaxTotal/cac:TaxSubtotal` con `cbc:TaxableAmount`; `cac:TaxCategory/cac:TaxScheme/cbc:ID`: `1000` = IGV (gravado), `9997` = exonerado, `9998` = inafecto |
  | Total a pagar | `cac:LegalMonetaryTotal/cbc:PayableAmount` |
  | Líneas | `cac:InvoiceLine`: `cbc:ID`, `cbc:LineExtensionAmount`, `cac:Item/cbc:Description` |

  Si la raíz es `CreditNote` o `DebitNote`, o el `InvoiceTypeCode` es distinto de `01` (por
  ejemplo, `03` = boleta), el resultado es "tipo de documento no soportado en esta versión". La
  firma digital del XML (`ext:UBLExtensions`) se ignora; no se verifica en el prototipo.
- **Justificación**: es una API nativa (constitución VI) y el mapeo cubre justo los campos
  obligatorios de CA-04.2.
- **Alternativas descartadas**: `fast-xml-parser` u otra librería (dependencia evitable);
  expresiones regulares (frágiles ante namespaces y formato).

## R-06 — `DOMParser` en las pruebas

- **Decisión**: se agrega **`happy-dom`** como dependencia de desarrollo. Solo los archivos de
  prueba del parser UBL la activan, con el comentario `@vitest-environment happy-dom`; el resto
  corre en el entorno `node`.
- **Justificación**: Node no trae `DOMParser`. Las pruebas del parser son obligatorias
  (constitución V), y `happy-dom` es liviana y solo de desarrollo.
- **Alternativas descartadas**: `jsdom`, más pesada; inyectar un parser XML falso, que no
  probaría el mapeo real.

## R-07 — Persistencia en localStorage y límite de cuota (RF-18, CA-01.6)

- **Decisión**: se usa un único repositorio con claves `contableos:v1:<tenantId>:<colección>`
  (colecciones globales con `tenantId = global`). Colecciones:
  - Por empresa: `rawPayloads`, `documents`, `dedupIndex`, `journalEntries`, `batches`,
    `auditLog`, `templates`, `periods`.
  - Globales: `fxRates`, `demoSettings`, `meta`.

  Toda escritura captura `QuotaExceededError`. Si ocurre, el comprobante afectado queda
  "fallido: almacenamiento del navegador lleno" (sin escrituras parciales) y la UI sugiere
  reiniciar los datos de demostración. La vista de carga muestra el espacio usado.
- **Justificación**: localStorage da entre 5 y 10 MB por origen. El límite de 1 MB por archivo
  (aclaración D-01) cabe, pero 50 archivos grandes no. Las facturas UBL reales pesan entre 5 y
  30 KB, así que el caso normal cabe de sobra, y el caso extremo se degrada de forma controlada.
- **Alternativas descartadas**: IndexedDB (más capacidad, pero la constitución I fija
  localStorage y agrega complejidad); comprimir los payloads (complejidad sin beneficio en una
  demo).

## R-08 — Atomicidad al procesar un comprobante

- **Decisión**: cada comprobante se procesa en memoria y se confirma con **una sola escritura
  por colección afectada**, en este orden: evidencia (append-only) → documento → índice de
  duplicados → asiento → eventos de auditoría → lote. La evidencia siempre se escribe primero
  (RD-01). Si una escritura posterior falla, el comprobante queda "fallido" con la evidencia ya
  guardada y un evento de auditoría del error.
- **Justificación**: localStorage no tiene transacciones. Este orden garantiza que nunca exista
  un asiento sin su evidencia.
- **Alternativas descartadas**: un journal o undo-log para simular transacciones, que es
  excesivo para un prototipo (YAGNI).

## R-09 — Concurrencia optimista (CA-11.6)

- **Decisión**: cada asiento tiene un `entityVersion` entero. Toda operación de escritura
  recibe `expectedVersion`; si no coincide con la versión guardada, responde `CONFLICT`. Cada
  operación lee el estado fresco desde el almacenamiento, nunca desde una caché de la UI. La UI
  escucha el evento `storage` del navegador para refrescarse cuando otra pestaña escribe.
- **Justificación**: dos pestañas comparten el mismo localStorage, así que se reproduce el
  conflicto del SDD (RNF-13) con un mecanismo trivial.
- **Alternativas descartadas**: bloqueo pesimista (sin sentido sin servidor); "gana el último"
  (viola CA-11.6).

## R-10 — Fuente del plan contable para validar cuentas (RF-09 "cuenta inexistente")

- **Decisión**: los servicios de ingestión reciben, por inyección al iniciar la app, una función
  `getPlanContable()` que devuelve el plan contable vigente del `AccountingContext` existente. El
  dominio recibe el plan como dato.
- **Justificación**: así la ingestión ve las cuentas que el usuario agregó o eliminó en la vista
  Plan Contable, sin refactorizar ese módulo (constitución VII) y sin que los servicios importen
  React (constitución III).
- **Alternativas descartadas**: leer `mockPlanContable` directo (ignoraría las ediciones del
  usuario); migrar el plan contable a localStorage (refactor fuera de alcance).
- **Nota**: el plan contable actual vive solo en memoria. Si el usuario elimina una cuenta y
  recarga, esa cuenta vuelve. Es una limitación conocida del prototipo existente.

## R-11 — Plantillas versionadas para ingestión (RF-08, RD-10)

- **Decisión**: al sembrar los datos, cada plantilla de `mockPlantillas` se copia a la colección
  `templates` de cada empresa como **versión 1, de solo lectura**, con `templateId`, `version`,
  `tipoOperacion`, cuentas, `requiereCC` y `ccDefault`. Se agrega una plantilla semilla más,
  **"PL-06 Seguros y Gastos por Centro de Costo"** (compra, cuenta base 6511101 "Seguros de
  transporte y bienes", que existe en el plan y tiene amarres 9411101/7911101; `requiereCC:
  true`; sin centro de costo por defecto), para poder demostrar el motivo "falta centro de costo"
  y la acción en lote de HU-03. Todas las plantillas existentes que exigen centro de costo traen uno
  por defecto, así que sin PL-06 ese caso no se podría demostrar.
- **Justificación**: RD-10 exige guardar la versión exacta en cada asiento, y sin la plantilla
  adicional no se cubre el escenario de aceptación de HU-03.
- **Alternativas descartadas**: modificar `mockPlantillas`, que tocaría el módulo existente
  (constitución VII); tomar el centro de costo como obligatorio según la cuenta del plan, que
  cambia la semántica actual sin respaldo en la spec.

## R-12 — Tasas de cambio y caída simulada (RF-07)

- **Decisión**: la tabla semilla `fxRates` tiene tasas venta USD→PEN por día hábil, de
  2026-06-01 a 2026-09-30, con huecos en fines de semana, como en la publicación real. Reglas de
  resolución:
  1. Servicio disponible y hay tasa exacta para la fecha → esa tasa, no provisional.
  2. Servicio disponible y no hay tasa exacta (por ejemplo, domingo) → la tasa más reciente
     anterior, marcada provisional. Es lo que dice CA-07.3: "no tiene tasa para esa fecha".
  3. Servicio caído (interruptor activo) → la tasa más reciente anterior **a la fecha de
     emisión**, marcada provisional.
  4. No hay ninguna tasa anterior → la tasa queda sin resolver y el asiento va a la bandeja con
     el motivo "sin tipo de cambio".

  Con el servicio caído, la resolución nunca usa la tasa exacta del día.
- **Justificación**: así se cumplen CA-07.3 y CA-07.4 de forma determinista (RNF-06).
- **Alternativas descartadas**: caídas aleatorias (viola RNF-06).

## R-13 — Identidad simulada (constitución IV, RF-15)

- **Decisión**: un `SessionContext` nuevo guarda `{ userId, role }`. El `tenantId` sale de
  `empresaActiva.id` del `AccountingContext` existente. Un selector en el Header permite cambiar
  de usuario (y, con él, de rol) entre usuarios semilla con roles `MAKER`, `CHECKER`, `AUDITOR`,
  `ADMIN_PLANTILLAS` y `SOPORTE`. La sesión se guarda en `demoSettings` para que sobreviva a la
  recarga. `UsuariosView` no se modifica.
- **Justificación**: se reutiliza el selector de empresa que ya existe y el cambio al Header es
  mínimo.
- **Alternativas descartadas**: pantalla de login falsa (descartada en la constitución); unificar
  con los usuarios de `UsuariosView` (refactor fuera de alcance).

## R-14 — Latencia simulada (constitución I, RNF-02)

- **Decisión**: `demoSettings.latencyMs` vale 150 ms por operación y 40 ms por comprobante
  dentro de un lote. Un lote de 20 comprobantes tarda unos 1.0 s (por debajo del límite de 5 s
  de RNF-02); uno de 50 tarda unos 2.2 s. La latencia se puede poner en 0 para las pruebas.
- **Justificación**: la UI muestra estados de carga creíbles sin romper RNF-02.
- **Alternativas descartadas**: sin latencia (no se ejercitan los estados de carga); latencia
  aleatoria (viola RNF-06).
