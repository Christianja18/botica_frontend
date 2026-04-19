import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { PermissionKey } from '../models';
import { AuthService } from '../services';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const permission = route.data['permission'] as PermissionKey | undefined;

  return auth.hasPermission(permission) ? true : router.createUrlTree([auth.preferredRoute()]);
};
