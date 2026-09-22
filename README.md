# ContableOS (SaasContable) — Prototipo SaaS MVP

Prototipo **solo front-end** de un sistema contable SaaS multiempresa para Perú (PCGE 2026, IGV 18%, SUNAT), que implementa el **Subsistema de Ingestión, Traducción y Asentamiento de Comprobantes Electrónicos** con arquitectura Hexagonal/ACL, motor de plantillas AST y segregación estricta Maker-Checker.

---

## 👥 Usuarios y Credenciales Demo

La autenticación se realiza en la pantalla de inicio (`LoginView`). Seleccione el usuario deseado:

| Usuario                 | ID                  | Rol         | Responsabilidad y Acceso                                                                                                                |
| ----------------------- | ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **María Contadora**     | `contador_maria`    | **Maker**   | Ingestión manual, edición en bandeja de borradores, envío a aprobación.                                                                 |
| **Carlos Supervisor**   | `supervisor_carlos` | **Checker** | Revisión y aprobación final de asientos hacia libros oficiales; rechazo. _(No puede aprobar asientos creados o editados por él mismo)_. |
| **Pedro Administrador** | `admin_pedro`       | **Admin**   | Creación y versionado de plantillas globales en el banco maestro; activación por empresa.                                               |
| **Ana Auditora**        | `auditora_ana`      | **Auditor** | Acceso de solo lectura: trazabilidad de documentos, línea de tiempo inmutable de eventos, catálogo de plantillas.                       |

Empresa demo principal: **PACHATUSANTREK S.A.C.** (RUC `20450656934`, Período: `SETIEMBRE_2026`, Abierto).

---

## 🚀 Instalación y Comandos

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor local de desarrollo (puerto 5173)
npm run dev

# 3. Ejecutar la suite completa de pruebas unitarias y de integración
npm test

