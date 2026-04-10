import { Injectable } from '@angular/core';

import { GenericCrudService } from '../../../core/services/http';
import { ClienteDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ClientesService extends GenericCrudService<ClienteDTO> {
  constructor() {
    super('clientes');
  }
}
