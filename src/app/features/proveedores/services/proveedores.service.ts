import { Injectable } from '@angular/core';

import { GenericCrudService } from '../../../core/services/http';
import { ProveedorDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProveedoresService extends GenericCrudService<ProveedorDTO> {
  constructor() {
    super('proveedores');
  }
}