# 4. Compilar para producción
npm run build
```

---

## 🎯 Guía Paso a Paso de Escenarios Demo (Quickstart)

### 🛒 1. Ingestión de Comprobante PEN Válido (Rol: Maker)

1. Inicie sesión como **María Contadora** (`Maker`) y seleccione **PACHATUSANTREK S.A.C.**.
2. Diríjase a **Ingestión > Ingestión Manual**.
3. Seleccione la plantilla `PL-01 — Compra de Mercaderías / Insumos`.
4. En el catálogo de ejemplos demo, seleccione `Compra mercadería válida S/ 1,180.00`.
5. Haga clic en **Procesar Comprobantes**.
6. **Resultado:** El lote se procesa exitosamente. En el resumen visual aparece 1 aceptado y enviado a **Pendientes de Aprobación**.

### 🔍 2. Detección Automática de Duplicados (Idempotencia RD-04)

1. Manteniéndose en la misma pantalla, vuelva a hacer clic en **Procesar Comprobantes** con el mismo archivo.
2. **Resultado:** El sistema detecta el hash SHA-256 idéntico y marca el ítem como **Duplicado** (`DUPLICATE_DETECTED`), sin crear asientos adicionales ni duplicar importes.

### 💵 3. Factura en Dólares (USD) con Tipo de Cambio Oficial

1. En **Ingestión Manual**, seleccione la plantilla `PL-02 — Servicios de Transporte y Flete`.
2. Seleccione el ejemplo `Compra USD 1,000.00 (F001-00000456, 15/09/2026)`.
3. Procese el lote.
4. **Resultado:** El comprobante se convierte a Soles (PEN) con la tasa SUNAT venta del día (ej. S/ 3.750). En el detalle se aprecia el importe original en USD y el asiento balanceado en PEN.

### ⚠️ 4. Simulación de Caída de Servicio FX y Tasa Provisional

1. En los controles demo superiores de **Ingestión Manual**, active el switch **"Simular caída del servicio de tipo de cambio"**.
2. Procese un comprobante en USD.
3. **Resultado:** El sistema utiliza la última tasa hábil anterior disponible y marca el asiento con la advertencia **"Tasa Provisional"**, impidiendo la aprobación automática sin revisión humana.

### 📥 5. Bandeja de Entrada y Resolución de Inconsistencias (Staging)

1. En **Ingestión Manual**, seleccione un comprobante con inconsistencia (ej. montos que no cuadran o falta de Centro de Costo).
2. Procese el comprobante: el sistema lo redirige a la **Bandeja de Entrada** (`PENDING_INPUT`).
3. Vaya a **Ingestión > Bandeja de Entrada**:
   - Inspeccione los motivos de observación.
   - Edite las cuentas o agregue el Centro de Costo requerido.
   - Presione **Guardar Cambios** y luego **Revalidar**.
4. **Resultado:** El asiento pasa a estado `PENDING_APPROVAL`.

### 🛡️ 6. Segregación de Funciones Maker-Checker (SoD RD-05)

1. Con **María Contadora** (`Maker`), intente aprobar el asiento en **Pendientes de Aprobación**.
2. **Resultado:** La acción es rechazada con error `FORBIDDEN: Maker cannot approve own entry`.
3. Cierre sesión e ingrese como **Carlos Supervisor** (`Checker`).
4. Ingrese a **Ingestión > Pendientes Aprob.**.
5. Revise el asiento, verifique el cuadre Debe = Haber y presione **Aprobar Asiento**.
6. **Resultado:** El asiento pasa a `POSTED` y se asienta en los Libros Contables y Vouchers oficiales.

### 📜 7. Trazabilidad Completa de un Documento (Rol: Auditor)

1. Inicie sesión como **Ana Auditora** (`Auditor`).
2. Diríjase a **Ingestión Manual** o **Bandeja de Entrada**.
3. Haga clic en **Ver Trazabilidad** en cualquier registro.
4. **Resultado:** Se despliega el `TraceabilityModal` con la línea de tiempo inmutable:
   - Recepción de evidencia cruda (payload original).
   - Documento canónico interpretado.
   - Plantilla, versión y reglas aplicadas por línea.
   - Historial de eventos con fecha ISO, usuario y rol de cada acción.

### ⚙️ 8. Motor de Plantillas Globales y Reglas Condicionales (Rol: Admin)

1. Inicie sesión como **Pedro Administrador** (`Admin`).
2. En el menú global, ingrese a **Configuración Maestra > Plantillas Globales**.
3. Seleccione una plantilla (ej. `PL-07`) y explore sus pestañas:
   - **Reglas Condicionales:** Reglas de documento y de línea (`si descripción contiene 'FLETE' → cuenta 6311101`).
   - **Casos de Prueba:** Ejecute las pruebas unitarias automáticas con el botón **Ejecutar Pruebas**.
   - **Historial de Versiones:** Cree una nueva versión en borrador (`v2`), edite reglas, pruebe y active la versión. La versión previa pasa a `RETIRED` conservando el historial y el diff de cambios.

### 🏢 9. Activación de Plantillas por Empresa y Advertencias de Cuentas

1. Con **Pedro Administrador** (`Admin`), ingrese a **PACHATUSANTREK S.A.C. > Plantillas de la Empresa**.
2. Active o desactive plantillas para esta empresa específica usando los interruptores.
3. Si una plantilla utiliza una cuenta contable que no existe en el catálogo de la empresa o no es cuenta imputable, el componente `AccountWarnings` alertará con el enlace directo para **Abrir Catálogo de Cuentas**.
4. Cambie a otra empresa (ej. `INVERSIONES MARALESA S.A.C.`) y compruebe que las activaciones son estrictamente independientes por tenant (RD-08).

### 🔄 10. Reinicio de Datos Demo

- En cualquier momento puede restablecer los datos al estado semilla original haciendo clic en **"Reiniciar datos de demostración"** en el panel de controles demo de la vista de Ingestión.

---

## 🏛️ Invariantes y Reglas de Negocio Implementadas

- **RD-01:** Payload raw append-only inmutable en almacenamiento.
- **RD-03:** Partida doble estricta: $\Sigma \text{Débitos} = \Sigma \text{Créditos}$ antes de aprobación.
- **RD-04:** Idempotencia por hash criptográfico SHA-256 (`tenantId + emisor + tipo + número + fecha`).
- **RD-05:** Segregación Maker ≠ Checker garantizada por validación de identidad en servicios.
- **RD-07 / RD-11:** Asientos `POSTED` inmutables; correcciones solo vía asientos inversos vinculados.
- **RD-08:** Aislamiento estricto multi-tenant: ninguna operación cruza datos entre empresas.
- **RD-09:** Redondeo FX half-up por línea; tasa provisional obliga a revisión humana.
- **RD-10:** Versionado inmutable de plantillas AST: asientos conservan la versión exacta usada.
- **RD-12:** Asentamiento restringido a períodos fiscales abiertos.
