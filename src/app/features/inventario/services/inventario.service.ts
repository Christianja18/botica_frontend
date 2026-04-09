import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { InventarioDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class InventarioService extends BaseApiService {
  private readonly resourcePath = 'inventario';

  list(): Observable<InventarioDTO[]> {
    return this.get<InventarioDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<InventarioDTO> {
    return this.get<InventarioDTO>(`${this.resourcePath}/${id}`);
  }

  create(payload: InventarioDTO): Observable<InventarioDTO> {
    return this.post<InventarioDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: InventarioDTO): Observable<InventarioDTO> {
    return this.put<InventarioDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }
}
