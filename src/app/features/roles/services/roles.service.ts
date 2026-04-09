import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { RolDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class RolesService extends BaseApiService {
  private readonly resourcePath = 'roles';

  list(): Observable<RolDTO[]> {
    return this.get<RolDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<RolDTO> {
    return this.get<RolDTO>(`${this.resourcePath}/${id}`);
  }

  create(payload: RolDTO): Observable<RolDTO> {
    return this.post<RolDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: RolDTO): Observable<RolDTO> {
    return this.put<RolDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }
}
