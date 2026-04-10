import { Injectable } from '@angular/core';

import { GenericCrudService } from '../../../core/services/http';
import { CategoriaDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class CategoriasService extends GenericCrudService<CategoriaDTO> {
  constructor() {
    super('categorias');
  }
}
