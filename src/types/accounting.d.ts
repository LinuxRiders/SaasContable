export type ModalidadInicializacion = 'PCGE_2026' | 'IMPORTAR_EXCEL' | 'EN_BLANCO';

export interface SesionEstudio {
  usuarioId: string;
  nombre: string;
  rol: "Maker" | "Checker" | "Admin" | "Auditor";
  codigoEstudio: string;
  autenticado: boolean;
  fechaAcceso: string;
}

export interface PeriodoContable {
  ejercicio: string;
  mes: number;
  nombrePeriodo: string;
  estado: "ABIERTO" | "CERRADO";
  fechaCierre?: string;
  cerradoPor?: string;
}

export interface CuentaContable {
  codigo: string;
  descripcion: string;
  elemento: number;
  esCuentaU: boolean;
  moneda?: string;
  tipoAnalisis?: "Por Documento / RUC" | "Banco / Conciliación" | "Centro de Costos" | "Solo Monto / Sin Análisis";
  requiereCentroCostos?: boolean;
  amarre1?: string;
  amarre2?: string;
  amarre3?: string;
  rubros?: string;
  digito?: number;
  ajusteDiferenciaCambio?: boolean;
  tieneMovimientos?: boolean;
}

export interface Empresa {
  id: string;
  ruc: string;
  razonSocial: string;
  abreviatura?: string;
  regimen: string;
  monedaBase: string;
  monedaSecundaria?: string;
  telefono?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  correo?: string;
  planAsignado?: string;
  digitosRegistro: string;
  estado: string;
  asientosCount: number;
  cuentasCount: number;
  
  // Novedades para Navegación Global
  ejerciciosDisponibles?: string[];
  periodos?: PeriodoContable[];
  plantillasActivasIds?: string[];
}

export interface PlanesPorEmpresa {
  [empresaId: string]: CuentaContable[];
}
