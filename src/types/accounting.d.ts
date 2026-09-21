export type ModalidadInicializacion = 'PCGE_2026' | 'IMPORTAR_EXCEL' | 'EN_BLANCO';

export interface CuentaContable {
  codigo: string;
  descripcion: string;
  elemento: number;
  esCuentaU: boolean;
  moneda?: string;
  tipoAnalisis?: string;
  requiereCentroCostos?: boolean;
  amarre1?: string;
  amarre2?: string;
  amarre3?: string;
  rubros?: string;
  digito?: number;
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
}

export interface PlanesPorEmpresa {
  [empresaId: string]: CuentaContable[];
}
