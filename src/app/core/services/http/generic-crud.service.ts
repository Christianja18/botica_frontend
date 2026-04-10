import { Observable } from 'rxjs';

import { BaseApiService } from './base-api.service';

export abstract class GenericCrudService<TItem, TPayload = TItem> extends BaseApiService {
  protected constructor(private readonly resourcePath: string) {
    super();
  }

  list(): Observable<TItem[]> {
    return this.get<TItem[]>(this.resourcePath);
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
}
