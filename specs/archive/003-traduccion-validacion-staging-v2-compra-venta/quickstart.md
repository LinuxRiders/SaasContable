# Quickstart: 003 Traducción y Staging

## Prerrequisitos
* Tener el Spec 001 (Motor AST) y Spec 002 (Ingestion Pipeline) base operativos.
* Entorno Vite + React 18, Vitest para pruebas de dominio.

## Pasos de Ejecución

1. **Implementar Dominio**: Empezar en `src/domain/ingestion/`.
   * Programar `journalEntry.js` (Entidad).
   * Programar `translationEngine.js` (usa plantillas).
   * Programar `validationService.js` (RD-03, RD-12).

2. **Implementar Servicios de Aplicación**: En `src/services/ingestion/`.
   * Integrar con el repositorio storage local (`src/services/storage/repository.js`).
   * Manejar el contexto de tenant.

3. **Ejecutar Pruebas**:
   ```bash
   npm run test src/domain/ingestion/validationService.test.js
   ```

4. **Desarrollar Vistas**: En `src/views/`.
   * `BandejaView.jsx`: Bandeja central.
   * Probar el flujo HITL (Human In The Loop) con concurrencia.
