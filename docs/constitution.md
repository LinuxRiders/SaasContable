<!--
Sync Impact Report
- Versión: (plantilla sin versionar) → 1.0.0
- Principios: los 5 marcadores de la plantilla se reemplazan por 7 principios (I–VII)
- Secciones añadidas: Alcance y Restricciones Técnicas; Flujo de Desarrollo y Quality Gates
- Secciones eliminadas: ninguna
- TODO diferidos: ninguno
-->

# ContableOS (SaasContable) Constitution

Prototipo front-end de un sistema contable SaaS (Perú, PCGE, IGV) que simula un backend en el
navegador. Esta constitución rige todo el código nuevo, en especial el Subsistema de Ingestión,
Traducción y Asentamiento definido en `specs/SDD-ACL-Translation-Engine.md` (el "SDD").

## Core Principles

### I. Prototipo Front-End con Backend Simulado

- No existe servidor. Todo comportamiento de "backend" MUST vivir en una capa de servicios mock
  (`src/services/`) que expone funciones `async` que devuelven Promises, con latencia
  simulada configurable, y cuyas firmas reflejan los contratos abstractos del SDD §12
  (p. ej. `ingestDocument`, `queryStaging`, `batchUpdateStaging`, `approveJournalEntry`,
  `rejectJournalEntry`, `requestReversal`, `queryDLQ`, `reprocessFromDLQ`).
- La persistencia MUST ser `localStorage`, accedida solo a través de un único módulo de
  repositorio. Componentes, vistas y contextos de React MUST NOT leer ni escribir
  `localStorage` directamente.
- Las claves MUST estar namespaced y versionadas: `contableos:v<schema>:<tenantId>:<colección>`.
  Debe existir una acción de "reset a datos semilla" que recargue los mocks.
- Los servicios devuelven errores con forma estable (`{ code, message, details }`, p. ej.
  `CONFLICT`, `VALIDATION_ERROR`, `FORBIDDEN`, `PERIOD_CLOSED`), igual que lo haría una API.

Rationale: cambiar luego a un backend real debe significar reemplazar `src/services/`, no
reescribir la UI.

### II. Invariantes de Dominio Reales, Infraestructura Simulada

- Las reglas de dominio del SDD MUST implementarse de verdad y NUNCA ser burladas por la UI:
  RD-01 (payload raw append-only), RD-03 (Σ Débitos = Σ Créditos), RD-04 (idempotencia por hash
  `tenantId + RUC emisor + tipo + número + fecha`), RD-05 (Maker ≠ Checker), RD-07/RD-11
  (POSTED inmutable; corrección solo por asiento inverso vinculado), RD-08 (aislamiento por
  tenant), RD-09 (redondeo una sola vez por línea; tasa provisional impide STP), RD-10
  (plantillas versionadas inmutables una vez usadas) y RD-12 (solo periodos abiertos).
- La máquina de estados de `JournalEntry` MUST seguir el SDD §10.2 (DRAFT, PENDING_INPUT,
  PENDING_APPROVAL, POSTED, POSTED_PENDING_PUBLISH, REJECTED, CANCELLED); toda transición no
  definida MUST ser rechazada. No existe el estado `REVERSED`.
- La infraestructura MAY simularse de forma simple y visible: bus de eventos = emisor en memoria
  - log persistido; firma criptográfica = hash SHA-256 (Web Crypto) del contenido + usuario +
    timestamp; FX = tabla mock con un interruptor para simular caída del proveedor; DLQ, outbox y
    CQRS = colecciones y estados visibles, sin reintentos reales ni backoff.
- Fuera de alcance del prototipo: TLS, HSM/KMS, rate limiting, RPO/RTO, retención legal y
  SLAs de rendimiento (RNF-02, 04, 08, 12). Se documentan como "no simulado" cuando aplique.
- Los montos MUST manejarse en el dominio como enteros en unidades mínimas (céntimos) o con
  un helper de redondeo único; está prohibida la aritmética flotante acumulativa sobre montos.

Rationale: el valor del prototipo es validar las reglas contables y los flujos; la
infraestructura solo necesita ser creíble.

### III. Dominio Puro y Aislado (ACL)

- La lógica de dominio MUST vivir en `src/domain/` como funciones puras de JavaScript, sin
  imports de React, sin `localStorage`, sin `Date.now()`/aleatoriedad implícita (se inyectan
  reloj y generador de IDs).
- Los parsers (UBL XML, JSON de API, etc.) MUST producir un `CanonicalDocument`; el motor de
  traducción y todo lo posterior MUST depender solo del modelo canónico (RD-02).
- Parsers y plantillas se registran en un registro (Strategy); agregar un formato o una
  plantilla nueva MUST NOT requerir modificar el motor de traducción (OCP).
- Los modelos del SDD §13 (`CanonicalDocument`, `JournalEntry`, `EntryLine`, `ASTTemplate`,
  etc.) MUST documentarse con `@typedef` JSDoc y reutilizar sus nombres de campo.

Rationale: el dominio puro es lo que se prueba y lo que se reutilizaría con un backend real.

### IV. Identidad, Tenant y Segregación Simulados

- La identidad se simula con un selector en la UI (usuario mock, rol y empresa/tenant). No hay
  autenticación real.
- Roles mínimos del SDD §14: Maker, Checker, Admin de Plantillas, Auditor (solo lectura) y
  Operador de Soporte.
