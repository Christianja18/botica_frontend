import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { CategoriaDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class CategoriasService extends BaseApiService {
  private readonly resourcePath = 'categorias';

  list(): Observable<CategoriaDTO[]> {
    return this.get<CategoriaDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<CategoriaDTO> {
    return this.get<CategoriaDTO>(`${this.resourcePath}/${id}`);
  }

  create(payload: CategoriaDTO): Observable<CategoriaDTO> {
    return this.post<CategoriaDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: CategoriaDTO): Observable<CategoriaDTO> {
    return this.put<CategoriaDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }
}
