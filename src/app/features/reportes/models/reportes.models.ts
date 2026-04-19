export interface ReporteDTO {
  idReporte?: number;
  tipoReporte: string;
  fechaGeneracion?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  generadoPor: number;
  datos?: string | null;
  archivoPath?: string | null;
}

export interface InventoryAlert {
  nombre?: string;
  stockActual?: number;
  stock_actual?: number;
  stockMinimo?: number;
  stock_minimo?: number;
}

export interface ExpiringProduct {
  nombre: string;
  fechaVencimiento?: string;
  fecha_vencimiento?: string;
  diasParaVencer?: number;
  dias_para_vencer?: number;
}

export type ReportPeriodGrouping =
  | 'dia'
  | 'mes'
  | 'anio'
  | 'bimestral'
  | 'trimestral'
  | 'semestral'
  | 'anual_consolidado';

export interface PeriodSummary {
  anio?: number;
  periodo?: number;
  etiqueta?: string;
  valor?: number;
}

export interface MonthlyMetric {
  anio?: number;
  mes?: number;
  month?: number;
  etiqueta?: string;
  totalVentas?: number;
  total_ventas?: number;
  ganancia?: number;
}
