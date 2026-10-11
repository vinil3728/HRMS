import { Injectable, computed, inject } from '@angular/core';
import { Permission } from '../models/permission.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class RbacService {
  private readonly authService = inject(AuthService);

  /**
   * Permissions array from the login/refresh response is the single source of truth.
   * No hardcoded role checks or role-based bypasses exist here.
   */
  readonly permissions = computed(() => this.authService.userPermissions());

  hasPermission(permission: Permission): boolean {
    if (!permission) return true;
    const userPerms = this.permissions();
    return userPerms.includes(permission);
  }

  hasAnyPermission(permissions: Permission[]): boolean {
    if (!permissions || permissions.length === 0) return true;
    const userPerms = this.permissions();
    return permissions.some((p) => userPerms.includes(p));
  }

  hasAllPermissions(permissions: Permission[]): boolean {
    if (!permissions || permissions.length === 0) return true;
    const userPerms = this.permissions();
    return permissions.every((p) => userPerms.includes(p));
  }
}
