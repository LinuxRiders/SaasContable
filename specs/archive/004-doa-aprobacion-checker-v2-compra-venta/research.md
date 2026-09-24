# Research: DoA, STP y SoD en Sistemas Contables SaaS

## 1. Contexto General
En sistemas SaaS multitenant, el proceso de aprobación es crítico para asegurar la integridad de la información contable. El PCGE 2026 requiere trazabilidad estricta.

## 2. Conceptos Clave
-   **STP (Straight-Through Processing):** Aprobación automática sin intervención humana. Se aplica a asientos contables de bajo monto, fuentes confiables o bajo riesgo.
-   **DoA (Delegation of Authority):** Tabla de reglas que dicta quién puede aprobar qué. Varía drásticamente por Tenant (cliente). Algunos requerirán "Todo pasa por el Contador", otros "Facturas menores a 1000 soles pasan automático".
-   **SoD (Segregation of Duties):** Principio de seguridad. Maker (creador) y Checker (revisor) deben ser personas distintas para evitar fraudes.
-   **Provisional FX:** Cuando una transacción se ingresa con un tipo de cambio estimado porque el oficial no está publicado. Esto introduce riesgo cambiario e impide el STP.

## 3. Criptografía Simulada
Para la transición a `POSTED`, requerimos una firma. En lugar de infraestructura PKI real, usaremos SHA-256 (via `crypto.subtle` nativo o un mock sincrónico en dominio) hasheando el objeto JSON serializado del asiento más los datos del aprobador. Esto asegura que si el asiento cambia después de aprobado, la firma es inválida.
