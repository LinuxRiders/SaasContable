# Feature Specification: Motor de Plantillas AST con Integración al Catálogo de Cuentas

**Feature Branch**: `001-motor-plantillas-ast`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Implementar el Motor de Plantillas AST (Subsistema S0 del SDD) integrado con el Catálogo de Cuentas PCGE existente. Incluye editor visual, compilador AST, versionado inmutable, test runner obligatorio, registro por empresa y auditoría. El rol Admin tiene permisos totales sin restricción."

**SDD Reference**: Subsistema S0 (§5), RD-10, RF-03, RF-08, NRF-01, NRF-11, HU-01, §10.1 (ASTTemplate, ITemplateRepository), §13.3 (modelo de datos ASTTemplate)

## User Scenarios & Testing

### User Story 1 — Crear una Plantilla de Traducción Contable (Priority: P1)

Como **Administrador**, quiero crear visualmente una plantilla de reglas AST que mapee campos de un comprobante a cuentas contables, para que el motor de traducción pueda generar asientos automáticamente sin intervención de código.

**Why this priority**: Sin plantillas AST no hay reglas que aplicar — es la fundación de todo el pipeline de traducción. Los specs posteriores (003-008) dependen de que existan plantillas funcionales.

**Independent Test**: Se puede verificar de forma aislada creando una plantilla, ejecutando su test runner con datos de ejemplo, y confirmando que produce las líneas de asiento esperadas.

**Acceptance Scenarios**:

1. **Given** el Admin está en la vista PlantillasGlobalesView y no existen plantillas, **When** hace clic en "Nueva Plantilla" y selecciona tipo de documento "FACTURA", **Then** se abre el editor visual con un lienzo vacío listo para definir condiciones y acciones.

2. **Given** el Admin está en el editor visual de una plantilla nueva, **When** define una regla con condición `Si doc.type == "FACTURA" Y doc.lines[*].taxCode == "IGV_18"` y acción `debitar cuenta 6011 por lineAmount, acreditar cuenta 4011 por taxAmount`, **Then** la regla se serializa como un objeto AST JSON válido con nodos de tipo `condition`, `action` y `split`.

3. **Given** el Admin ha definido reglas en el editor, **When** hace clic en "Guardar", **Then** el sistema compila las reglas a AST serializado, asigna la versión `v1`, guarda la plantilla con `isActive = true`, y el Admin ve la plantilla en el listado con estado "Activa - v1".

4. **Given** el Admin ha guardado una plantilla sin definir casos de prueba, **When** intenta activarla para producción, **Then** el sistema muestra un error indicando que se requiere al menos un caso de prueba obligatorio (NRF-11) antes de activar.

---

### User Story 2 — Ejecutar Casos de Prueba de una Plantilla (Priority: P1)

Como **Administrador**, quiero definir y ejecutar casos de prueba sobre una plantilla AST, para verificar que las reglas producen los asientos contables correctos antes de activarla.

**Why this priority**: Las pruebas obligatorias son un invariante del sistema (NRF-11). Sin esta funcionalidad, ninguna plantilla puede activarse.

**Independent Test**: Se puede probar creando una plantilla, definiendo un caso de prueba con datos de entrada y asiento esperado, y ejecutando el runner para verificar que pasa.

**Acceptance Scenarios**:

1. **Given** una plantilla "FACTURA_COMPRA_NACIONAL" existe en versión v1, **When** el Admin abre el panel de Test Cases y define un caso con un CanonicalDocument de entrada (factura de S/ 1,000 + IGV 18%) y un asiento esperado (débito 6011: S/ 1,000 + débito 4011: S/ 180, crédito 4212: S/ 1,180), **Then** el caso se guarda vinculado a la plantilla.

2. **Given** un caso de prueba está definido con entrada y salida esperada, **When** el Admin ejecuta el test runner, **Then** el sistema evalúa la plantilla AST contra la entrada, compara el resultado con el esperado (cuentas, montos en céntimos, débito/crédito) y muestra ✅ PASA o ❌ FALLA con el detalle de las diferencias.

3. **Given** una plantilla tiene 3 casos de prueba (2 pasan, 1 falla), **When** el Admin intenta activarla, **Then** el sistema rechaza la activación mostrando el caso fallido y la diferencia exacta.

---

### User Story 3 — Validar Cuentas contra el Catálogo PCGE (Priority: P1)

