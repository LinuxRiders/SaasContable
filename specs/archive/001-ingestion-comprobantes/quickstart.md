# Quickstart — Validación de 001 Ingestión de Comprobantes

Guía para comprobar que la funcionalidad funciona de punta a punta y se integra con el prototipo
existente (login, empresas, periodos, catálogo de cuentas y plantillas). Los detalles de datos y
operaciones están en [data-model.md](data-model.md) y [contracts/services.md](contracts/services.md).

## Requisitos previos

- Node 18 o superior (Web Crypto disponible en las pruebas).
- `npm install` (instala también `vitest` y `happy-dom`, que son de desarrollo).

## 1. Chequeos automáticos (gates de la constitución)

| Paso | Comando | Resultado esperado |
|---|---|---|
| Build | `npm run build` | Sin errores |
| Pruebas | `npm test` (ejecuta `vitest run`) | Todas en verde |

## 2. Preparación de la demo

1. `npm run dev` y abrir `http://localhost:5173`.
2. Iniciar sesión con acceso rápido **Maker** (`contador_maria`).
3. En Copias de Seguridad, pulsar **Reset a datos semilla** (es el mismo reinicio que el de la
   ingestión, R-17).
4. En la Cartera de Empresas, elegir **PACHATUSANTREK SAC**, ejercicio **2026**, periodo
   **Setiembre** (ABIERTO) e **Ingresar al periodo**.

Usuarios de demostración (CA-15.6): `contador_maria` (Maker), `revisor_luis` (Checker),
`auditora_ana` (Auditor), `admin_pedro` (Admin). Todos con la clave `123456`.

## 3. Escenarios de ingestión (catálogo de ejemplos, CA-18.4)

Cargar cada ejemplo con la plantilla indicada. Salvo que se diga otra cosa, usar
"PL-01 Compra de Mercaderías".

| # | Ejemplo | Resultado esperado | Valida |
|---|---|---|---|
| 1 | Compra válida PEN | Pendiente de aprobación; Debe 6011101 + IGV = Haber 4212 por el total, más los amarres 2011101/6111101 tomados del catálogo de la empresa | HU-01, CA-08.2, CA-08.5 |
| 2 | Venta válida PEN (plantilla PL-04) | Pendiente de aprobación; Debe 1212 = Haber 7012 + IGV | RF-06, RF-08 |
| 3 | Compra USD (plantilla PL-02, servicio de tipo de cambio disponible) | Pendiente de aprobación; muestra USD, la tasa del día y los montos en PEN; CC-LOGISTICA por defecto | HU-05, RF-07 |
| 4 | Compra USD con **servicio caído** (activar el interruptor antes de cargar) | Pendiente de aprobación con la marca "tasa provisional / requiere revisión humana" | CA-07.3, CA-13.2 |
| 5 | Volver a cargar el ejemplo 1 | Duplicado enlazado al original; sin asiento nuevo | HU-02, RF-03 |
| 6 | Duplicado con diferencias | "Duplicado con diferencias" con alerta de totales | CA-03.3 |
| 7 | Archivo dañado | Fallido: "El archivo está dañado…" | RF-05 |
| 8 | Dato obligatorio faltante | Fallido: "Falta el dato obligatorio: …" | CA-04.2 |
| 9 | Otra empresa | Rechazado: no pertenece a la empresa | RF-06 |
| 10 | Periodo cerrado (agosto 2026) | Bandeja: "Periodo cerrado o no abierto"; solo revalidar o cancelar | CA-09.4 |
| 11 | Montos inconsistentes | Bandeja: "Montos inconsistentes"; solo cancelar | RF-09 |
| 12 | Cinco compras con "PL-06 Otros Gastos de Gestión por CC" (cuenta 6591101, sin CC por defecto) | 5 en bandeja por "Falta centro de costo"; asignar CC-ADMIN en lote → las 5 pasan a pendiente de aprobación | HU-03, CF-05, CA-08.4 |
| 13 | Compra PEN con plantilla PL-04 (venta) | Bandeja: "Plantilla no corresponde"; cambiar a PL-01 → pendiente de aprobación | CA-11.1 |
| 14 | Lote con los ejemplos 1, 7 y 5 juntos | Resumen: 1 pendiente, 1 fallido, 1 duplicado | HU-01 escenario 2 |

