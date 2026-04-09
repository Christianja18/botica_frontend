import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { ExpiringProduct, InventoryAlert, MonthlyMetric, ReporteDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ReportesService extends BaseApiService {
  private readonly resourcePath = 'reportes';

  list(): Observable<ReporteDTO[]> {
    return this.get<ReporteDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<ReporteDTO> {
    return this.get<ReporteDTO>(`${this.resourcePath}/${id}`);
  }

  create(payload: ReporteDTO): Observable<ReporteDTO> {
    return this.post<ReporteDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: ReporteDTO): Observable<ReporteDTO> {
    return this.put<ReporteDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
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

    return this.post<ReporteDTO>(`${this.resourcePath}/generar/ventas`, null, { params });
  }

  generateInventoryReport(idUsuario: number): Observable<ReporteDTO> {
    const params = new HttpParams().set('idUsuario', idUsuario);
    return this.post<ReporteDTO>(`${this.resourcePath}/generar/inventario`, null, { params });
  }

  getVentasPorMes(year: number): Observable<MonthlyMetric[]> {
    return this.get<MonthlyMetric[]>(`${this.resourcePath}/ventas-por-mes/${year}`);
  }

  getGananciasPorMes(year: number): Observable<MonthlyMetric[]> {
    return this.get<MonthlyMetric[]>(`${this.resourcePath}/ganancias-por-mes/${year}`);
  }

  getInventarioBajo(): Observable<InventoryAlert[]> {
    return this.get<InventoryAlert[]>(`${this.resourcePath}/inventario-bajo`);
  }

  getProductosPorVencer(): Observable<ExpiringProduct[]> {
    return this.get<ExpiringProduct[]>(`${this.resourcePath}/productos-por-vencer`);
  }

  getProductosVencidos(): Observable<ExpiringProduct[]> {
    return this.get<ExpiringProduct[]>(`${this.resourcePath}/productos-vencidos`);
  }
}
