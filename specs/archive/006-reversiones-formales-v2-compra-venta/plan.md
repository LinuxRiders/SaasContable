# 006 Reversiones Formales - Plan de Implementación

## Arquitectura
- **Dominio (`src/domain/ingestion/reversalService.js`)**: Lógica pura para crear un asiento inverso a partir de uno original. Validaciones de estado y reglas de negocio.
- **Servicio (`src/services/ingestion/reversalService.js`)**: Capa de aplicación asíncrona. Orquesta la obtención del asiento original, la creación del reverso y la persistencia en `localStorage`.
- **UI (`src/views/ingestion/JournalEntryDetailView.jsx`)**: Botón para solicitar reversión. 
- **UI (`src/components/ingestion/ReversalRequestModal.jsx`)**: Modal para capturar la justificación de la reversión.

## Estrategia
1.  **Dominio**: Implementar la lógica para invertir un `JournalEntry` (signos opuestos en líneas) y enlazarlo (`reversalOfId`).
2.  **Servicios**: Crear el servicio asíncrono para ejecutar la reversión simulando latencia.
3.  **UI**: Integrar el botón de reversión en la vista de detalle del asiento, condicionado a que esté `POSTED`.
4.  **Flujo M-C**: Garantizar que el asiento generado fluya por los componentes ya desarrollados en 004 y 005.

## Dependencias
- Requiere 004 (Maker-Checker) para el flujo de aprobación.
- Requiere 005 (Publicación) para asientos en estado `POSTED`.
