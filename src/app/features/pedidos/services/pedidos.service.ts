import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { GenericCrudService } from '../../../core/services/http';
import { PedidoDTO, PedidoEstado } from '../models';

@Injectable({
  providedIn: 'root',
})
export class PedidosService extends GenericCrudService<PedidoDTO> {
  constructor() {
    super('pedidos');
  }

  getByEstado(estado: PedidoEstado): Observable<PedidoDTO[]> {
    return this.get<PedidoDTO[]>(`pedidos/estado/${estado}`);
  }
}