- Toda llamada a servicio MUST recibir un contexto `{ tenantId, userId, role }` y el servicio
  MUST validar permisos por rol, pertenencia al tenant y SoD. Ocultar un botón en la UI no
  cuenta como control.
- Cada acción relevante MUST registrar un evento de auditoría (quién, rol, tenant, cuándo,
  qué, `traceId`) consultable por el Auditor (HU-06).

Rationale: Maker-Checker y multi-tenant son el núcleo del SDD y deben poder demostrarse
cambiando de usuario en vivo.

### V. Pruebas del Dominio con Vitest

- Vitest es el único framework de pruebas. Cada regla de `src/domain/` MUST tener pruebas
  unitarias, como mínimo: balance RD-03, hash de idempotencia RD-04, transiciones de estado,
  SoD RD-05, reversión RD-11, periodo cerrado RD-12, evaluación AST, decisión DoA y redondeo
  FX RD-09.
- Cada plantilla AST semilla MUST tener al menos un caso de prueba con entrada y asiento
  esperado (RNF-11).
- Componentes y vistas de React no requieren pruebas automatizadas; se validan manualmente con
  los escenarios demo de cada spec.
- No se exige TDD estricto, pero ningún cambio de dominio se integra con pruebas en rojo.

Rationale: las reglas contables deben ser correctas; la UI de un prototipo cambia demasiado
para que valga la pena testearla.

### VI. Simplicidad y Stack Acotado

- Stack fijo: React 18, Vite, JavaScript (ES modules) con JSDoc, `lucide-react`, `theme.css`.
- No se agregan router, gestor de estado global, UI kit, ORM ni TypeScript. Una dependencia
  nueva MUST ser pequeña, justificada en el plan de la feature (sección Complexity Tracking) y
  preferiblemente de desarrollo (p. ej. `vitest`).
- Se prefieren APIs nativas del navegador (Web Crypto, `DOMParser`, `crypto.randomUUID`).
- YAGNI: no se construye infraestructura que el SDD pida pero que ninguna historia del
  prototipo demuestre.

Rationale: es un prototipo rápido; cada dependencia es deuda que se hereda.

### VII. Coherencia con el Prototipo Existente

- Los asientos que llegan a POSTED MUST publicarse (evento simulado `JournalEntryPosted`) hacia
  el libro de vouchers existente, para que aparezcan en Libros Contables, Mayor, Liquidación IGV
  y Cierre, con referencia al asiento y documento de origen.
- Los módulos actuales (Compras, Ventas, Tesorería, Conciliación, etc.) no se refactorizan salvo
  que una feature lo requiera explícitamente en su spec.
- Las vistas nuevas siguen el patrón actual: `src/views/*View.jsx`, entrada en `Sidebar.jsx` y
  `App.jsx`, tokens de `theme.css`, componentes compartidos (`Modal`, `MetricCard`).
- Idioma: la UI, los mensajes al usuario y la documentación en español; los identificadores del
  dominio del SDD (`JournalEntry`, `CanonicalDocument`, estados) se mantienen en inglés tal como
  están en el SDD.

Rationale: el prototipo debe sentirse como un solo producto y la ingestión debe verse reflejada
en la contabilidad ya existente.

## Alcance y Restricciones Técnicas

- **Fuente de verdad funcional:** el SDD. Si una spec contradice el SDD, se documenta la
  desviación en el plan y se justifica.
- **Datos semilla:** cada colección nueva tiene un mock en `src/data/` que siembra el
  repositorio cuando no hay datos persistidos.
- **Determinismo en demo:** latencia simulada y fallos simulados (p. ej. FX caído, parser que
  falla) se activan con interruptores explícitos, nunca al azar sin control.
- **Seguridad:** no se guardan secretos reales ni datos personales reales; todos los RUC, nombres
  y montos son ficticios.
- **Estructura orientativa del código nuevo:**
  `src/domain/` (lógica pura), `src/services/` (API mock), `src/services/storage/`
  (repositorio localStorage), `src/data/` (semillas), `src/views/` y `src/components/` (UI).

## Flujo de Desarrollo y Quality Gates

- Flujo Spec Kit: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks`
  → `/speckit-implement`. El `plan.md` MUST incluir un Constitution Check contra I–VII.
- Gates antes de dar una feature por terminada:
  1. `npm run build` sin errores.
  2. `npx vitest run` en verde (cuando exista dominio nuevo).
  3. Escenarios demo de la spec reproducidos manualmente en `npm run dev`, incluidos al menos
     un caso de Maker-Checker y un caso de rechazo por invariante.
  4. Recargar el navegador conserva el estado (localStorage) y el reset vuelve a la semilla.
- Commits en rama de feature; la rama `prototipo` integra el trabajo del MVP.

## Governance

- Esta constitución prevalece sobre otras prácticas del repositorio. Los planes y revisiones
  MUST verificar su cumplimiento; toda violación se justifica en Complexity Tracking.
- Enmiendas: se proponen con `/speckit-constitution`, se documentan en el Sync Impact Report y
  se versionan con SemVer: MAJOR para eliminar o redefinir principios, MINOR para agregar
  principios o secciones o ampliar guías materialmente, PATCH para aclaraciones.
- Si el prototipo pasa a tener un backend real, se MUST hacer una enmienda MAJOR que revise los
  principios I, II y VI.
- Revisión de cumplimiento: al cerrar cada feature y antes de fusionar a `prototipo`.

**Version**: 1.0.0 | **Ratified**: 2026-09-21 | **Last Amended**: 2026-09-21
