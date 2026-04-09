import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { PedidoDTO, PedidoEstado } from '../models';

@Injectable({
  providedIn: 'root',
})
export class PedidosService extends BaseApiService {
  private readonly resourcePath = 'pedidos';

  list(): Observable<PedidoDTO[]> {
    return this.get<PedidoDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<PedidoDTO> {
    return this.get<PedidoDTO>(`${this.resourcePath}/${id}`);
  }

  getByEstado(estado: PedidoEstado): Observable<PedidoDTO[]> {
    return this.get<PedidoDTO[]>(`${this.resourcePath}/estado/${estado}`);
  }

  create(payload: PedidoDTO): Observable<PedidoDTO> {
    return this.post<PedidoDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: PedidoDTO): Observable<PedidoDTO> {
    return this.put<PedidoDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }
}
