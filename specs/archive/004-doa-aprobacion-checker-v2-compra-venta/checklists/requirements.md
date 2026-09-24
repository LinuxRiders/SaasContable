# Requirements & Checklist

## Negocio
- [ ] Matriz DoA evalúa montos en centavos correctamente.
- [ ] Matriz DoA rutea correctamente a STP_AUTO o a CHECKER_L1/L2.
- [ ] Transacciones con Tipo de Cambio (FX) provisional son bloqueadas de STP.
- [ ] Un usuario no puede aprobar sus propios asientos (SoD).
- [ ] Un usuario Admin no tiene restricciones (ignora SoD).
- [ ] La aprobación transiciona de `PENDING_APPROVAL` a `POSTED`.
- [ ] El rechazo requiere motivo y transiciona a `REJECTED`.

## Técnico
- [ ] `doaEngine.js` carece de dependencias externas.
- [ ] Firmas criptográficas simulan el aseguramiento del payload (SHA-256).
- [ ] Tests en Vitest escritos y pasando.
- [ ] UI usa componentes base de React sin lógicas de dominio acopladas.
