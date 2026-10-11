import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permission } from '../models/permission.model';
import { RbacService } from '../services/rbac.service';

export const rbacGuard: CanActivateFn = (route) => {
  const rbacService = inject(RbacService);
  const router = inject(Router);

  const requiredPermission = route.data['permission'] as Permission | undefined;
  const requiredPermissions = route.data['permissions'] as Permission[] | undefined;

  if (requiredPermission && !rbacService.hasPermission(requiredPermission)) {
    return router.createUrlTree(['/dashboard']);
  }

  if (requiredPermissions && !rbacService.hasAnyPermission(requiredPermissions)) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
