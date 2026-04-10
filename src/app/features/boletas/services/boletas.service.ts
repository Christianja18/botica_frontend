import { Injectable } from '@angular/core';

import { GenericCrudService } from '../../../core/services/http';
import { BoletaDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class BoletasService extends GenericCrudService<BoletaDTO> {
  constructor() {
    super('boletas');
  }
}
