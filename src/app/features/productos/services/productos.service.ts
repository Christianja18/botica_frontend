import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { ProductoDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProductosService extends BaseApiService {
  private readonly resourcePath = 'productos';

  list(): Observable<ProductoDTO[]> {
    return this.get<ProductoDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<ProductoDTO> {
    return this.get<ProductoDTO>(`${this.resourcePath}/${id}`);
  }

  searchByNombre(nombre: string): Observable<ProductoDTO[]> {
    return this.get<ProductoDTO[]>(`${this.resourcePath}/search`, {
      params: new HttpParams().set('nombre', nombre),
    });
  }

  getByCodigoBarras(codigoBarras: string): Observable<ProductoDTO> {
    return this.get<ProductoDTO>(`${this.resourcePath}/codigo-barras/${encodeURIComponent(codigoBarras)}`);
  }

  create(payload: ProductoDTO): Observable<ProductoDTO> {
    return this.post<ProductoDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: ProductoDTO): Observable<ProductoDTO> {
    return this.put<ProductoDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }
}
