import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { Role, SystemModule, SystemPermission } from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';
import { forkJoin } from 'rxjs';

interface PermissionModuleGroup {
  name: string;
  module?: SystemModule;
  isDeleted: boolean;
  isDeactivated: boolean;
  permissions: SystemPermission[];
}

@Component({
  selector: 'app-permission-matrix-modal',
  imports: [CommonModule, IconComponent],
  templateUrl: './permission-matrix-modal.component.html',
  styleUrl: './permission-matrix-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionMatrixModalComponent {
  private readonly settingsService = inject(SettingsService);

  readonly isOpen = input<boolean>(false);
  readonly role = input<Role | null>(null);

  readonly closeModal = output<void>();
  readonly saved = output<Role>();

  readonly allPermissions = signal<SystemPermission[]>([]);
  readonly modules = signal<SystemModule[]>([]);
  readonly selectedPermissionsMap = signal<Map<string, Set<string>>>(new Map());
  readonly initialPermissionsMap = signal<Map<string, Set<string>>>(new Map());
  readonly searchQuery = signal<string>('');
  readonly loading = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly selectedIds = computed(() => new Set(this.selectedPermissionsMap().keys()));

  readonly grantPercentage = computed(() => {
    const total = this.allPermissions().length;
    if (total === 0) return 0;
    return Math.round((this.selectedIds().size / total) * 100);
  });

  readonly hasChanges = computed(() => {
    const current = this.selectedPermissionsMap();
    const initial = this.initialPermissionsMap();
    if (current.size !== initial.size) return true;
    for (const [id, currentScopes] of current.entries()) {
      const initialScopes = initial.get(id);
      if (!initialScopes) return true;
      if (currentScopes.size !== initialScopes.size) return true;
      for (const scope of currentScopes) {
        if (!initialScopes.has(scope)) return true;
      }
    }
    return false;
  });

  getModuleName(p: SystemPermission): string {
    if (p.module && typeof p.module === 'object') return p.module.name;
    if (typeof p.module === 'string' && p.module) return p.module;
    const found = this.modules().find((m) => m.id === p.moduleId);
    return found ? found.name : 'General';
  }

  getModule(p: SystemPermission): SystemModule | undefined {
    if (p.module && typeof p.module === 'object') return p.module as SystemModule;
    return this.modules().find(
      (m) => m.id === p.moduleId || m.name === this.getModuleName(p)
    );
  }

  isPermissionDisabled(perm: SystemPermission): boolean {
    if (perm.isDeleted) return true;
    if (!perm.isActive) return true;

    const mod = this.getModule(perm);
    if (mod) {
      if (mod.isDeleted || !mod.isActive) return true;
    }

    return false;
  }

  getDisabledReason(perm: SystemPermission): string | null {
    const mod = this.getModule(perm);
    if (mod?.isDeleted) return 'Module Deleted';
    if (mod && !mod.isActive) return 'Module Inactive';
    if (perm.isDeleted) return 'Deleted';
    if (!perm.isActive) return 'Inactive';
    return null;
  }

  getAllowedScopes(perm: SystemPermission): string[] {
    if (perm.allowedScopes && perm.allowedScopes.length > 0) {
      return perm.allowedScopes;
    }
    if (typeof perm.scopes === 'string') {
      if (perm.scopes === 'ORGANIZATION' || perm.scopes === 'GLOBAL') return ['ORG'];
      if (perm.scopes === 'TEAM') return ['SELF', 'TEAM'];
      return ['SELF'];
    }
    return ['SELF', 'TEAM', 'ORG'];
  }

  allModulePermissionsDisabled(mod: PermissionModuleGroup): boolean {
    return mod.permissions.every((p) => this.isPermissionDisabled(p));
  }

  readonly groupedModules = computed<PermissionModuleGroup[]>(() => {
    const perms = this.allPermissions();
    const groupMap = new Map<string, SystemPermission[]>();

    for (const p of perms) {
      const mod = this.getModuleName(p);
      let list = groupMap.get(mod);
      if (!list) {
        list = [];
        groupMap.set(mod, list);
      }
      list.push(p);
    }

    const groups: PermissionModuleGroup[] = [];
    groupMap.forEach((permissions, name) => {
      const samplePerm = permissions[0];
      const mod = samplePerm ? this.getModule(samplePerm) : undefined;
      const isDeleted = mod ? !!mod.isDeleted : false;
      const isDeactivated = mod ? !mod.isActive : false;

      groups.push({
        name,
        module: mod,
        isDeleted,
        isDeactivated,
        permissions,
      });
    });

    return groups.sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly filteredModules = computed<PermissionModuleGroup[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const modules = this.groupedModules();
    if (!q) return modules;

    return modules
      .map((mod) => {
        const filtered = mod.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            mod.name.toLowerCase().includes(q)
        );
        return {
          name: mod.name,
          module: mod.module,
          isDeleted: mod.isDeleted,
          isDeactivated: mod.isDeactivated,
          permissions: filtered,
        };
      })
      .filter((mod) => mod.permissions.length > 0);
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const currentRole = this.role();

      if (open && currentRole) {
        this.loadPermissionsCatalog(currentRole.id);
      } else {
        this.searchQuery.set('');
        this.errorMessage.set('');
        this.selectedPermissionsMap.set(new Map());
        this.initialPermissionsMap.set(new Map());
      }
    });
  }

  private loadPermissionsCatalog(roleId: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      all: this.settingsService.getPermissions(true),
      assigned: this.settingsService.getRolePermissions(roleId),
      modules: this.settingsService.getModules(),
    }).subscribe({
      next: ({ all, assigned, modules }) => {
        this.modules.set(modules);
        this.allPermissions.set(all);

        const map = new Map<string, Set<string>>();
        for (const p of assigned) {
          const scopes = p.assignedScopes || (Array.isArray(p.scopes) ? p.scopes : (p.scopes ? [p.scopes] : ['SELF']));
          map.set(p.id, new Set(scopes));
        }

        this.selectedPermissionsMap.set(map);
        this.initialPermissionsMap.set(
          new Map(Array.from(map.entries()).map(([k, v]) => [k, new Set(v)]))
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to load permission matrix configuration.'
        );
      },
    });
  }

  isPermissionSelected(id: string): boolean {
    return this.selectedPermissionsMap().has(id);
  }

  isScopeSelected(id: string, scope: string): boolean {
    return this.selectedPermissionsMap().get(id)?.has(scope) ?? false;
  }

  togglePermission(id: string): void {
    const perm = this.allPermissions().find((p) => p.id === id);
    if (perm && this.isPermissionDisabled(perm)) {
      return;
    }

    const current = new Map(this.selectedPermissionsMap());
    if (current.has(id)) {
      current.delete(id);
    } else {
      const scopes = perm ? this.getAllowedScopes(perm) : ['SELF'];
      current.set(id, new Set(scopes));
    }
    this.selectedPermissionsMap.set(current);
  }

  toggleScope(id: string, scope: string, event: Event): void {
    event.stopPropagation();
    const perm = this.allPermissions().find((p) => p.id === id);
    if (perm && this.isPermissionDisabled(perm)) {
      return;
    }

    const current = new Map(this.selectedPermissionsMap());
    let scopes = current.get(id);
    if (!scopes) {
      scopes = new Set<string>();
      current.set(id, scopes);
    } else {
      scopes = new Set<string>(scopes);
      current.set(id, scopes);
    }

    if (scopes.has(scope)) {
      scopes.delete(scope);
      if (scopes.size === 0) {
        current.delete(id);
      }
    } else {
      scopes.add(scope);
    }
    this.selectedPermissionsMap.set(current);
  }

  getModuleSelectedCount(moduleName: string): number {
    const mod = this.groupedModules().find((m) => m.name === moduleName);
    if (!mod) return 0;
    const current = this.selectedPermissionsMap();
    return mod.permissions.filter((p) => current.has(p.id)).length;
  }

  toggleModule(moduleName: string, selectAll: boolean): void {
    const mod = this.groupedModules().find((m) => m.name === moduleName);
    if (!mod) return;

    const current = new Map(this.selectedPermissionsMap());
    for (const p of mod.permissions) {
      if (selectAll) {
        if (!this.isPermissionDisabled(p)) {
          current.set(p.id, new Set(this.getAllowedScopes(p)));
        }
      } else {
        current.delete(p.id);
      }
    }
    this.selectedPermissionsMap.set(current);
  }

  grantAll(): void {
    const current = new Map(this.selectedPermissionsMap());
    for (const p of this.allPermissions()) {
      if (!this.isPermissionDisabled(p)) {
        current.set(p.id, new Set(this.getAllowedScopes(p)));
      }
    }
    this.selectedPermissionsMap.set(current);
  }

  revokeAll(): void {
    this.selectedPermissionsMap.set(new Map());
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onSave(): void {
    const currentRole = this.role();
    if (!currentRole || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const permissions = Array.from(this.selectedPermissionsMap().entries())
      .filter(([id]) => {
        const p = this.allPermissions().find((x) => x.id === id);
        return p ? !this.isPermissionDisabled(p) : true;
      })
      .map(([permissionId, scopesSet]) => ({
        permissionId,
        scopes: Array.from(scopesSet),
      }));

    const permissionIds = permissions.map((p) => p.permissionId);

    this.settingsService
      .assignPermissions(currentRole.id, {
        permissions,
        permissionIds,
      })
      .subscribe({
        next: (updatedRole) => {
          this.submitting.set(false);
          this.saved.emit(updatedRole);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to update role permissions'
          );
        },
      });
  }
}
