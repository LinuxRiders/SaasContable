# AGENTS.md — ContableOS (SaasContable)

Guía para agentes de IA y desarrolladores que trabajan en este repositorio. Resume las reglas
operativas; la autoridad final es la constitución en
[.specify/memory/constitution.md](.specify/memory/constitution.md). Si hay conflicto, gana la
constitución.

## 1. Qué es este proyecto

Prototipo **solo front-end** (MVP) de un sistema contable SaaS para Perú (PCGE 2026, IGV 18%,
SUNAT). No hay servidor: el "backend" se simula en el navegador con mocks y `localStorage`.

- **Existente:** módulos de Empresas, Plan Contable, Bancos, Plantillas, Usuarios, Compras,
  Ventas, Tesorería, Libros Contables, Conciliación, Liquidación IGV y Cierre. Su estado vive en
  memoria en [src/context/AccountingContext.jsx](src/context/AccountingContext.jsx), sembrado
  desde `src/data/mock*.js`.
- **En construcción:** Subsistema de Ingestión, Traducción y Asentamiento, definido en
  [specs/SDD-ACL-Translation-Engine.md](specs/SDD-ACL-Translation-Engine.md) (el "SDD"). Es la
  fuente de verdad funcional para todo el trabajo nuevo.

## 2. Comandos

| Acción                               | Comando                       |
| ------------------------------------ | ----------------------------- |
| Instalar dependencias                | `npm install`                 |
| Servidor de desarrollo (puerto 5173) | `npm run dev`                 |
| Build de producción                  | `npm run build`               |
| Previsualizar el build               | `npm run preview`             |
| Pruebas de dominio y servicios       | `npm test` o `npx vitest run` |

## 3. Stack y límites

- React 18, Vite, JavaScript (ES modules) con **JSDoc** para tipos, `lucide-react` para íconos,
  [src/theme.css](src/theme.css) para tokens de diseño.
- **Prohibido agregar:** TypeScript, router, gestor de estado global, UI kits, ORM o librerías
  pesadas. Toda dependencia nueva debe ser pequeña y justificarse en el `plan.md` de la feature
  (sección _Complexity Tracking_).
- Preferir APIs nativas: Web Crypto (SHA-256), `DOMParser` (XML UBL), `crypto.randomUUID`.

## 4. Arquitectura del código nuevo

```
src/
  domain/            Lógica pura: sin React, sin localStorage, reloj e IDs inyectados
    ingestion/       Pipeline de ingestión, canonical, validación, tipo de cambio y dedup
    templates/       Motor de plantillas, ciclo de vida, evaluador AST, diff y validación de cuentas
  services/          "API" mock: funciones async, latencia simulada, contratos del SDD §12
    storage/         Único repositorio que toca localStorage
  data/              Datos semilla (mocks)
  views/             Vistas *View.jsx (registrar en Sidebar.jsx y App.jsx)
  components/        Componentes compartidos (Modal, MetricCard, Header, Sidebar)
```

Reglas de capas:

1. **UI → services → domain / storage.** Vistas, componentes y contextos **nunca** leen ni
   escriben `localStorage` directamente.
2. Los servicios son `async`, reciben siempre un contexto `{ tenantId, userId, role }` y
   devuelven errores con forma estable `{ code, message, details }`
   (`VALIDATION_ERROR`, `CONFLICT`, `FORBIDDEN`, `PERIOD_CLOSED`, …).
3. Claves de `localStorage`: `contableos:v<schema>:<tenantId>:<colección>`. Debe existir una
   acción de **reset a datos semilla**.
4. **ACL:** los parsers (UBL XML, JSON de API) producen un `CanonicalDocument`; nada después
   del parser conoce el formato de origen. Parsers y plantillas se registran en un registro
   (Strategy): agregar uno no modifica el motor de traducción.
5. Los modelos del SDD §13 (`CanonicalDocument`, `JournalEntry`, `EntryLine`, `ASTTemplate`,
   …) se definen con `@typedef` y conservan sus nombres de campo en inglés.

## 5. Reglas de dominio que no se pueden romper

Se implementan de verdad en `src/domain/` y se validan en los servicios, no solo en la UI.

| Regla         | Qué exige                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| RD-01         | El payload raw se guarda append-only y nunca se modifica.                                                                   |
| RD-03         | Σ Débitos = Σ Créditos (en moneda funcional) antes de pasar a `PENDING_APPROVAL`.                                           |
| RD-04         | Idempotencia por hash `tenantId + RUC emisor + tipo + número + fecha`; duplicados se registran y no avanzan.                |
| RD-05         | Maker ≠ Checker en el mismo flujo.                                                                                          |
| RD-07 / RD-11 | `POSTED` es inmutable; se corrige solo con un asiento inverso vinculado (`reversalOfId`) que repite el ciclo Maker-Checker. |
| RD-08         | Ningún dato cruza entre tenants.                                                                                            |
| RD-09         | Tasa FX al `issueDate`, redondeo una sola vez por línea; tasa provisional obliga a aprobación humana (sin STP).             |
| RD-10         | Una plantilla usada no se edita: se crea una versión nueva; cada asiento guarda su versión.                                 |
| RD-12         | Solo se asienta en periodos abiertos.                                                                                       |

