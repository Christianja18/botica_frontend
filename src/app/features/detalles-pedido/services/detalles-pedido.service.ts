import { Injectable } from '@angular/core';

import { GenericCrudService } from '../../../core/services/http';
import { DetallePedidoDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DetallesPedidoService extends GenericCrudService<DetallePedidoDTO> {
  constructor() {
    super('detalles-pedido');
  }
}
