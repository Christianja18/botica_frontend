import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { appSettings } from '../../config/app.settings';

export abstract class BaseApiService {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl = appSettings.apiBaseUrl;

  protected buildUrl(path: string): string {
    const normalizedBase = this.baseUrl.replace(/\/$/, '');
    const normalizedPath = path.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
  }

  protected getRequest<T>(path: string, options?: { params?: HttpParams }): Observable<T> {
    return this.http.get<T>(this.buildUrl(path), options);
  }

  protected get<T>(path: string, options?: { params?: HttpParams }): Observable<T> {
    return this.getRequest<T>(path, options);
  }

  protected postRequest<T>(path: string, body: unknown, options?: { params?: HttpParams }): Observable<T> {
    return this.http.post<T>(this.buildUrl(path), body, options);
  }

  protected post<T>(path: string, body: unknown, options?: { params?: HttpParams }): Observable<T> {
    return this.postRequest<T>(path, body, options);
  }

  protected putRequest<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.buildUrl(path), body);
  }

  protected put<T>(path: string, body: unknown): Observable<T> {
    return this.putRequest<T>(path, body);
  }

  protected deleteRequest<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(path));
  }

}