- **Máquina de estados** (SDD §10.2): `DRAFT`, `PENDING_INPUT`, `PENDING_APPROVAL`, `POSTED`,
  `POSTED_PENDING_PUBLISH`, `REJECTED`, `CANCELLED`. Toda transición no definida se rechaza.
  **No existe `REVERSED`.**
- **Montos:** enteros en céntimos o un único helper de redondeo. Nada de sumas flotantes
  acumuladas.

## 6. Qué se simula y qué no

| Componente del SDD             | En el prototipo                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Bus de eventos                 | Emisor en memoria + log persistido                                                              |
| Firma criptográfica            | Hash SHA-256 de contenido + usuario + timestamp                                                 |
| API de tipo de cambio          | Tabla mock con interruptor para simular caída                                                   |
| DLQ, outbox, proyecciones CQRS | Colecciones y estados visibles, sin reintentos ni backoff reales                                |
| Latencia y fallos              | Configurables mediante interruptores explícitos, nunca aleatorios sin control                   |
| **No se simula**               | TLS, HSM/KMS, rate limiting, RPO/RTO, retención legal, SLAs de rendimiento (RNF-02, 04, 08, 12) |

## 7. Identidad, roles y auditoría

- La identidad del usuario y su rol provienen de la pantalla de inicio de sesión (`LoginView`),
  persistida en `accountingStore.loadSession()` / `global:session`.
- Roles (SDD §14): **Maker** (`contador_maria`), **Checker** (`supervisor_carlos`), **Admin de Plantillas** (`admin_pedro`),
  **Auditor** (`auditora_ana`, solo lectura).
- El **Admin** gestiona el catálogo global de plantillas (`PlantillasGlobalesView`) y las activaciones por empresa (`PlantillasEmpresaView`).
- Los servicios validan rol, tenant y SoD. Ocultar un botón **no** es un control.
- Toda acción relevante genera un evento de auditoría (usuario, rol, tenant, fecha, acción,
  `traceId`) visible para el Auditor.

## 8. Integración con el prototipo existente

- Los asientos que llegan a `POSTED` se publican (evento `JournalEntryPosted`) hacia el libro de
  vouchers existente, para que aparezcan en Libros, Mayor, Liquidación IGV y Cierre, con
  referencia al asiento y documento de origen.
- **No refactorizar** Compras, Ventas, Tesorería, Conciliación, etc., salvo que la spec de la
  feature lo pida explícitamente.
- Las vistas nuevas siguen el patrón actual: `src/views/*View.jsx`, entrada en
  [src/components/Sidebar.jsx](src/components/Sidebar.jsx) y [src/App.jsx](src/App.jsx),
  tokens de `theme.css`, `Modal` y `MetricCard` reutilizados.

## 9. Pruebas

- **Vitest instalado:** ejecución con `npm test` o `npx vitest run`.
  Cobertura de dominio y servicios: balance (RD-03), hash de idempotencia
  (RD-04), transiciones de estado, SoD (RD-05), reversión (RD-11), periodo cerrado (RD-12),
  evaluación AST, decisión DoA y redondeo FX (RD-09).
- Cada plantilla AST semilla tiene al menos un caso con entrada y asiento esperado.
- La UI se valida manualmente con los escenarios demo de cada spec.
- No se exige TDD, pero no se integra código de dominio con pruebas en rojo.
- La UI se valida manualmente con los escenarios demo de cada spec.
- No se exige TDD, pero no se integra código de dominio con pruebas en rojo.

## 10. Flujo de trabajo (Spec Kit)

1. `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
   `/speckit-implement` (opcional: `/speckit-analyze`, `/speckit-checklist`).
2. Cada `plan.md` incluye un **Constitution Check** contra los principios I–VII.
3. Las specs viven en `specs/`; las desviaciones respecto al SDD se documentan y justifican.

**Definición de terminado** — antes de dar una feature por cerrada:

- [ ] `npm run build` sin errores.
- [ ] `npx vitest run` en verde (si hay dominio nuevo).
- [ ] Escenarios demo reproducidos en `npm run dev`, incluido al menos un caso Maker-Checker y
      un rechazo por invariante.
- [ ] Al recargar el navegador se conserva el estado; el reset vuelve a la semilla.

## 11. Convenciones

- **Idioma:** UI, mensajes al usuario, comentarios y documentación en **español**.
  Identificadores del dominio del SDD en **inglés** (`JournalEntry`, `CanonicalDocument`,
  estados).
- **Datos:** solo ficticios (RUC, nombres, montos). Nunca secretos ni datos personales reales.
- **Git:** trabajar en ramas de feature; `prototipo` integra el MVP y `main` es la rama
  principal. No hacer commits ni push sin que se pida.
- Escribir código que se parezca al que lo rodea: mismo estilo, nombres y densidad de
  comentarios.
