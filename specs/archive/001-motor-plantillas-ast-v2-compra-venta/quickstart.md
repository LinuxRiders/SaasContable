# Quickstart: Motor de Plantillas AST

**Feature**: 001-motor-plantillas-ast
**Propósito**: Guía de validación end-to-end para verificar que la feature funciona correctamente.

## Prerequisitos

1. Node.js instalado
2. Dependencias instaladas: `npm install`
3. Servidor de desarrollo: `npm run dev` (puerto 5173)

## Escenario 1: Crear y Activar una Plantilla (Admin)

### Setup

1. Abrir `http://localhost:5173`
2. Iniciar sesión como **admin_pedro** (Admin de Plantillas)
3. En la sección global: navegar a **"Plantillas Globales"** `[G06]`

### Pasos

1. Hacer clic en **"Nueva Plantilla"**
2. Llenar:
   - Código: `FACTURA_COMPRA_TEST`
   - Nombre: "Factura de Compra - Test Manual"
   - Tipo: COMPRA
   - Cuenta base: `6011` (Mercaderías)
   - Cuenta IGV: `4011` (IGV Crédito Fiscal)
   - Cuenta contrapartida: `4212` (Emitidas)
3. Definir una regla línea:
   - Condición: `line.taxCode == "IGV_18"`
   - Acción: usar cuenta base `6011`
4. Agregar un test case:
   - Input: factura de S/ 100,000 (en céntimos: 10000000) + IGV 18%
   - Expected output:
     - Débito 6011: S/ 100,000
     - Débito 4011: S/ 18,000
     - Crédito 4212: S/ 118,000
5. Ejecutar tests → debe mostrar ✅ PASA
6. Activar la plantilla

### Resultado Esperado

- La plantilla aparece en el listado como "Activa - v1"
- El test case muestra resultado verde
- Las cuentas muestran ✅ validadas contra el PCGE

## Escenario 2: Versionado Inmutable (RD-10)

### Setup

- Continuar con la plantilla del escenario 1
- Simular que la plantilla fue usada (marcar `usageCount > 0` vía datos semilla)

### Pasos

1. Seleccionar la plantilla "FACTURA_COMPRA_TEST"
2. Hacer clic en "Editar"
3. Modificar la cuenta base a `6012` (Suministros)
4. Guardar

### Resultado Esperado

- Se crea **v2** como borrador
- **v1** permanece intacta e inactiva
- El historial de versiones muestra v1 y v2 con diff

## Escenario 3: Activación por Empresa

### Setup

1. Navegar a una empresa (ej. "DISTRIBUIDORA LOS ANDES SAC")
2. Ir a **"Plantillas Contables"** `[C02]`

### Pasos

1. Ver la lista de plantillas disponibles del catálogo global
2. Activar "FACTURA_COMPRA_NACIONAL" para esta empresa
3. Verificar que las cuentas referidas son validadas contra el PCGE de la empresa

### Resultado Esperado

- La plantilla aparece como "Activa" para la empresa
- Si alguna cuenta no existe en el PCGE de la empresa, muestra ⚠️ warning
- La plantilla no está activa para otras empresas (a menos que se active explícitamente)

## Escenario 4: Auditor Solo Lectura

### Setup

1. Cerrar sesión
2. Iniciar sesión como **auditora_ana** (Auditor)

### Pasos

1. Navegar a Plantillas Globales o Plantillas de Empresa
2. Intentar editar, crear o activar plantillas

### Resultado Esperado

- El Auditor ve el historial completo de versiones
- No hay botones de edición, creación ni activación
- Solo puede consultar

## Validación Automatizada

### Tests de Dominio

```bash
npx vitest run src/domain/templates/
```

**Tests esperados**:

- `evaluator.test.js` — Evaluación AST produce líneas correctas
- `conditions.test.js` — Evaluación de condiciones booleanas
- `lifecycle.test.js` — Versionado inmutable, activación con gates
- `testRunner.test.js` — Test runner compara resultados vs. esperados
- `diff.test.js` — Diff entre versiones
- `schema.test.js` — Validación de esquema AST
- `templateAccounts.test.js` — Validación de cuentas contra PCGE

### Build

```bash
npm run build
```

Debe completar sin errores.

## Verificación de Persistencia

1. Crear una plantilla y activarla
2. Recargar el navegador (F5)
3. Verificar que la plantilla sigue ahí con el mismo estado
4. Hacer clic en "Reset a Datos Semilla" (si disponible)
5. Verificar que se vuelve a las plantillas de fábrica
