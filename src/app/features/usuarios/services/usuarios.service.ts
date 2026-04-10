import { Injectable } from '@angular/core';

import { GenericCrudService } from '../../../core/services/http';
import { UsuarioDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class UsuariosService extends GenericCrudService<UsuarioDTO> {
  constructor() {
    super('usuarios');
  }
}
