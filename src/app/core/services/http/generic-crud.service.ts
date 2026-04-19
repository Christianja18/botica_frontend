import { HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PageQueryParams, PageResponse } from '../../models';
import { BaseApiService } from './base-api.service';

export abstract class GenericCrudService<TItem, TPayload = TItem> extends BaseApiService {
  protected constructor(private readonly resourcePath: string) {
    super();
  }

  list(): Observable<TItem[]> {
    return this.get<TItem[]>(this.resourcePath);
  }

  listPage(query: PageQueryParams, paginatedPath = 'paginado'): Observable<PageResponse<TItem>> {
    const params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('sortBy', query.sortBy ?? 'id')
      .set('direction', query.direction ?? 'asc');

    return this.get<PageResponse<TItem>>(`${this.resourcePath}/${paginatedPath}`, { params });
  }

  getById(id: number): Observable<TItem> {
    return this.get<TItem>(`${this.resourcePath}/${id}`);
  }

  create(payload: TPayload): Observable<TItem> {
    return this.post<TItem>(this.resourcePath, payload);
  }

  update(id: number, payload: TPayload): Observable<TItem> {
    return this.put<TItem>(`${this.resourcePath}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.deleteRequest<void>(`${this.resourcePath}/${id}`);
  }

  exportData(format: 'csv' | 'excel'): Observable<HttpResponse<Blob>> {
    return this.getBlobResponse(`${this.resourcePath}/exportar/${format}`);
  }

  importData(format: 'csv' | 'excel', file: File): Observable<{
    recurso?: string;
    formato?: string;
    totalFilas?: number;
    insertados?: number;
    actualizados?: number;
    fallidos?: number;
    errores?: { fila?: number; mensaje?: string }[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.postForm(`${this.resourcePath}/importar/${format}`, formData);
  }
}