## 4. Integración con el catálogo de cuentas, periodos y plantillas

| # | Pasos | Resultado esperado | Valida |
|---|---|---|---|
| I-1 | En el Catálogo de Cuentas, editar 6591101 y ponerle centro de costo asociado CC-ADMIN (amarre3). Cargar una compra con PL-06 | Pendiente de aprobación directo, con CC-ADMIN en las líneas de gasto y destino | CA-08.4 |
| I-2 | En el Catálogo, quitar la marca de uso (U) a 6011101. Cargar una compra con PL-01 | Bandeja: "Cuenta no imputable" | RF-09, R-16 |
| I-3 | Con el asiento de I-2 en la bandeja, volver a marcar 6011101 como de uso y pulsar **Revalidar** | Pasa a pendiente de aprobación | CA-11.7, CA-08.5 |
| I-4 | Eliminar del Catálogo la cuenta 9411101 (amarre). Cargar una compra con PL-02 | Bandeja: "Cuenta inexistente" en la línea de destino | RF-09 |
| I-5 | Crear una cuenta en el Catálogo, recargar el navegador (F5) | La cuenta sigue en el catálogo | CA-18.1b |
| I-6 | En el Catálogo, editar una cuenta de gasto con el modal y activar "Requiere centro de costos" (campo `requiereCentroCostos`); cargar una compra que use esa cuenta sin CC | Bandeja: "Falta centro de costo" (el nombre del campo se normaliza) | R-16 |
| I-7 | Salir de la empresa, entrar a PACHATUSANTREK en **Agosto 2026** (CERRADO) | Aviso de periodo cerrado; carga y acciones de bandeja desactivadas; un intento por otra vía responde `PERIOD_READ_ONLY` | CA-09.5 |
| I-8 | Cerrar setiembre desde el módulo de empresas en otra pestaña e intentar procesar un lote en la pestaña original | Rechazado con `PERIOD_READ_ONLY` (el servicio lee el estado vigente) | CA-09.5, RNF-04 |
| I-9 | Entrar a una empresa cuyas plantillas activas en el módulo de empresas son solo "servicios" (`TPL-SERV-01`) | El selector muestra solo PL-02, PL-03, PL-06 y PL-07 (activaciones iniciales) | CA-01.2b, CA-23.3 |
| I-10 | Entrar a una empresa sin plantillas activas | Aviso "Esta empresa no tiene plantillas activas…"; no se puede procesar | CA-01.2b |
| I-11 | Cerrar setiembre, reabrirlo y revalidar un asiento que estaba en la bandeja por un periodo cerrado | Avanza si no tiene otros motivos | Casos límite |

## 4b. Motor de plantillas (HU-08, HU-09, HU-10)

Entrar como **Admin** (`admin_pedro`).

