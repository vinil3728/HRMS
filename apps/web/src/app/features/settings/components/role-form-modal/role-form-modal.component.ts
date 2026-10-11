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
  SystemPermission,
  UpdateRoleDto,
} from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';
import { switchMap } from 'rxjs/operators';

interface PermissionModuleGroup {
  name: string;
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
  readonly selectedPermissionIds = signal<Set<string>>(new Set<string>());
  readonly permissionSearch = signal<string>('');
  readonly loadingPermissions = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.role());
  readonly isSystemRole = computed(() => !!this.role()?.isSystemRole);

  readonly groupedModules = computed<PermissionModuleGroup[]>(() => {
    const perms = this.allPermissions();
    const groupMap = new Map<string, SystemPermission[]>();

    for (const p of perms) {
      const mod = p.module || 'General';
      let list = groupMap.get(mod);
      if (!list) {
        list = [];
        groupMap.set(mod, list);
      }
      list.push(p);
    }

    const groups: PermissionModuleGroup[] = [];
    groupMap.forEach((permissions, name) => {
      groups.push({ name, permissions });
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
        return { name: mod.name, permissions: filtered };
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

    this.settingsService.getPermissions().subscribe({
      next: (perms) => {
        this.allPermissions.set(perms);
        this.loadingPermissions.set(false);

        if (roleId) {
          this.settingsService.getRolePermissions(roleId).subscribe({
            next: (assigned) => {
              this.selectedPermissionIds.set(
                new Set(assigned.map((p) => p.id))
              );
            },
          });
        }
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
        current.add(p.id);
      } else {
        current.delete(p.id);
      }
    }
    this.selectedPermissionIds.set(current);
  }

  selectAllPermissions(): void {
    const current = new Set(this.allPermissions().map((p) => p.id));
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
    const permissionIds = Array.from(this.selectedPermissionIds());

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
