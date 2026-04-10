import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { GenericCrudService } from '../../../core/services/http';
import { ProductoDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProductosService extends GenericCrudService<ProductoDTO> {
  constructor() {
    super('productos');
  }

  searchByNombre(nombre: string): Observable<ProductoDTO[]> {
    return this.get<ProductoDTO[]>('productos/search', {
      params: new HttpParams().set('nombre', nombre),
    });
  }

  getByCodigoBarras(codigoBarras: string): Observable<ProductoDTO> {
    return this.get<ProductoDTO>(`productos/codigo-barras/${encodeURIComponent(codigoBarras)}`);
  }
}
