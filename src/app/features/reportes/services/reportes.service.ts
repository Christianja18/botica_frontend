import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { GenericCrudService } from '../../../core/services/http';
import { ExpiringProduct, InventoryAlert, MonthlyMetric, ReporteDTO } from '../models';

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

  getVentasPorMes(year: number): Observable<MonthlyMetric[]> {
    return this.get<MonthlyMetric[]>(`reportes/ventas-por-mes/${year}`);
  }

  getGananciasPorMes(year: number): Observable<MonthlyMetric[]> {
    return this.get<MonthlyMetric[]>(`reportes/ganancias-por-mes/${year}`);
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
}
