# Quickstart

## Cómo Probar el Flujo de Aprobación
1.  **Ingresar como Maker (`contador_maria`)**:
    -   Crear un asiento contable.
    -   El asiento pasará a estado `PENDING_APPROVAL`.
    -   *SoD Check*: Intentar aprobar el asiento. El UI debe bloquear la acción y el servicio rechazar la solicitud.
2.  **STP Check (Auto-Aprobación)**:
    -   Crear un asiento de bajo monto y sin FX provisional.
    -   En la UI, forzar la ejecución del bot STP o verificar si el sistema lo aprobó y transicionó a `POSTED` con un `signedByUserId: "STP_BOT"`.
3.  **Ingresar como Checker (`revisor_luis`)**:
    -   Ir a la vista "Pendientes de Aprobación".
    -   Revisar un asiento de alto riesgo. Visualizar el payload original y el historial.
    -   Probar "Aprobar": Generará la firma y pasará a `POSTED`.
    -   Probar "Rechazar": Pedirá motivo, pasará a `REJECTED`.
4.  **Testing automatizado**:
    -   Ejecutar `npm run test -- doaEngine` y `npm run test -- approvalService`.
