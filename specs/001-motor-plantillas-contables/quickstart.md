# Quickstart: Validación de la Configuración Contable y el Motor de Plantillas

**Feature**: 001-motor-plantillas-contables

## Prerrequisitos

```bash
npm install
npx vitest run      # dominio y servicios en verde
npm run build       # sin errores
npm run dev         # http://localhost:5173
```

En la app: **Sistema → Reset a datos demo** (reset de la semilla) antes de empezar. Usuarios demo: Admin `admin_pedro`, Maker `contador_maria`, Checker `revisor_luis`, Auditor `auditora_ana`. Empresa `01` = mapa completo; empresa `02` = mapa incompleto.

## Pruebas automatizadas que deben existir y pasar

| Área | Qué demuestra |
|---|---|
| Expresiones | cada función de la lista blanca; errores de tipo, profundidad, ruta inexistente y `line` fuera de contexto; `mulRate` redondea una sola vez |
| Catálogo | vigencia de tasas y tipos (RD-18) con fechas antes, dentro y después de un rango |
| Documento | `validateDocument` sobre cada documento de ejemplo: válidos, nota de crédito sin referencia, incoherencia aritmética e impuesto que no coincide con la tasa |
| Perspectiva | recibido, emitido, interno (fijo) y ajeno al tenant |
| Clasificación | fuente explícita, prioridad, empate por id, opción única, líneas mixtas → `PURCHASE_MIXED`, reglas `PROPOSED` ignoradas, `CLASSIFICATION_REQUIRED` |
| Selección | `TENANT` sobre `PACK`, prioridad, aplicabilidad, `NO_TEMPLATE`, `AMBIGUOUS_TEMPLATE` |
| Cuentas | resolución por rol, por calificador y por tipo de operación con respaldo; cuenta inexistente, de agrupación o inactiva; `MISSING_DIMENSION` con `requiereCC` |
| Evaluación | las 9 plantillas base producen los asientos de la SDD §21.4; importe cero omitido; importe negativo → `INVALID_AMOUNT`; FX con `balancingLine` dentro y fuera de tolerancia |
| Ciclo de vida | edición en `DRAFT`, versión nueva al editar con uso, diff legible, activación bloqueada por pruebas, hash, cuentas y ambigüedad |
| Agnosticismo (SC-002/SC-003) | un paquete de prueba ficticio (`XX`) con un tipo de documento y un impuesto inventados se valida, clasifica y contabiliza con el mismo motor; búsqueda en `src/domain/accounting/` sin `RUC`, `IGV`, `PCGE`, `SUNAT`, `PEN` ni códigos de cuenta |
| Servicios | permisos por rol (el Admin no tiene operaciones de Maker/Checker), aislamiento entre tenants, auditoría por acción, reset |

## Escenarios manuales

### E1 · Catálogo del paquete (US1)

1. Iniciar sesión como Admin → **Configuración contable → Documentos**.
2. Ver los 16 tipos con su familia; abrir "Nota de crédito" y comprobar la referencia obligatoria.
3. En **Impuestos**, consultar `VAT` a dos fechas y ver la tasa vigente en cada una.
4. Abrir "Guía de remisión" y comprobar que no admite plantillas.
5. Iniciar sesión como Auditor: todo visible y sin controles de edición.

### E2 · Mapa de cuentas (US2, RD-17)

1. Admin, empresa `02` → **Configuración contable → Mapa de cuentas**: aparecen `FIXED_ASSET_IT_EQUIPMENT` y `PROFESSIONAL_FEES_PAYABLE` sin mapear, con las plantillas que bloquean.
2. Asignar `PROFESSIONAL_FEES_PAYABLE → 42` → rechazo "no es de detalle".
3. Asignar `PROFESSIONAL_FEES_PAYABLE → 4241101` → se guarda la versión 2 y el rol deja de figurar como sin mapear.

### E3 · Crear, probar y activar (US3, US4)

1. Admin, empresa `01` → **Plantillas contables** → duplicar `PE.RECEIVED.PROFESSIONAL_FEE_RECEIPT.PROFESSIONAL_FEES`.
2. En la copia, cambiar la línea de gasto a la cuenta literal `6321101` y agregar una línea con el campo inexistente `fields.foo` → guardar → rechazo con la ruta del error.
3. Quitar esa línea, guardar, ejecutar las pruebas: todas ✅.
4. Activar → falla por ambigüedad con la plantilla del paquete (misma terna y prioridad) → subir la prioridad a 10 → volver a probar → activar ✅.
5. Empresa `02`: la plantilla no aparece activa (RD-08).

### E4 · Pruebas negativas y bloqueos (US4)

1. En la plantilla base de planilla, ejecutar las pruebas: el caso "sin centro de costo" pasa porque espera `MISSING_INPUT`.
2. Empresa `02`, intentar activar la plantilla base de activo fijo → `ACTIVATION_BLOCKED` listando el rol sin mapear.

### E5 · Clasificación (US5)

1. **Configuración contable → Reglas**: ver las reglas semilla y la regla `PROPOSED` de equipos de cómputo.
2. **Probar clasificación** con la factura de mercadería y flete: documento `PURCHASE_MIXED`; líneas `MERCHANDISE_PURCHASE` y `TRANSPORT_EXPENSE`, cada una con la regla que decidió.
3. Probar la factura de "equipos de cómputo": `CLASSIFICATION_REQUIRED`. Activar la regla propuesta y repetir: `FIXED_ASSET_ACQUISITION`.

### E6 · Simulación (US6)

1. **Simulador contable** → "Factura recibida con mercadería y flete": ver esquema ✅, perspectiva `RECEIVED`, clasificación por línea, candidatas, plantilla `PE.RECEIVED.INVOICE.PURCHASE_MIXED v1` y 8 líneas que cuadran (D 1 308.00 = H 1 308.00).
2. "Resumen de planilla": asiento de la SDD §21.4 con destino a `9411101`.
3. "Nota de crédito sin referencia": se detiene en el esquema con `SCHEMA_INVALID`.
4. "Factura en USD" con tasa 3.745: importes funcionales redondeados por línea; la línea de proveedores absorbe la diferencia.
5. Comprobar que la simulación no cambió el uso de ninguna plantilla.

### E7 · Versionado y auditoría (US7, US8)

1. Registrar uso simulado de la plantilla duplicada en E3 (acción de demo **Marcar como usada**, visible solo en modo demo) y editarla: se crea la v2 en `DRAFT` con diff; la v1 no cambia.
2. Activar la v2: la v1 queda `SUPERSEDED` en la empresa `01`.
3. Auditor → **Bitácora de configuración**: aparecen todas las acciones de E2–E7 con usuario, rol, empresa y fecha.

### E8 · Persistencia y reset

1. Recargar el navegador: mapa, reglas, plantillas y activaciones se conservan.
2. **Reset a datos demo**: vuelve la semilla (empresa `02` otra vez con roles sin mapear).
