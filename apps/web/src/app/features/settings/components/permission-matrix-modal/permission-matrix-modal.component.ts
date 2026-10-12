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
  readonly selectedIds = signal<Set<string>>(new Set<string>());
  readonly initialIds = signal<Set<string>>(new Set<string>());
  readonly searchQuery = signal<string>('');
  readonly loading = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly grantPercentage = computed(() => {
    const total = this.allPermissions().length;
    if (total === 0) return 0;
    return Math.round((this.selectedIds().size / total) * 100);
  });

  readonly hasChanges = computed(() => {
    const current = this.selectedIds();
    const initial = this.initialIds();
    if (current.size !== initial.size) return true;
    for (const id of current) {
      if (!initial.has(id)) return true;
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
        this.selectedIds.set(new Set());
        this.initialIds.set(new Set());
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
        const set = new Set<string>(assigned.map((p) => p.id));
        this.selectedIds.set(new Set(set));
        this.initialIds.set(new Set(set));
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
    return this.selectedIds().has(id);
  }

  togglePermission(id: string): void {
    const perm = this.allPermissions().find((p) => p.id === id);
    if (perm && this.isPermissionDisabled(perm)) {
      return;
    }

    const current = new Set(this.selectedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedIds.set(current);
  }

  getModuleSelectedCount(moduleName: string): number {
    const mod = this.groupedModules().find((m) => m.name === moduleName);
    if (!mod) return 0;
    const current = this.selectedIds();
    return mod.permissions.filter((p) => current.has(p.id)).length;
  }

  toggleModule(moduleName: string, selectAll: boolean): void {
    const mod = this.groupedModules().find((m) => m.name === moduleName);
    if (!mod) return;

    const current = new Set(this.selectedIds());
    for (const p of mod.permissions) {
      if (selectAll) {
        if (!this.isPermissionDisabled(p)) {
          current.add(p.id);
        }
      } else {
        current.delete(p.id);
      }
    }
    this.selectedIds.set(current);
  }

  grantAll(): void {
    const current = new Set(this.selectedIds());
    for (const p of this.allPermissions()) {
      if (!this.isPermissionDisabled(p)) {
        current.add(p.id);
      }
    }
    this.selectedIds.set(current);
  }

  revokeAll(): void {
    this.selectedIds.set(new Set());
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

    const permissionIds = Array.from(this.selectedIds()).filter((id) => {
      const p = this.allPermissions().find((x) => x.id === id);
      return p ? !this.isPermissionDisabled(p) : true;
    });

    this.settingsService
      .assignPermissions(currentRole.id, permissionIds)
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
