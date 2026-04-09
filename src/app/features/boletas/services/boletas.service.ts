import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { BoletaDTO } from '../models';

@Injectable({
  providedIn: 'root',
})
export class BoletasService extends BaseApiService {
  private readonly resourcePath = 'boletas';

  list(): Observable<BoletaDTO[]> {
    return this.get<BoletaDTO[]>(this.resourcePath);
  }

  getById(id: number): Observable<BoletaDTO> {
    return this.get<BoletaDTO>(`${this.resourcePath}/${id}`);
  }

  create(payload: BoletaDTO): Observable<BoletaDTO> {
    return this.post<BoletaDTO>(this.resourcePath, payload);
  }

  update(id: number, payload: BoletaDTO): Observable<BoletaDTO> {
    return this.put<BoletaDTO>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return super.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }
}
