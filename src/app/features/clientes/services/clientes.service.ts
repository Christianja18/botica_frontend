import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { ClienteDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ClientesService extends BaseApiService {
  private readonly resourcePath = 'clientes';

  list(): Observable<ClienteDTO[]> {
    return this.get<ClienteDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<ClienteDTO> {
    return this.get<ClienteDTO>(`${this.resourcePath}/${id}`);
  }

  create(payload: ClienteDTO): Observable<ClienteDTO> {
    return this.post<ClienteDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: ClienteDTO): Observable<ClienteDTO> {
    return this.put<ClienteDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }
}
