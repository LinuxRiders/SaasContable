# 006 Reversiones Formales - Quickstart

## Cómo Probar las Reversiones

1. Levantar la aplicación con `npm run dev`.
2. Identificarse como usuario Admin (para tener full permisos y evitar restricciones de periodo cerrado).
3. Navegar al listado de asientos contables.
4. Seleccionar un asiento en estado `POSTED`.
5. En la vista de detalle, hacer clic en el botón **"Solicitar Reversión"**.
6. En el modal, ingresar una justificación (ej: "Error en monto original").
7. Confirmar. Se redirigirá a la vista del nuevo asiento en estado `DRAFT`.
8. Validar que las líneas (`lines`) del nuevo asiento tienen los montos invertidos respecto al original.
9. Continuar el flujo normal (Someter a aprobación -> Aprobar -> Publicar).
10. Regresar al asiento original y verificar que aparece un enlace indicando que tiene reversiones vinculadas.

## Comandos Útiles
- `npm run test src/domain/ingestion/reversalService.test.js` - Pruebas del dominio.
