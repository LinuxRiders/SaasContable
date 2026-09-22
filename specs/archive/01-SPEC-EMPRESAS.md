# 01 — SPEC: Gestión y Configuración de Empresas

> **Módulo:** Configuración / Cartera de Empresas
> **Documentos de Referencia:** `ContextoProyecto/03-PRD.md` (RF-101 a RF-106), Figma `118-2`, `118-369`, `118-868`, `153-2`, `154-2`

---

## 1. Modelo de Datos de Dominio

```typescript
export interface Empresa {
  id: string;                      // Identificador único interno (ej. "EMP-01")
  ruc: string;                    // RUC de 11 dígitos numéricos
  razonSocial: string;            // Razón social oficial según SUNAT
  abreviatura: string;            // Nombre comercial corto para listados y pestañas
  regimenTributario: RegimenTributario;
  monedaBase: "PEN" | "USD";      // Moneda principal funcional
  monedaSecundaria: "USD" | "PEN";
  ejercicioInicial: string;       // Año fiscal de inicio (ej. "2026")
  periodoActivo: string;          // Período contable en curso (ej. "SETIEMBRE_2026")
  estadoPeriodo: "ABIERTO" | "CERRADO";
  
  // Parámetros del Plan Contable
  planAsignadoTipo: "PCGE_DEFAULT" | "IMPORTADO_EXCEL" | "EN_BLANCO";
  nombrePlan: string;             // Ej. "PCGE 2026 - Oficial Modificado"
  digitosRegistro: number;        // Por defecto 7 dígitos (nivel analítico)
  totalCuentasActivas: number;

  // Contacto y Ubicación
  direccionFiscal: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  correoContable: string;
  telefono: string;

  // Automatizaciones Contables (Figma 118-868)
  cierreAutomaticoDestino: boolean;  // Cierre Clase 6 a 9/79 automático
  validarRucSunatEnLinea: boolean;
  diferenciaCambioAutomatica: boolean;
  bloquearVouchersPeriodoCerrado: boolean;
  
  estado: "ACTIVA" | "EN_REVISION" | "SUSPENDIDA";
}

export type RegimenTributario = 
  | "Régimen General (29.5%)"
  | "Régimen MYPE Tributario"
  | "Régimen Especial (RER)"
  | "Nuevo RUS";
```

---

## 2. Requisitos Funcionales y Reglas de Negocio

* **RF-101 (Alta de Empresa):**
  * Validación de RUC: debe constar de 11 dígitos numéricos y comenzar con 10, 15, 17 o 20.
  * Al ingresar RUC en la interfaz, se simula auto-completado de Razón Social y Domicilio Fiscal.
* **RF-102 & RF-103 (Modalidad de Plan Contable al Registrar):**
  El asistente de registro debe ofrecer 3 opciones excluyentes:
  1. `[Por Defecto] Duplicar PCGE Maestro 2026 Oficial`: clona el catálogo pre-cargado con 1,420 cuentas analíticas y sus amarres 6 ➔ 9/79.
  2. `[Importar Archivo] Subir Excel / CSV`: permite adjuntar `PlanContable.xlsx` o archivo compatible, ejecutando el parser y cargando las cuentas de inmediato.
  3. `[En Blanco] Catálogo Limpio`: crea la estructura raíz con los Elementos 1 al 9 vacíos para que el contador ingrese únicamente las cuentas que utilizará.
* **RF-104 (Selector de Empresa Activa):**
  * La empresa activa se muestra permanentemente en el header y sidebar.
  * Cambiar de empresa actualiza de inmediato el contexto del Plan Contable y todos los reportes.
* **RF-105 (Control de Período):**
  * Si el período está en estado `CERRADO`, se inhabilita cualquier creación o modificación de cuentas que afecte ejercicios históricos.

---

## 3. Componentes de UI a Desarrollar / Refinar

1. **`EmpresasListView`**:
   - Tarjetas métricas: Total Empresas, Empresas Activas, Régimen MYPE/General, Padrón SUNAT.
   - Tabla interactiva con columnas: N°, Razón Social / Abreviatura, RUC, Régimen, Plan Asignado, Estado, y botón para "Seleccionar Empresa Activa".
   - Filtros por Régimen, Estado y barra de búsqueda predictiva.
2. **`ModalNuevaEmpresa`** (Asistente en 3 pasos según Figma `154-2` y `155-2`):
   - *Paso 1 (Identificación):* RUC, Razón Social, Abreviatura, Régimen, Moneda.
   - *Paso 2 (Configuración de Plan Contable):* Selección de los 3 métodos de carga (PCGE default, Importar Excel, En blanco) y longitud de dígitos (7).
   - *Paso 3 (Confirmación y Resumen):* Revisión de datos y botón "Aperturar Empresa".\n