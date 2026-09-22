# 03 — SPEC: Motor Lógico de Mapeo y Determinación Debe / Haber

> **Módulo:** Motor Contable / Reglas de Enlace e Inferencia
> **Documentos de Referencia:** `ContextoProyecto/07-BUSINESS-RULES-REGISTRY.md` (RN-001, RN-002, RN-005, RN-035 a RN-045), `05-ADR-LOG.md` (ADR-013)

---

## 1. Concepto y Arquitectura del Motor

El **Motor de Mapeo** es una capa lógica pura en JavaScript/TypeScript (sin acoplamiento a vistas específicas) que recibe los datos de una operación del negocio y devuelve un **Borrador de Asiento Contable (Voucher)** con las cuentas de detalle `U` asignadas, los importes calculados y la posición estricta en el **DEBE** o en el **HABER**, cumpliendo siempre el principio universal de **Partida Doble**.

---

## 2. Matriz de Reglas de Enlace (Rules Matrix)

La asignación de cuentas se rige por la siguiente matriz de reglas (implementada de forma declarativa y configurable, no hardcodeada en if-else dispersos):

| ID Regla | Operación / Concepto | Naturaleza | Cuenta Imputable 'U' | Posición | Cuenta Contrapartida | Posición Contrapartida |
|---|---|---|---|---|---|---|
| **REG-01** | Compra de Mercaderías | Costo / Activo | `6011101` (Mercaderías) | **DEBE** | `4212101` (Proveedores) | **HABER** |
| **REG-02** | Servicios de Transporte | Gasto Operativo | `6311101` (Transporte) | **DEBE** | `4212101` (Proveedores) | **HABER** |
| **REG-03** | Servicios Básicos (Luz/Agua) | Gasto Gestión | `6361101` (Suministros) | **DEBE** | `4212101` (Proveedores) | **HABER** |
| **REG-04** | Adquisición de Activo Fijo | Inversión | `3351101` (Cómputo/Equipos) | **DEBE** | `4212101` (Proveedores) | **HABER** |
| **REG-05** | IGV Crédito Fiscal (Compras) | Tributo a Favor | `4011101` (IGV Cuenta Propia)| **DEBE** | Enlazado al total factura | — |
| **REG-06** | Venta de Mercaderías | Ingreso Operativo| `7012101` (Venta Mercadería)| **HABER** | `1212101` (Clientes CxC) | **DEBE** |
| **REG-07** | Venta de Servicios | Ingreso Operativo| `7032101` (Venta Servicios) | **HABER** | `1212101` (Clientes CxC) | **DEBE** |
| **REG-08** | IGV Débito Fiscal (Ventas) | Tributo por Pagar| `4011101` (IGV Débito) | **HABER** | Enlazado al total factura | — |
| **REG-09** | Pago a Proveedor (Bancos) | Extinción Pasivo | `4212101` (Proveedores) | **DEBE** | `104101` (Banco Seleccionado)| **HABER** |
| **REG-10** | Cobranza a Cliente (Bancos) | Extinción Activo | `104101` (Banco Seleccionado)| **DEBE** | `1212101` (Clientes CxC) | **HABER** |

---

## 3. Algoritmo de Determinación Debe / Haber

Para cada apunte o línea del comprobante, el motor aplica la lógica de la naturaleza contable:

### 1. Regla de Signo por Elemento:
* **Elemento 1 (Activo):** Incrementos van al **DEBE**; disminuciones van al **HABER**.
* **Elemento 2 (Realizable):** Incrementos (almacén) van al **DEBE**; salidas van al **HABER**.
* **Elemento 3 (Inmovilizado):** Altas van al **DEBE**; bajas van al **HABER**.
* **Elemento 4 (Pasivo):** Incrementos de deuda van al **HABER**; pagos/cancelaciones van al **DEBE**.
* **Elemento 5 (Patrimonio):** Aportes van al **HABER**.
* **Elemento 6 (Gastos por Naturaleza):** Siempre se debitan al **DEBE**.
* **Elemento 7 (Ingresos por Naturaleza):** Siempre se acreditan al **HABER**.
* **Elemento 9 (Cuentas de Costo/Gasto por Función):** Siempre se debitan al **DEBE** con contrapartida en la cuenta `79` al **HABER**.

### 2. Disparo de Amarres Automáticos (Destino):
Cuando el motor detecta una cuenta imputable del **Elemento 6** (Gastos) en el Debe con un importe $X$:
1. Consulta los atributos `amarre1` y `amarre2` de la cuenta en el Plan Contable.
2. Si `amarre1` existe (ej. `9411101` o `2011101`), crea automáticamente una línea con:
   - Cuenta = `amarre1`
   - Debe = $X$
   - Haber = $0.00$
   - Centro de Costos = `amarre3` o el CC indicado en la transacción.
3. Si `amarre2` existe (ej. `7911101` o `6111101`), crea automáticamente una línea con:
   - Cuenta = `amarre2`
   - Debe = $0.00$
   - Haber = $X$

---

## 4. Validaciones de Integridad Contable (Gates)

Antes de considerar un asiento como válido, el motor ejecuta 3 validaciones estrictas:
1. **Gate 1 (Partida Doble Absoluta):**
   $$\left| \sum 	ext{Debe} - \sum 	ext{Haber} ight| \le 0.001$$
   Cualquier diferencia bloquea la emisión del voucher.
2. **Gate 2 (Sólo Cuentas de Uso `U`):**
   Verifica que todos los códigos contables presentes en el asiento tengan `esCuentaU === true`. Si alguna cuenta es de nivel sintético (ej. `60` o `111`), se rechaza con error explícito indicando que debe seleccionarse una cuenta analítica de último nivel.
3. **Gate 3 (Centro de Costos Requerido):**
   Si la cuenta tiene el flag `requiereCC === true`, valida que el apunte incluya un código de Centro de Costos válido (ej. `CC-ADMIN`, `CC-LOGISTICA`).\n