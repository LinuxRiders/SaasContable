# Quickstart: Publicación y Eventos

## Configuración y Semillas de Datos
Para inicializar el entorno con datos de prueba, incluyendo el historial hash-chained inicial:
```bash
npm run seed:events
npm run dev
```

## Flujo Básico de Pruebas en UI
1. Iniciar sesión en la aplicación utilizando el rol `ADMIN` (tiene permisos totales, sin restricciones de ACL para propósitos de simulación).
2. Navegar a **Libro Diario** y aprobar un asiento contable en estado preliminar.
3. El sistema llamará a `publishService.js`.
4. Visualiza los saldos actualizados de forma inmediata en **Libro Mayor**.

## Forzar y Probar el Patrón Outbox
1. En la consola del desarrollador del navegador (F12), establece la siguiente variable en localStorage:
   ```javascript
   localStorage.setItem('DEBUG_EVENT_BUS_FAIL', 'true');
   ```
2. Aprueba un nuevo asiento.
3. El estado del asiento reflejado en el UI será `POSTED_PENDING_PUBLISH`.
4. Cambia el valor en localStorage a `false`.
5. Ejecuta `window.app.retryOutbox()` en la consola para procesar la cola pendiente y ver cómo el asiento pasa a `POSTED` y emite sus eventos.
