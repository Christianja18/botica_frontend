import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);

  if (request.url.endsWith('/auth/login')) {
    return next(request);
  }

  const token = auth.activeToken();
  const requestWithAuth = token
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : request;

  return next(requestWithAuth).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        auth.clearSession();
      }
      return throwError(() => error);
    }),
  );
};
