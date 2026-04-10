import { Injectable } from '@angular/core';

import { GenericCrudService } from '../../../core/services/http';
import { InventarioDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class InventarioService extends GenericCrudService<InventarioDTO> {
  constructor() {
    super('inventario');
  }
}
