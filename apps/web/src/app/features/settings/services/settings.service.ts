import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  CreateModuleDto,
  CreatePermissionDto,
  CreateRoleDto,
  CreateUserDto,
  DEFAULT_EMPLOYEE_SETTINGS,
  DEFAULT_HR_SETTINGS,
  DEFAULT_MANAGER_SETTINGS,
  DEFAULT_ORG_SETTINGS,
  EmployeeSettings,
  HRSettings,
  ManagerSettings,
  OrganizationSettings,
  Role,
  SystemModule,
  SystemPermission,
  SystemUser,
  UpdateModuleDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  UpdateUserDto,
} from '../models/settings.model';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly api = inject(ApiService);
  private readonly endpoints = API_CONFIG.endpoints.rbac;
  private readonly authEndpoints = API_CONFIG.endpoints.auth;

  private readonly orgSettingsSignal = signal<OrganizationSettings>(
    this.loadStoredSettings()
  );
  readonly orgSettings = this.orgSettingsSignal.asReadonly();

  private readonly employeeSettingsSignal = signal<EmployeeSettings>(
    this.loadStoredEmployeeSettings()
  );
  readonly employeeSettings = this.employeeSettingsSignal.asReadonly();

  private readonly managerSettingsSignal = signal<ManagerSettings>(
    this.loadStoredManagerSettings()
  );
  readonly managerSettings = this.managerSettingsSignal.asReadonly();

  private readonly hrSettingsSignal = signal<HRSettings>(
    this.loadStoredHRSettings()
  );
  readonly hrSettings = this.hrSettingsSignal.asReadonly();

  // --- Users ---
  getUsers(): Observable<SystemUser[]> {
    return this.api.get<SystemUser[]>(this.authEndpoints.users);
  }

  getUser(id: string): Observable<SystemUser> {
    return this.api.get<SystemUser>(this.authEndpoints.userDetail(id));
  }

  createUser(dto: CreateUserDto): Observable<SystemUser> {
    return this.api.post<SystemUser>(this.authEndpoints.users, dto);
  }

  updateUser(id: string, dto: UpdateUserDto): Observable<SystemUser> {
    return this.api.patch<SystemUser>(this.authEndpoints.userDetail(id), dto);
  }

  activateUser(id: string): Observable<SystemUser> {
    return this.api.patch<SystemUser>(this.authEndpoints.activateUser(id), {});
  }

  deactivateUser(id: string): Observable<SystemUser> {
    return this.api.patch<SystemUser>(this.authEndpoints.deactivateUser(id), {});
  }

  // --- Roles ---
  getRoles(includeInactive = true): Observable<Role[]> {
    const url = includeInactive
      ? `${this.endpoints.roles}?all=true`
      : this.endpoints.roles;
    return this.api.get<Role[]>(url);
  }

  getRole(id: string): Observable<Role> {
    return this.api.get<Role>(this.endpoints.roleDetail(id));
  }

  createRole(dto: CreateRoleDto): Observable<Role> {
    return this.api.post<Role>(this.endpoints.roles, dto);
  }

  updateRole(id: string, dto: UpdateRoleDto): Observable<Role> {
    return this.api.patch<Role>(this.endpoints.roleDetail(id), dto);
  }

  activateRole(id: string): Observable<Role> {
    return this.api.patch<Role>(this.endpoints.activateRole(id), {});
  }

  deactivateRole(id: string): Observable<Role> {
    return this.api.patch<Role>(this.endpoints.deactivateRole(id), {});
  }

  deleteRole(id: string): Observable<Role> {
    return this.api.delete<Role>(this.endpoints.roleDetail(id));
  }

  // --- Permissions ---
  getPermissions(includeInactive = false): Observable<SystemPermission[]> {
    const url = includeInactive
      ? `${this.endpoints.permissions}?all=true`
      : this.endpoints.permissions;
    return this.api.get<SystemPermission[]>(url);
  }

  getPermission(id: string): Observable<SystemPermission> {
    return this.api.get<SystemPermission>(this.endpoints.permissionDetail(id));
  }

  createPermission(dto: CreatePermissionDto): Observable<SystemPermission> {
    return this.api.post<SystemPermission>(this.endpoints.permissions, dto);
  }

  updatePermission(
    id: string,
    dto: UpdatePermissionDto
  ): Observable<SystemPermission> {
    return this.api.patch<SystemPermission>(
      this.endpoints.permissionDetail(id),
      dto
    );
  }

  activatePermission(id: string): Observable<SystemPermission> {
    return this.api.patch<SystemPermission>(
      this.endpoints.activatePermission(id),
      {}
    );
  }

  deactivatePermission(id: string): Observable<SystemPermission> {
    return this.api.patch<SystemPermission>(
      this.endpoints.deactivatePermission(id),
      {}
    );
  }

  deletePermission(id: string): Observable<SystemPermission> {
    return this.api.delete<SystemPermission>(
      this.endpoints.permissionDetail(id)
    );
  }

  getRolePermissions(roleId: string): Observable<SystemPermission[]> {
    return this.api.get<SystemPermission[]>(
      this.endpoints.rolePermissions(roleId)
    );
  }

  assignPermissions(
    roleId: string,
    permissionIds: string[]
  ): Observable<Role> {
    return this.api.put<Role>(this.endpoints.rolePermissions(roleId), {
      permissionIds,
    });
  }

  // --- Modules ---
  getModules(search?: string): Observable<SystemModule[]> {
    const url = search
      ? `${this.endpoints.modules}?search=${encodeURIComponent(search)}`
      : this.endpoints.modules;
    return this.api.get<SystemModule[]>(url);
  }

  getModule(id: string): Observable<SystemModule> {
    return this.api.get<SystemModule>(this.endpoints.moduleDetail(id));
  }

  createModule(dto: CreateModuleDto): Observable<SystemModule> {
    return this.api.post<SystemModule>(this.endpoints.modules, dto);
  }

  updateModule(id: string, dto: UpdateModuleDto): Observable<SystemModule> {
    return this.api.patch<SystemModule>(this.endpoints.moduleDetail(id), dto);
  }

  deleteModule(id: string): Observable<{ success: boolean; message: string }> {
    return this.api.delete<{ success: boolean; message: string }>(
      this.endpoints.moduleDetail(id)
    );
  }

  activateModule(id: string): Observable<SystemModule> {
    return this.api.patch<SystemModule>(this.endpoints.activateModule(id), {});
  }

  deactivateModule(id: string): Observable<SystemModule> {
    return this.api.patch<SystemModule>(this.endpoints.deactivateModule(id), {});
  }

  // --- Org Settings Local Persistence ---
  private loadStoredSettings(): OrganizationSettings {
    try {
      const stored = localStorage.getItem('treasurex_org_settings');
      if (stored) {
        return { ...DEFAULT_ORG_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_ORG_SETTINGS;
  }

  updateSettings(partial: Partial<OrganizationSettings>): OrganizationSettings {
    const updated = { ...this.orgSettingsSignal(), ...partial };
    this.orgSettingsSignal.set(updated);
    try {
      localStorage.setItem('treasurex_org_settings', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    return updated;
  }

  // --- Employee Settings Local Persistence ---
  private loadStoredEmployeeSettings(): EmployeeSettings {
    try {
      const stored = localStorage.getItem('treasurex_employee_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          preferences: { ...DEFAULT_EMPLOYEE_SETTINGS.preferences, ...parsed.preferences },
          notifications: { ...DEFAULT_EMPLOYEE_SETTINGS.notifications, ...parsed.notifications },
          security: { ...DEFAULT_EMPLOYEE_SETTINGS.security, ...parsed.security },
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_EMPLOYEE_SETTINGS;
  }

  updateEmployeeSettings(partial: {
    preferences?: Partial<EmployeeSettings['preferences']>;
    notifications?: Partial<EmployeeSettings['notifications']>;
    security?: Partial<EmployeeSettings['security']>;
  }): EmployeeSettings {
    const current = this.employeeSettingsSignal();
    const updated: EmployeeSettings = {
      preferences: { ...current.preferences, ...(partial.preferences || {}) },
      notifications: { ...current.notifications, ...(partial.notifications || {}) },
      security: { ...current.security, ...(partial.security || {}) },
    };
    this.employeeSettingsSignal.set(updated);
    try {
      localStorage.setItem('treasurex_employee_settings', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    return updated;
  }

  // --- Manager Settings Local Persistence ---
  private loadStoredManagerSettings(): ManagerSettings {
    try {
      const stored = localStorage.getItem('treasurex_manager_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          delegation: { ...DEFAULT_MANAGER_SETTINGS.delegation, ...parsed.delegation },
          teamNotifications: { ...DEFAULT_MANAGER_SETTINGS.teamNotifications, ...parsed.teamNotifications },
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_MANAGER_SETTINGS;
  }

  updateManagerSettings(partial: {
    delegation?: Partial<ManagerSettings['delegation']>;
    teamNotifications?: Partial<ManagerSettings['teamNotifications']>;
  }): ManagerSettings {
    const current = this.managerSettingsSignal();
    const updated: ManagerSettings = {
      delegation: { ...current.delegation, ...(partial.delegation || {}) },
      teamNotifications: { ...current.teamNotifications, ...(partial.teamNotifications || {}) },
    };
    this.managerSettingsSignal.set(updated);
    try {
      localStorage.setItem('treasurex_manager_settings', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    return updated;
  }

  // --- HR Settings Local Persistence ---
  private loadStoredHRSettings(): HRSettings {
    try {
      const stored = localStorage.getItem('treasurex_hr_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          lifecycle: { ...DEFAULT_HR_SETTINGS.lifecycle, ...parsed.lifecycle },
          governance: { ...DEFAULT_HR_SETTINGS.governance, ...parsed.governance },
          compliance: { ...DEFAULT_HR_SETTINGS.compliance, ...parsed.compliance },
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_HR_SETTINGS;
  }

  updateHRSettings(partial: {
    lifecycle?: Partial<HRSettings['lifecycle']>;
    governance?: Partial<HRSettings['governance']>;
    compliance?: Partial<HRSettings['compliance']>;
  }): HRSettings {
    const current = this.hrSettingsSignal();
    const updated: HRSettings = {
      lifecycle: { ...current.lifecycle, ...(partial.lifecycle || {}) },
      governance: { ...current.governance, ...(partial.governance || {}) },
      compliance: { ...current.compliance, ...(partial.compliance || {}) },
    };
    this.hrSettingsSignal.set(updated);
    try {
      localStorage.setItem('treasurex_hr_settings', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    return updated;
  }
}
