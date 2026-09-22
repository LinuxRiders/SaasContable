# 02 — SPEC: Gestión e Importación del Plan Contable (PCGE)

> **Módulo:** Plan Contable General Empresarial (PCGE)
> **Documentos de Referencia:** `ContextoProyecto/07-BUSINESS-RULES-REGISTRY.md` (RN-005 a RN-010), Figma `118-1105`, `118-1854`, `PlanContable.xlsx`

---

## 1. Modelo de Datos de Cuenta Contable

```typescript
export interface CuentaContable {
  codigo: string;                  // Código numérico (ej. "60", "601", "6011101")
  descripcion: string;             // Denominación oficial de la cuenta
  elemento: number;                // 1 a 9 según el primer dígito del código
  nivel: number;                   // 1 (Elemento), 2 (Rubro), 3 (Subcuenta), 4 (Divisionaria), 5 (Detalle)
  esCuentaU: boolean;              // true = Cuenta de Uso/Imputable, false = Cuenta Sintética/Padre
  moneda: "MN" | "ME" | "AMBAS";   // Moneda Nacional (PEN), Extranjera (USD) o Ambas
  tipoAnalisis: "Por Documento / RUC" | "Solo Monto" | "Sin Análisis";
  
  // Reglas de Amarres Automáticos (Destino Contable)
  amarre1?: string;                // Código de cuenta Destino Debe (ej. "9411101" o "2011101")
  amarre2?: string;                // Código de cuenta Destino Haber (ej. "7911101" o "6111101")
  amarre3?: string;                // Centro de Costo por defecto (ej. "CC-ADMIN")
  
  // Requerimientos y Clasificación EEFF
  requiereCC: boolean;             // Obliga a ingresar Centro de Costos si es true
  rubroEF1?: string;               // Rubro en Balance General (ej. "EF-01")
  rubroEF2?: string;               // Rubro en Estado de Resultados (ej. "EF-02")
  digitoBalance?: string;          // Dígito DBG según PCGE
  ajusteDiferenciaCambioRxN: boolean;
  ajusteDiferenciaCambioRxF: boolean;

  // Saldos en Memoria para el Prototipo
  saldoDeudor: number;
  saldoAcreedor: number;
}
```

---

## 2. Ingesta y Parser de `PlanContable.xlsx`

El archivo `PlanContable.xlsx` ubicado en la raíz del proyecto posee la siguiente estructura de columnas verificada:
* Columna 1: `CUENTA` (código numérico, ej. `101101`, `6011101`)
* Columna 2: `DESCRIPCION` (nombre de la cuenta)
* Columna 3: `MONEDA` (vacío = MN, "DOLARES" = ME)
* Columna 4: `AMARRE_1` (cuenta de destino Debe)
* Columna 5: `AMARRE_2` (cuenta de destino Haber)
* Columna 6: `AMARRE_3` (centro de costo o tercer amarre)
* Columna 7: `RUBROS` / `DESRUB` (clasificación en estados financieros)
* Columna 9: `DIGITO` (dígito de balance)

### Algoritmo del Parser Frontend:
1. **Lectura con librería `xlsx`:** Convierte la hoja activa en un array de objetos JSON.
2. **Normalización:**
   - Limpia espacios en blanco en códigos y descripciones.
   - Determina el `elemento` a partir del primer carácter del código (`1` a `9`).
   - Determina `esCuentaU`: Si el código tiene longitud igual o mayor a los dígitos analíticos configurados (ej. $\ge 6$ o 7 dígitos) o no tiene subcuentas hijas, se marca como `true`. Si tiene 1, 2 o 3 dígitos, se marca como cuenta sintética (`false`).
   - Normaliza `moneda`: si contiene "DOLAR" o "ME" ➔ `ME`, caso contrario ➔ `MN`.
   - Asigna los campos de amarres `AMARRE_1` y `AMARRE_2`.
3. **Validación de Jerarquía:**
   - Verifica que toda subcuenta analítica tenga una cuenta padre existente (ej. para existir `6011101`, debe existir `6011` y `60`).
   - Si no existe el padre, el parser lo genera sintéticamente.
4. **Reporte de Importación:** Muestra el número de cuentas importadas, cuántas son de uso `U` y cuántas contienen amarres automáticos configurados.

---

## 3. Visualizador y Mantenimiento de Cuentas (Figma 118-1105 y 118-1854)

* **Barra de Navegación por Elementos:** Pestañas `Todos (1-9)`, `1 Activo`, `2 Realizable`, `3 Inmovilizado`, `4 Pasivo`, `5 Patrimonio`, `6 Gastos`, `7 Ventas`, `8 Cierre`, `9 Analíticas`.
* **Visualización en Árbol/Tabla:**
  - Cuentas de título en negrita con fondo sutil `#F8FAFC`.
  - Cuentas analíticas con indentación proporcional al nivel y check verde en la columna `U`.
  - Visualización directa de las columnas de amarres `Amarre 1` y `Amarre 2`.
* **Modal de Mantenimiento de Cuenta:**
  - Breadcrumb jerárquico superior (ej. `1 ACTIVO > 10 EFECTIVO > 104 CTAS CTES > 1041 BCP`).
  - Edición de denominación, moneda y tipo de análisis.
  - Configuración de amarres automáticos: validación de que las cuentas ingresadas en Amarre 1 y 2 existan en el plan.
  - Switch interactivo para `Cuenta de Uso (U)` y `Requiere Centro de Costos`.\n