import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { ProveedorDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProveedoresService extends BaseApiService {
  private readonly resourcePath = 'proveedores';

  list(): Observable<ProveedorDTO[]> {
    return this.get<ProveedorDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<ProveedorDTO> {
    return this.get<ProveedorDTO>(`${this.resourcePath}/${id}`);
  }

  create(payload: ProveedorDTO): Observable<ProveedorDTO> {
    return this.post<ProveedorDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: ProveedorDTO): Observable<ProveedorDTO> {
    return this.put<ProveedorDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }
}
