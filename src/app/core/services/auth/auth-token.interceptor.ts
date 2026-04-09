import { HttpInterceptorFn } from '@angular/common/http';

import { appSettings } from '../../config/app.settings';
import { AuthSession } from '../../models';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url.endsWith('/auth/login')) {
    return next(request);
  }

  const raw = sessionStorage.getItem(appSettings.authStorageKey);
  if (!raw) {
    return next(request);
  }

  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session.token) {
      return next(request);
    }

    return next(
      request.clone({
        setHeaders: {
          Authorization: `${session.tokenType} ${session.token}`,
        },
      }),
    );
  } catch {
    sessionStorage.removeItem(appSettings.authStorageKey);
    return next(request);
  }
};
