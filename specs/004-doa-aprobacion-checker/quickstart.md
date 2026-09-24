# Quickstart: DoA, Firma y Aprobación

**Prerrequisitos**: specs 001 a 003 implementados.

## Pruebas automáticas

| Área | Qué demuestra |
|---|---|
| `decideApproval` | cada regla semilla; nivel máximo gana; piso del sistema para tasa provisional, intervención manual, imagen/PDF, formulario y registro tardío; determinismo |
| `canApprove` | nivel insuficiente; creador, interviniente, quien subió el documento y solicitante de reversión bloqueados; excepción vigente y vencida |
| Firma | `verifySignature` verdadero; falso si cambia una línea después de firmar |
| E2E `approval.e2e.test.js` | con los documentos de prueba: DOC-01, DOC-03, DOC-04 y DOC-06 → STP → `POSTED`; DOC-07, DOC-09, DOC-10 (tras verificar) y DOC-16 → nivel 1; `revisor_luis` aprueba DOC-10 (verificado por `contador_maria`); `contador_maria` no puede aprobar |
| Servicio | `CONFLICT`; `PERIOD_CLOSED` al firmar; rechazo sin motivo; servicio de firmas caído y restablecido; reinterpretación de un rechazado |

## Escenarios manuales

1. Maker carga DOC-01 → en **Asientos**, `POSTED` con firma "Agente STP".
2. Maker carga DOC-10 y lo verifica → Checker `revisor_luis` → **Pendientes de aprobación**: nivel 1, motivos "Lectura desde imagen" e "Intervención manual" → aprobar → `POSTED`.
3. Registrar por formulario una factura de S/ 60,000.00 → nivel 2: `revisor_luis` ve "nivel insuficiente"; `gerente_rosa` aprueba.
4. Activar "Servicio de firmas caído", cargar DOC-04 → queda pendiente con alerta → desactivar → se firma solo.
5. Rechazar un asiento con motivo → el Maker lo ve rechazado y usa "Volver a interpretar".
6. Admin → **Matriz de aprobación** → bajar el umbral STP a S/ 2,000.00 → versión 2 con diff; cargar un documento de S/ 2,360.00 → nivel 1.
