# Guía de Inicio Rápido y Testing (007)

## Cómo iniciar
1. Asegúrate de que las dependencias estén instaladas: `npm install`.
2. Inicia el servidor de desarrollo Vite: `npm run dev`.
3. Abre la aplicación en `http://localhost:5173`.

## Flujo 1: Generar fallos y ver la DLQ (Admin / Support Operator)
1. Inicia sesión como `Admin`.
2. Ve al panel de "Resiliencia" (Circuit Breaker) y cambia el estado de `FX_API` a `OPEN`.
3. Ve a "Subida de Documentos" e ingresa una factura en USD (que requerirá consulta de tipo de cambio).
4. El sistema fallará rápido (Fail-fast).
5. Cierra sesión e ingresa con un rol `SupportOperator`.
6. Navega a la vista "Bandeja DLQ". Observarás el documento fallido con un error tipo `API_UNAVAILABLE`.
7. Haz clic en "Re-encolar" (Re-enroll). Como la API sigue cerrada, volverá a fallar y aparecerá en la DLQ con el contador de intentos (`retryCount`) incrementado.

## Flujo 2: Subida Masiva (Batch) y Barra de Progreso
1. Ingresa como `Contador`.
2. Navega a "Importación Masiva".
3. Utiliza la herramienta de generación de carga simulada (un botón en UI para desarrollo) para inyectar 100 documentos válidos y 5 inválidos.
4. Presiona "Importar". Observarás el componente `BatchProgress` llenando la barra.
5. Al finalizar, mostrará `105 Procesados: 100 Exitosos, 5 Fallidos`.
6. (Opcional) Si ingresas luego como `SupportOperator`, verás esos 5 documentos fallidos en la DLQ.

## Flujo 3: Testeo de Alertas de SLA (Time Travel)
1. Como `Admin`, sube un documento válido para que pase al Staging Area (estado `PENDING_INPUT`).
2. Usa el botón oculto "Simular +48h" en el panel de Admin para retroceder el `createdAt` de ese documento 2 días.
3. Actualiza la página del dashboard principal; deberás ver un `StagingAlert` activo notificando al supervisor de la demora en la contabilización.