Como **Administrador**, quiero que el sistema valide automáticamente que las cuentas contables referidas en una plantilla existen en el catálogo de cuentas PCGE activo de la empresa, para prevenir errores de asentamiento.

**Why this priority**: Una plantilla que referencia cuentas inexistentes produciría asientos inválidos. La validación contra el PCGE real es esencial para la integridad contable.

**Independent Test**: Se puede probar creando una plantilla que refiera una cuenta existente (ej. 6011) y una inexistente (ej. 9999), y verificando que la validación marca la segunda como error.

**Acceptance Scenarios**:

1. **Given** una plantilla tiene acciones que referencian las cuentas 6011, 4011 y 4212, y todas existen en el Plan Contable activo (mockPlanContable), **When** el sistema ejecuta la validación de cuentas, **Then** todas las cuentas se muestran como ✅ válidas.

2. **Given** una plantilla referencia la cuenta 9999 que no existe en el Plan Contable, **When** el sistema ejecuta la validación, **Then** muestra un ⚠️ warning indicando "Cuenta 9999 no encontrada en el catálogo PCGE activo" y no impide guardar pero sí impide activar.

3. **Given** una plantilla referencia la cuenta 60 que existe pero NO es cuenta de último nivel (`esCuentaU = false`), **When** el sistema ejecuta la validación, **Then** muestra un ⚠️ warning indicando "Cuenta 60 no es cuenta de último nivel — los asientos requieren cuentas de detalle".

---

### User Story 4 — Versionar una Plantilla Usada (Priority: P2)

Como **Administrador**, quiero que al modificar una plantilla que ya fue utilizada en al menos un asiento, el sistema cree automáticamente una nueva versión sin alterar la anterior, para cumplir con la inmutabilidad de plantillas (RD-10).

**Why this priority**: El versionado inmutable es un invariante de dominio (RD-10) que garantiza la trazabilidad de cada asiento hasta la versión exacta de reglas que lo generó.

**Independent Test**: Se puede verificar creando una plantilla v1, marcándola como "usada" (usageCount > 0), editándola, y confirmando que se crea v2 mientras v1 permanece intacta.

**Acceptance Scenarios**:

1. **Given** la plantilla "FACTURA_COMPRA" tiene `version: 1`, `usageCount: 5`, `isActive: true`, **When** el Admin abre el editor y modifica una regla, **Then** el sistema crea una nueva versión `v2` con las reglas modificadas, desactiva `v1`, y el campo `diffFromPrevious` de `v2` muestra los cambios respecto a `v1`.

2. **Given** la plantilla tiene `version: 1`, `usageCount: 0` (nunca usada), **When** el Admin la edita, **Then** el sistema permite editar `v1` directamente sin crear nueva versión (ya que no hay asientos vinculados).

3. **Given** existen versiones v1 (usada, inactiva), v2 (usada, inactiva) y v3 (activa), **When** el Admin consulta el historial de versiones, **Then** ve las 3 versiones con su autor, fecha, diff, y la cantidad de asientos generados con cada una.

---

### User Story 5 — Activar/Desactivar Plantillas por Empresa (Priority: P2)

Como **Administrador**, quiero activar o desactivar plantillas específicas para cada empresa (tenant) del estudio, para que cada empresa use solo las reglas contables que le corresponden.

**Why this priority**: En un entorno SaaS multi-tenant, cada empresa puede tener reglas distintas. La activación por empresa permite personalización sin afectar a otras.

**Independent Test**: Se puede probar activando una plantilla para la Empresa A y verificando que no aparece activa para la Empresa B.

**Acceptance Scenarios**:

1. **Given** la plantilla "FACTURA_COMPRA_NACIONAL" está en el catálogo global, **When** el Admin navega a PlantillasEmpresaView de "DISTRIBUIDORA LOS ANDES SAC" y activa la plantilla para esa empresa, **Then** la plantilla queda vinculada al `tenantId` de esa empresa con `isActive: true`.

2. **Given** una plantilla está activa para "DISTRIBUIDORA LOS ANDES SAC", **When** el Admin la desactiva, **Then** la plantilla se marca como `isActive: false` para ese tenant, pero sigue existiendo en el catálogo global y activa para otros tenants que la tengan activada.

