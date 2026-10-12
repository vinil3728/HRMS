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
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  CreateRoleDto,
  Role,
  SystemModule,
  SystemPermission,
  UpdateRoleDto,
} from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface PermissionModuleGroup {
  name: string;
  module?: SystemModule;
  isDeleted: boolean;
  isDeactivated: boolean;
  permissions: SystemPermission[];
}

@Component({
  selector: 'app-role-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './role-form-modal.component.html',
  styleUrl: './role-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);

  readonly isOpen = input<boolean>(false);
  readonly role = input<Role | null>(null);

  readonly closeModal = output<void>();
  readonly saved = output<Role>();

  readonly allPermissions = signal<SystemPermission[]>([]);
  readonly modules = signal<SystemModule[]>([]);
  readonly selectedPermissionIds = signal<Set<string>>(new Set<string>());
  readonly permissionSearch = signal<string>('');
  readonly loadingPermissions = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.role());
  readonly isSystemRole = computed(() => !!this.role()?.isSystemRole);

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
    const q = this.permissionSearch().toLowerCase().trim();
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

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  constructor() {
    effect(() => {
      const r = this.role();
      const open = this.isOpen();

      if (open) {
        this.loadPermissionsCatalog(r ? r.id : null);

        if (r) {
          this.form.patchValue({
            name: r.name,
            code: r.code,
            description: r.description || '',
          });
          if (r.isSystemRole) {
            this.form.get('code')?.disable();
          } else {
            this.form.get('code')?.enable();
          }
          this.errorMessage.set('');
        } else {
          this.form.reset({
            name: '',
            code: '',
            description: '',
          });
          this.form.get('code')?.enable();
          this.selectedPermissionIds.set(new Set());
          this.errorMessage.set('');
        }
      } else {
        this.permissionSearch.set('');
        this.errorMessage.set('');
      }
    });
  }

  private loadPermissionsCatalog(roleId: string | null): void {
    this.loadingPermissions.set(true);

    forkJoin({
      all: this.settingsService.getPermissions(true),
      modules: this.settingsService.getModules(),
      assigned: roleId ? this.settingsService.getRolePermissions(roleId) : of([]),
    }).subscribe({
      next: ({ all, modules, assigned }) => {
        this.modules.set(modules);
        this.allPermissions.set(all);
        if (assigned) {
          this.selectedPermissionIds.set(
            new Set(assigned.map((p) => p.id))
          );
        }
        this.loadingPermissions.set(false);
      },
      error: () => {
        this.loadingPermissions.set(false);
      },
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  isPermissionSelected(id: string): boolean {
    return this.selectedPermissionIds().has(id);
  }

  togglePermission(id: string): void {
    const perm = this.allPermissions().find((p) => p.id === id);
    if (perm && this.isPermissionDisabled(perm)) {
      return;
    }

    const current = new Set(this.selectedPermissionIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedPermissionIds.set(current);
  }

  getModuleSelectedCount(moduleName: string): number {
    const mod = this.groupedModules().find((m) => m.name === moduleName);
    if (!mod) return 0;
    const current = this.selectedPermissionIds();
    return mod.permissions.filter((p) => current.has(p.id)).length;
  }

  toggleModule(moduleName: string, selectAll: boolean): void {
    const mod = this.groupedModules().find((m) => m.name === moduleName);
    if (!mod) return;

    const current = new Set(this.selectedPermissionIds());
    for (const p of mod.permissions) {
      if (selectAll) {
        if (!this.isPermissionDisabled(p)) {
          current.add(p.id);
        }
      } else {
        current.delete(p.id);
      }
    }
    this.selectedPermissionIds.set(current);
  }

  selectAllPermissions(): void {
    const current = new Set(this.selectedPermissionIds());
    for (const p of this.allPermissions()) {
      if (!this.isPermissionDisabled(p)) {
        current.add(p.id);
      }
    }
    this.selectedPermissionIds.set(current);
  }

  clearAllPermissions(): void {
    this.selectedPermissionIds.set(new Set());
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.permissionSearch.set(val);
  }

  clearSearch(): void {
    this.permissionSearch.set('');
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const current = this.role();
    const rawValue = this.form.getRawValue();
    const permissionIds = Array.from(this.selectedPermissionIds()).filter(
      (id) => {
        const p = this.allPermissions().find((x) => x.id === id);
        return p ? !this.isPermissionDisabled(p) : true;
      }
    );

    if (current) {
      const dto: UpdateRoleDto = {
        name: rawValue.name.trim(),
        code: rawValue.code.trim().toUpperCase(),
        description: rawValue.description?.trim() || null,
      };

      this.settingsService
        .updateRole(current.id, dto)
        .pipe(
          switchMap((updatedRole) => {
            return this.settingsService.assignPermissions(
              updatedRole.id,
              permissionIds
            );
          })
        )
        .subscribe({
          next: (savedRole) => {
            this.submitting.set(false);
            this.saved.emit(savedRole);
          },
          error: (err) => {
            this.submitting.set(false);
            this.errorMessage.set(
              err.error?.message || 'Failed to update system role'
            );
          },
        });
    } else {
      const dto: CreateRoleDto = {
        name: rawValue.name.trim(),
        code: rawValue.code.trim().toUpperCase(),
        description: rawValue.description?.trim() || null,
        permissionIds,
      };

      this.settingsService.createRole(dto).subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.saved.emit(created);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to create custom role'
          );
        },
      });
    }
  }
}