| # | Pasos | Resultado esperado | Valida |
|---|---|---|---|
| P-1 | En modo global, abrir **Plantillas Globales** | Banco con PL-01 a PL-07, cada una con su versión activa, sus reglas y sus casos de prueba | RF-19, R-11 |
| P-2 | Crear "COMPRA_ALQUILERES" (compra; defaults 6361101 / 4011101 / 4212101); agregar la regla de línea "contiene ALQUILER → prorrateo 70 % 6361101 con CC-ADMIN y 30 % 6361101 con CC-LOGISTICA" | Queda como versión 1 en borrador | HU-08.1 |
| P-3 | Intentar activar sin casos de prueba | Rechazado: "falta al menos un caso" y "regla sin cubrir" | CA-21.3 |
| P-4 | Guardar una regla con 70 % + 20 % | No se guarda: "los porcentajes deben sumar 100 %" | CA-19.5 |
| P-5 | Agregar un caso con una línea "ALQUILER OFICINA" de S/ 100.01 y su asiento esperado; pulsar **Probar** | Caso en verde; partes 70.00 y 30.01; asiento cuadrado; regla cubierta | CA-21.2, CA-20.2 |
| P-6 | Activar la versión 1 | Estado ACTIVA; evento `TEMPLATE_VERSION_ACTIVATED` | CA-21.3 |
| P-7 | Salir, entrar a PACHATUSANTREK / Setiembre como Admin, abrir **Plantillas de la empresa** y activar COMPRA_ALQUILERES | Activada, sin advertencias | CA-23.1 |
| P-8 | En la misma pantalla, activar una plantilla cuya cuenta se eliminó antes del catálogo de la empresa | Se activa con la advertencia "cuenta X inexistente" | CA-23.2 |
| P-9 | Como Maker, cargar un comprobante con la línea "ALQUILER OFICINA" usando COMPRA_ALQUILERES | Asiento con dos líneas de gasto (CC-ADMIN 70 % y CC-LOGISTICA 30 %) y sus destinos; el detalle muestra la regla aplicada | RF-20, CA-20.4 |
| P-10 | Como Admin, **Editar** PL-07 (activa) | Se crea la versión 2 en borrador; la 1 sigue activa | CA-22.2 |
| P-11 | Cambiar una regla de la versión 2, probar y activar | La versión 1 pasa a retirada; el historial muestra las diferencias; los asientos anteriores siguen con "versión 1" | CA-22.3, CA-22.4, CF-11 |
| P-12 | Como Maker, revalidar un asiento de la bandeja hecho con PL-07 v1 | Se recalcula con la v2 y queda el evento `TEMPLATE_VERSION_CHANGED` | CA-11.3, R-24 |
| P-13 | Como Admin, desactivar PL-06 en la empresa; como Maker, revalidar un asiento de la bandeja con PL-06 | Motivo "Plantilla no activa"; solo se puede cambiar de plantilla o cancelar | HU-10.3 |
| P-14 | Como Maker o Auditor, intentar abrir el editor o activar una plantilla | El Auditor ve el banco en solo lectura; las acciones se deniegan y registran | CA-15.2b |

## 5. Controles transversales

| Prueba | Pasos | Resultado esperado |
|---|---|---|
| Rol Auditor | Cerrar sesión, entrar como `auditora_ana`, ir a la bandeja e intentar cancelar | Acciones ocultas; un intento por otra vía da `FORBIDDEN` y `ACTION_DENIED` en la trazabilidad |
| Rol Admin | Entrar como `admin_pedro` | Solo lectura en la carga, la bandeja y los pendientes; puede administrar plantillas (§4b) |
| Rol Checker | Entrar como `revisor_luis` | Solo ve "Pendientes de aprobación", en solo lectura |
| Trazabilidad | Como Auditor, abrir el historial del escenario 12 | Recepción → interpretación → borrador → bandeja → cambio del Maker → pendiente, con el mismo código de seguimiento y el usuario real de la sesión |
| Cancelación | Cancelar el escenario 11 con la justificación "Proveedor anuló" | Estado Cancelado; volver a subirlo da duplicado |
| Conflicto | Abrir la bandeja en dos pestañas; completar el mismo asiento en ambas | La segunda recibe "conflicto" |
| Aislamiento | Salir y entrar a otra empresa | No se ve nada de PACHATUSANTREK; al volver, todo sigue ahí |
| Atrasado | Ver la bandeja tras el reinicio | El asiento semilla con más de 48 horas aparece destacado como atrasado |
| Persistencia | Recargar el navegador (F5) | Sesión, lotes, asientos, historial, catálogos, periodos, plantillas (con sus borradores) y activaciones intactos |
| Reinicio | Pulsar Reset a datos semilla (Copias de Seguridad) o Reiniciar (ingestión) | Todo vuelve a la semilla; la sesión se mantiene |
| Límite de lote | Subir 51 archivos | Carga rechazada completa: "máximo 50 comprobantes" |
| Módulos existentes | Registrar una compra en el módulo Compras; editar, importar y clonar el Catálogo | Funcionan igual que antes (ahora el catálogo persiste) |
