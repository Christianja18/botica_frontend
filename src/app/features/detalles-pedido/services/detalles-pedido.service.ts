import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { DetallePedidoDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DetallesPedidoService extends BaseApiService {
  private readonly resourcePath = 'detalles-pedido';

  list(): Observable<DetallePedidoDTO[]> {
    return this.get<DetallePedidoDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<DetallePedidoDTO> {
    return this.get<DetallePedidoDTO>(`${this.resourcePath}/${id}`);
  }

  create(payload: DetallePedidoDTO): Observable<DetallePedidoDTO> {
    return this.post<DetallePedidoDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: DetallePedidoDTO): Observable<DetallePedidoDTO> {
    return this.put<DetallePedidoDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }
}
