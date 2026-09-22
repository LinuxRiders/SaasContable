# 00 — SDD: Visión General y Alcance Acotado

> **Sistema:** [CONTABLE_OS v2.4] / SaaS Contable Perú
> **Fase:** Prototipo Frontend & Diseño Funcional (Full React + Vite, Sin Backend)
> **Alcance:** Gestión de Empresas, Plan Contable (PCGE) y Motor Lógico de Mapeo Debe/Haber
> **Ejecutor:** AGY (Antigravity CLI en Terminal)
> **Fecha:** Setiembre 2026

---

## 1. Propósito del Documento

Este conjunto de especificaciones (*Spec-Driven Development — SDD*) define de forma contractual y determinística los requisitos, modelos de datos, flujos de usuario, reglas de negocio y tareas de implementación para el módulo central de **Configuración de Empresas, Catálogo de Cuentas (PCGE) y Lógica de Mapeo Contable**.

Este documento sirve como la **única fuente de verdad** para que el agente **AGY** ejecute la programación en la terminal sin ambigüedades ni desviaciones.

---

## 2. Delimitación Estricta del Alcance (Scope Bounding)

De acuerdo con la división de responsabilidades del proyecto:

### ✅ DENTRO DEL ALCANCE (Nuestro Enfoque)
1. **Gestión y Cartera de Empresas**:
   - Listado y búsqueda de empresas cliente del estudio contable.
   - Alta/Edición de empresa con RUC, Razón Social, Régimen Tributario, Moneda y Período.
   - Inicialización del Plan Contable de la empresa mediante 3 modalidades:
     - *Modo 1:* Duplicar Plan PCGE Maestro 2026 oficial (por defecto).
     - *Modo 2:* Importar catálogo propio desde archivo (`PlanContable.xlsx` o CSV).
     - *Modo 3:* Iniciar catálogo en blanco (creación manual progresiva).
   - Asignación de parámetros contables: longitud de dígitos de registro analítico (7 dígitos).

2. **Gestión del Plan Contable (Catálogo de Cuentas)**:
   - Parser en frontend para procesar e importar archivos `PlanContable.xlsx` reales.
   - Navegación jerárquica por Elementos del PCGE (1 Activo al 9 Analíticas).
   - Clasificación estricta entre **Cuentas Sintéticas / Padre** (no imputables) y **Cuentas de Uso `U`** (analíticas aptas para recibir asientos).
   - Ficha de Mantenimiento de Cuenta: configuración de moneda, tipo de análisis (por Documento/RUC), requerimiento obligatorio de Centro de Costos, y **Amarres Automáticos** (Clase 6 a Clase 9 / 79).

3. **Motor Lógico de Mapeo y Determinación Debe / Haber**:
   - Matriz de reglas declarativas de enlace (Concepto/Operación ➔ Cuenta `U`).
   - Lógica pura de determinación de posición contable (**DEBE** vs **HABER**) basada en la naturaleza contable (Activo/Gasto al Debe, Pasivo/Patrimonio/Ingreso al Haber).
   - Generación automática de asientos de destino (amarres de Clase 6 a 9x y contrapartida en 79).
   - Validador estricto de partida doble (Σ Debe == Σ Haber) e integridad contable (rechazo de cuentas padre en vouchers).

### ❌ FUERA DEL ALCANCE (Responsabilidad de Otro Desarrollador / Fase Posterior)
- Pantallas visuales de carga de facturas de compras o ventas (hoja GASTOS/VENTAS).
- Módulos visuales de Tesorería avanzada, Caja y Bancos operativa.
- Integraciones API en vivo con SUNAT (se simulan respuestas y validaciones).
- Módulos de facturación electrónica o envío de libros electrónicos (PLE/SIRE).

---

## 3. Principios de Arquitectura Frontend (ADR Relevance)

Siguiendo los lineamientos de `ContextoProyecto/05-ADR-LOG.md`:
* **ADR-001 (Español en Dominio):** Entidades, campos y funciones del negocio contable se nombran en español (`CuentaContable`, `esCuentaU`, `amarre1`, `debe`, `haber`).
* **ADR-002 (Precisión Decimal):** Todos los cálculos monetarios utilizan dos decimales fijos `toFixed(2)` con redondeo estándar para evitar discrepancias de céntimos.
* **ADR-009 (PCGE Maestro):** Toda empresa opera con un catálogo anclado al estándar peruano PCGE 2026.
* **ADR-011 (Cuenta y Afectación Tributaria Independientes):** El código de cuenta y la afectación tributaria (gravada, exonerada, inafecta) se modelan como dimensiones separadas.
* **ADR-017 (El Sistema Propone, el Humano Aprueba):** El motor contable genera sugerencias y pre-asientos que el contador puede inspeccionar y confirmar.

---

## 4. Índice de Especificaciones SDD

1. [`01-SPEC-EMPRESAS.md`](./01-SPEC-EMPRESAS.md) — Gestión de Empresas y Cartera.
2. [`02-SPEC-PLAN-CONTABLE.md`](./02-SPEC-PLAN-CONTABLE.md) — Plan Contable, Parser Excel y Amarres.
3. [`03-SPEC-MAPEO-DEBE-HABER.md`](./03-SPEC-MAPEO-DEBE-HABER.md) — Motor Lógico de Mapeo y Reglas Debe/Haber.
4. [`04-TASKS-ROADMAP.md`](./04-TASKS-ROADMAP.md) — Tareas atómicas para AGY con criterios de aceptación.\n