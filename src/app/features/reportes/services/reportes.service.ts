import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { GenericCrudService } from '../../../core/services/http';
import { BestSellingProduct, ExpiringProduct, InventoryAlert, MonthlyMetric, PeriodSummary, ReportPeriodGrouping, ReporteDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ReportesService extends GenericCrudService<ReporteDTO> {
  constructor() {
    super('reportes');
  }

  generateSalesReport(payload: {
    fechaInicio: string;
    fechaFin: string;
    idUsuario: number;
  }): Observable<ReporteDTO> {
    const params = new HttpParams()
      .set('fechaInicio', payload.fechaInicio)
      .set('fechaFin', payload.fechaFin)
      .set('idUsuario', payload.idUsuario);

    return this.post<ReporteDTO>('reportes/generar/ventas', null, { params });
  }

  generateInventoryReport(idUsuario: number): Observable<ReporteDTO> {
    const params = new HttpParams().set('idUsuario', idUsuario);
    return this.post<ReporteDTO>('reportes/generar/inventario', null, { params });
  }

  getVentasResumen(agrupacion: ReportPeriodGrouping, year?: number): Observable<PeriodSummary[]> {
    let params = new HttpParams().set('agrupacion', agrupacion);
    if (year !== undefined && year !== null) {
      params = params.set('year', year);
    }
    return this.get<PeriodSummary[]>('reportes/ventas-resumen', { params });
  }

  getGananciasResumen(agrupacion: ReportPeriodGrouping, year?: number): Observable<PeriodSummary[]> {
    let params = new HttpParams().set('agrupacion', agrupacion);
    if (year !== undefined && year !== null) {
      params = params.set('year', year);
    }
    return this.get<PeriodSummary[]>('reportes/ganancias-resumen', { params });
  }

  getVentasPorMes(year: number): Observable<MonthlyMetric[]> {
    return this.getVentasResumen('mes', year).pipe(
      map((items) =>
        items.map((item) => ({
          anio: item.anio,
          mes: item.periodo,
          month: item.periodo,
          etiqueta: item.etiqueta,
          totalVentas: item.valor,
          total_ventas: item.valor,
        })),
      ),
    );
  }

  getGananciasPorMes(year: number): Observable<MonthlyMetric[]> {
    return this.getGananciasResumen('mes', year).pipe(
      map((items) =>
        items.map((item) => ({
          anio: item.anio,
          mes: item.periodo,
          month: item.periodo,
          etiqueta: item.etiqueta,
          ganancia: item.valor,
        })),
      ),
    );
  }

  getInventarioBajo(): Observable<InventoryAlert[]> {
    return this.get<InventoryAlert[]>('reportes/inventario-bajo');
  }

  getProductosPorVencer(): Observable<ExpiringProduct[]> {
    return this.get<ExpiringProduct[]>('reportes/productos-por-vencer');
  }

  getProductosVencidos(): Observable<ExpiringProduct[]> {
    return this.get<ExpiringProduct[]>('reportes/productos-vencidos');
  }

  getProductosMasVendidos(): Observable<BestSellingProduct[]> {
    return this.get<BestSellingProduct[]>('reportes/productos-mas-vendidos');
  }
}
