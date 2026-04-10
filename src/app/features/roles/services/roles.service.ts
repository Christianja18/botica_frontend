import { Injectable } from '@angular/core';

import { GenericCrudService } from '../../../core/services/http';
import { RolDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class RolesService extends GenericCrudService<RolDTO> {
  constructor() {
    super('roles');
  }
}
