# Quickstart — Validación de 001 Ingestión de Comprobantes

Guía para comprobar que la funcionalidad funciona de punta a punta. Los detalles de datos y
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
2. En la vista de Ingestión, pulsar **Reiniciar datos de demostración**.
3. En el Header, elegir la empresa **PACHATUSANTREK SAC** y un usuario con rol **Maker**.

## 3. Escenarios (catálogo de ejemplos, CA-18.4)

Cargar cada ejemplo con la plantilla indicada. Salvo que se diga otra cosa, usar
"PL-01 Compra de Mercaderías".

| # | Ejemplo | Resultado esperado | Valida |
|---|---|---|---|
| 1 | Compra válida PEN | Pendiente de aprobación; Debe gasto + IGV = Haber 4212 por el total, más las líneas de amarre | HU-01, RF-08, RF-09 |
| 2 | Venta válida PEN (plantilla PL-04) | Pendiente de aprobación; Debe 1212 = Haber 7012 + IGV | RF-06, RF-08 |
| 3 | Compra USD (servicio de tipo de cambio disponible) | Pendiente de aprobación; muestra USD, la tasa del día y los montos en PEN | HU-05, RF-07 |
| 4 | Compra USD con **servicio caído** (activar el interruptor antes de cargar) | Pendiente de aprobación con la marca "tasa provisional / requiere revisión humana" | CA-07.3, CA-13.2 |
| 5 | Volver a cargar el ejemplo 1 | Duplicado enlazado al original; sin asiento nuevo | HU-02, RF-03 |
| 6 | Duplicado con diferencias | "Duplicado con diferencias" con alerta de totales | CA-03.3 |
| 7 | Archivo dañado | Fallido: "El archivo está dañado…" | RF-05 |
| 8 | Dato obligatorio faltante | Fallido: "Falta el dato obligatorio: …" | CA-04.2 |
| 9 | Otra empresa | Rechazado: no pertenece a la empresa | RF-06 |
| 10 | Periodo cerrado (agosto 2026) | Bandeja: "Periodo cerrado o no abierto"; solo revalidar o cancelar | RD-12 |
| 11 | Montos inconsistentes | Bandeja: "Montos inconsistentes"; solo cancelar | RF-09 |
| 12 | Cinco compras con "PL-06 Seguros y Gastos por CC" | 5 en bandeja por "Falta centro de costo"; asignar CC-ADMIN en lote → las 5 pasan a pendiente de aprobación | HU-03, CF-05 |
| 13 | Compra PEN con plantilla PL-04 (venta) | Bandeja: "Plantilla no corresponde"; cambiar a PL-01 → pendiente de aprobación | CA-11.1 |
| 14 | Lote con los ejemplos 1, 7 y 5 juntos | Resumen: 1 pendiente, 1 fallido, 1 duplicado | HU-01 escenario 2 |

## 4. Controles transversales

| Prueba | Pasos | Resultado esperado |
|---|---|---|
| Rol denegado | Cambiar a **Auditor** e intentar cancelar desde la bandeja | Acción rechazada; evento `ACTION_DENIED` en la trazabilidad | 
| Checker | Cambiar a **Checker** | Solo ve "Pendientes de aprobación", en solo lectura |
| Trazabilidad | Como Auditor, abrir el historial del escenario 12 | Recepción → interpretación → borrador → bandeja → cambio del Maker → pendiente, con el mismo código de seguimiento |
| Cancelación | Cancelar el escenario 11 con la justificación "Proveedor anuló" | Estado Cancelado; volver a subirlo da duplicado |
| Conflicto | Abrir la bandeja en dos pestañas; completar el mismo asiento en ambas | La segunda recibe "conflicto" |
| Aislamiento | Cambiar a otra empresa | No se ve nada de PACHATUSANTREK; al volver, todo sigue ahí |
| Atrasado | Ver la bandeja tras el reinicio | El asiento semilla con más de 48 horas aparece destacado como atrasado |
| Persistencia | Recargar el navegador (F5) | Lotes, asientos e historial intactos |
| Reinicio | Pulsar Reiniciar datos de demostración | Todo vuelve a la semilla |
| Límite de lote | Subir 51 archivos | Carga rechazada completa: "máximo 50 comprobantes" |
| Módulos existentes | Registrar una compra en el módulo Compras | Funciona igual que antes |
