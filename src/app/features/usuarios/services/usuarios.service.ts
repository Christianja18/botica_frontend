import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { UsuarioDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class UsuariosService extends BaseApiService {
  private readonly resourcePath = 'usuarios';

  list(): Observable<UsuarioDTO[]> {
    return this.get<UsuarioDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<UsuarioDTO> {
    return this.get<UsuarioDTO>(`${this.resourcePath}/${id}`);
  }

  create(payload: UsuarioDTO): Observable<UsuarioDTO> {
    return this.post<UsuarioDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: UsuarioDTO): Observable<UsuarioDTO> {
    return this.put<UsuarioDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }
}