3. **Given** una empresa no tiene ninguna plantilla activa para el tipo "FACTURA", **When** el motor de traducción (spec 003-004) intente procesar una factura de esa empresa, **Then** el sistema debería indicar que no hay plantilla activa disponible para ese tipo de documento y tenant.

---

### User Story 6 — Consultar Auditoría de Plantillas (Priority: P3)

Como **Auditor** (rol de solo lectura), quiero ver el historial completo de todas las versiones de una plantilla con sus autores, fechas y cambios, para verificar el cumplimiento de la política de versionado.

**Why this priority**: La trazabilidad es un requisito de auditoría (RF-08), pero no bloquea la funcionalidad del motor.

**Independent Test**: Se puede probar creando varias versiones de una plantilla y verificando que el Auditor puede ver todo el historial sin poder modificar nada.

**Acceptance Scenarios**:

1. **Given** la plantilla "FACTURA_COMPRA" tiene 3 versiones creadas por distintos Admins en distintas fechas, **When** el Auditor accede a la vista de historial, **Then** ve una lista ordenada de versiones con: número de versión, autor (createdBy), fecha (createdAt), diff respecto a la versión anterior, cantidad de asientos generados (usageCount) y estado (activa/inactiva).

2. **Given** el Auditor está consultando la versión v2 de una plantilla, **When** intenta editar cualquier campo, **Then** el sistema no ofrece controles de edición — toda la interfaz es de solo lectura.

---

### Edge Cases

- ¿Qué pasa si el Admin intenta crear dos plantillas activas para el mismo tipo de documento y tenant? → Solo una puede estar activa; al activar la nueva, la anterior se desactiva automáticamente.
- ¿Qué pasa si se elimina una cuenta del PCGE que está referida en una plantilla activa? → La validación de cuentas detecta la inconsistencia y muestra un warning en la plantilla afectada.
- ¿Qué pasa si una plantilla tiene reglas AST con sintaxis inválida (nodos mal formados)? → El compilador AST rechaza la compilación y muestra errores descriptivos de qué nodo tiene el problema.
- ¿Qué pasa si el Admin intenta guardar una plantilla sin ninguna regla definida? → El sistema rechaza el guardado indicando que se requiere al menos una regla.
- ¿Qué pasa con una plantilla de versión anterior que ya no tiene test cases que pasen (porque las cuentas fueron modificadas)? → La versión anterior permanece inmutable; solo afecta la capacidad de activar esa versión específica.

## Requirements [RD-10, RF-03, RF-08, NRF-01, NRF-11, HU-01]

### Functional Requirements

- **FR-001**: El sistema MUST permitir al Admin crear plantillas AST mediante una interfaz visual que genere condiciones (nodos `condition`), acciones (nodos `action`) y splits (nodos `split`) sin escribir código.

- **FR-002**: El sistema MUST compilar las reglas visuales a un objeto AST JSON serializable con estructura de árbol evaluable, que contenga nodos tipados (`condition`, `action`, `split`) con campos consistentes.

- **FR-003**: El sistema MUST validar que toda cuenta contable referida en las acciones de una plantilla exista en el catálogo de cuentas PCGE activo de la empresa, distinguiendo entre cuentas existentes, inexistentes, y no-detalle (que no son de último nivel).

- **FR-004**: El sistema MUST asignar automáticamente un número de versión incremental (`v1`, `v2`, …) a cada plantilla guardada.

- **FR-005**: El sistema MUST impedir la modificación de una plantilla cuyo `usageCount > 0`; los cambios MUST crear una nueva versión preservando la anterior intacta (RD-10).

- **FR-006**: El sistema MUST requerir al menos un caso de prueba exitoso antes de permitir la activación de una plantilla (NRF-11).

- **FR-007**: El sistema MUST ejecutar los casos de prueba evaluando la plantilla AST contra datos de entrada y comparando el resultado contra el asiento esperado, reportando éxito o fallo con detalle de diferencias.

- **FR-008**: El sistema MUST registrar para cada versión: autor (`createdBy`), fecha de creación (`createdAt`), diferencias respecto a la versión anterior (`diffFromPrevious`) y cantidad de asientos generados (`usageCount`) (RF-08).

- **FR-009**: El sistema MUST permitir activar/desactivar plantillas por empresa (tenant), garantizando que solo una versión de una plantilla para un mismo tipo de documento esté activa por tenant.

