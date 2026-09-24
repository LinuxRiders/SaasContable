# 006 Reversiones Formales - Investigación y Decisiones

## Contexto Contable (PCGE 2026)
Según las normativas contables, los errores en registros ya oficializados (mayorizados) no pueden ser borrados ni sobrescritos. La práctica estándar es la emisión de un "contra-asiento" o "asiento de reversión" que anula los efectos financieros del original.

## Decisiones de Diseño (SDD RD-07, RD-11)
- **Estado Original**: El asiento original NO cambia de estado (no existe estado "REVERSED"). Sigue siendo `POSTED`.
- **Detección de Reversión**: Para saber si un asiento está revertido, se busca si existe otro `JournalEntry` cuyo `reversalOfId` sea el ID del original y que esté en estado `POSTED`.
- **Montos**: Se invertirán los signos (o se cambiarán de Debe a Haber según el enfoque interno) para que la suma neta sea 0 en centavos. Mantendremos los importes en centavos (integers).
- **Justificación**: Es obligatorio un campo de `reason` o `justification` al solicitar la reversión.

## Casos Extremos a Manejar
- Intento de revertir un asiento que no está `POSTED`. (Error).
- Intento de revertir un asiento en un periodo cerrado por un usuario sin permisos suficientes. (Error).
- Intento de revertir un asiento que ya ha sido revertido previamente. (Advertencia o Error según regla).