- **FR-010**: El sistema MUST exponer una interfaz de solo lectura del historial de versiones accesible por el rol Auditor.

- **FR-011**: El sistema MUST proveer una API de dominio (`getActiveTemplate(tenantId, docType)`) que devuelva la plantilla activa para un tenant y tipo de documento, y `getTemplateByVersion(tenantId, docType, version)` para consultar versiones específicas — estas son las interfaces que usará el Motor de Traducción en specs posteriores.

- **FR-012**: El rol Admin MUST tener acceso completo y sin restricciones a todas las funciones de gestión de plantillas (crear, editar, versionar, activar/desactivar, ejecutar tests, ver auditoría).

### Key Entities

- **ASTTemplate**: Plantilla de reglas de traducción contable. Campos: `id`, `tenantId`, `documentType`, `version`, `rules` (AST JSON), `isActive`, `createdBy`, `createdAt`, `diffFromPrevious`, `usageCount`. Unique constraint: `(tenantId, documentType, version)`.

- **ASTRule (dentro de rules)**: Nodo del árbol AST. Tipos: `condition` (evaluación booleana sobre campos del CanonicalDocument), `action` (asignación de cuenta contable, monto y lado débito/crédito), `split` (distribución proporcional entre centros de costo).

- **TestCase (vinculado a ASTTemplate)**: Caso de prueba con datos de entrada (CanonicalDocument mock) y asiento esperado (líneas con cuentas, montos, lados). Vinculado a la versión de la plantilla.

- **Plan Contable (existente)**: Catálogo de cuentas PCGE con campos `codigo`, `descripcion`, `elemento`, `esCuentaU`, `moneda`, `requiereCC`. La validación de plantillas consulta este catálogo para verificar cuentas.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un Admin puede crear una plantilla funcional con reglas, test cases, y activarla para una empresa en menos de 10 minutos usando la interfaz visual.

- **SC-002**: El 100% de las cuentas referidas en plantillas activas son validadas contra el catálogo PCGE al momento de la activación.

- **SC-003**: Toda plantilla activa tiene al menos 1 caso de prueba exitoso al momento de su activación.

- **SC-004**: El historial de versiones muestra el autor, fecha, diff y uso de cada versión sin excepción.

- **SC-005**: Un Auditor puede consultar el historial completo de cualquier plantilla sin tener acceso a funciones de edición.

- **SC-006**: Las plantillas de datos semilla (mocks) incluyen al menos 2 plantillas funcionales con test cases exitosos para los tipos de documento más comunes (FACTURA_COMPRA, NOTA_CREDITO).

## Assumptions

- El catálogo de cuentas PCGE ya existe en el proyecto como `mockPlanContable.js` y está disponible a través del `AccountingContext`. No se requiere crear ni modificar el catálogo en este spec.
- Las vistas `PlantillasGlobalesView.jsx` y `PlantillasEmpresaView.jsx` ya existen en el routing de `App.jsx` y `Sidebar.jsx`. Se re-implementan desde cero en este spec.
- El evaluador AST es una función pura de dominio (`src/domain/templates/`) que recibe un `ASTTemplate` y un `CanonicalDocument` y produce una lista de `EntryLine`. El `CanonicalDocument` se definirá formalmente en el spec 003, pero este spec define un subset suficiente para los test cases.
- La persistencia de plantillas usa `localStorage` a través del repositorio de storage (`src/services/storage/`), siguiendo el patrón del proyecto.
- En este spec, el `CanonicalDocument` de entrada para los test cases es un objeto mock simplificado con los campos mínimos necesarios: `type`, `currency`, `issueDate`, `lines[]` con `amount`, `taxCode`, `tags`.
- Los specs 003-008 consumirán la API `getActiveTemplate()` sin modificar el motor de plantillas.
- El rol Admin tiene permisos para hacer absolutamente todo en el contexto de plantillas, sin ninguna restricción — esto incluye crear, editar, versionar, activar, desactivar, eliminar test cases y ver auditoría.

## Trazabilidad SDD
| SDD Ref | Cobertura |
|---------|----------|
| RD-10 | Versionado inmutable |
| RF-03 | AST Configurable |
| RF-08 | Auditoría de reglas |
| NRF-01 | Latencia <50ms |
| NRF-11 | Test Cases |
| HU-01 | Motor de Reglas |
