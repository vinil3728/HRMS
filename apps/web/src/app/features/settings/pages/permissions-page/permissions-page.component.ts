import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Permission } from '../../../../core/models/permission.model';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { PermissionFormModalComponent } from '../../components/permission-form-modal/permission-form-modal.component';
import { SystemModule, SystemPermission } from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-permissions-page',
  imports: [
    CommonModule,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    HasPermissionDirective,
    PermissionFormModalComponent,
  ],
  templateUrl: './permissions-page.component.html',
  styleUrl: './permissions-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsPageComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);

  readonly Permission = Permission;

  readonly permissions = signal<SystemPermission[]>([]);
  readonly modules = signal<SystemModule[]>([]);
  readonly loadingPermissions = signal<boolean>(false);
  readonly permSearchQuery = signal<string>('');
  readonly permModuleFilter = signal<string>('ALL');
  readonly permStatusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE' | 'DELETED'>('ALL');
  readonly sortField = signal<'code' | 'name' | 'module' | 'isActive' | 'isDeleted'>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly isPermissionModalOpen = signal<boolean>(false);
  readonly selectedPermissionToEdit = signal<SystemPermission | null>(null);

  getModuleName(p: SystemPermission): string {
    if (p.module && typeof p.module === 'object') return p.module.name;
    if (typeof p.module === 'string' && p.module) return p.module;
    const found = this.modules().find((m) => m.id === p.moduleId);
    return found ? found.name : '—';
  }

  isModuleDeleted(p: SystemPermission): boolean {
    if (p.isDeleted) return true;
    if (p.module && typeof p.module === 'object' && p.module.isDeleted) return true;
    const found = this.modules().find((m) => m.id === p.moduleId);
    return found ? !!found.isDeleted : false;
  }

  isParentModuleDeleted(p: SystemPermission): boolean {
    if (p.module && typeof p.module === 'object' && p.module.isDeleted) return true;
    const found = this.modules().find((m) => m.id === p.moduleId);
    return found ? !!found.isDeleted : false;
  }

  readonly allModules = computed(() => {
    if (this.modules().length > 0) {
      return this.modules().map((m) => m.name).sort();
    }
    const mods = new Set<string>();
    for (const p of this.permissions()) {
      const name = this.getModuleName(p);
      if (name && name !== '—') mods.add(name);
    }
    return Array.from(mods).sort();
  });

  readonly moduleOptions = computed<SelectOption[]>(() => [
    { value: 'ALL', label: 'All Modules' },
    ...this.allModules().map((mod) => ({ value: mod, label: mod })),
  ]);

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'DELETED', label: 'Deleted' },
  ];

  readonly hasActiveFilters = computed(
    () =>
      this.permSearchQuery().trim().length > 0 ||
      this.permModuleFilter() !== 'ALL' ||
      this.permStatusFilter() !== 'ALL'
  );

  readonly filteredPermissions = computed(() => {
    const q = this.permSearchQuery().toLowerCase().trim();
    const mod = this.permModuleFilter();
    const status = this.permStatusFilter();
    const field = this.sortField();
    const dir = this.sortDirection();

    const list = this.permissions().filter((p) => {
      const pModName = this.getModuleName(p);
      const isDeleted = this.isModuleDeleted(p);
      if (mod !== 'ALL' && pModName !== mod) return false;

      if (status === 'ACTIVE' && (!p.isActive || isDeleted)) return false;
      if (status === 'INACTIVE' && (p.isActive || isDeleted)) return false;
      if (status === 'DELETED' && !isDeleted) return false;

      if (q) {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesModule = pModName.toLowerCase().includes(q);
        const matchesDesc = !!(
          p.description && p.description.toLowerCase().includes(q)
        );
        return matchesName || matchesCode || matchesModule || matchesDesc;
      }

      return true;
    });

    list.sort((a, b) => {
      let valA: any = a[field as keyof SystemPermission];
      let valB: any = b[field as keyof SystemPermission];

      if (field === 'module') {
        valA = this.getModuleName(a);
        valB = this.getModuleName(b);
      }

      if (field === 'isDeleted') {
        valA = this.isModuleDeleted(a) ? 1 : 0;
        valB = this.isModuleDeleted(b) ? 1 : 0;
        return (valA < valB ? -1 : valA > valB ? 1 : 0) * (dir === 'asc' ? 1 : -1);
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
        return dir === 'asc' ? cmp : -cmp;
      }

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      return (valA < valB ? -1 : 1) * (dir === 'asc' ? 1 : -1);
    });

    return list;
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPermissions().length / this.pageSize))
  );

  readonly displayedPermissions = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredPermissions().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadModules();
    this.loadPermissions();
  }

  loadModules(): void {
    this.settingsService.getModules().subscribe({
      next: (mods) => this.modules.set(mods),
      error: () => {},
    });
  }

  loadPermissions(): void {
    this.loadingPermissions.set(true);
    this.settingsService.getPermissions(true).subscribe({
      next: (list) => {
        this.permissions.set(list);
        this.loadingPermissions.set(false);
      },
      error: () => {
        this.loadingPermissions.set(false);
      },
    });
  }

  onPermSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.permSearchQuery.set(input.value);
    this.currentPage.set(1);
  }

  onPermModuleChange(value: string): void {
    this.permModuleFilter.set(value || 'ALL');
    this.currentPage.set(1);
  }

  onPermStatusChange(value: string): void {
    this.permStatusFilter.set(
      (value || 'ALL') as 'ALL' | 'ACTIVE' | 'INACTIVE' | 'DELETED'
    );
    this.currentPage.set(1);
  }

  resetPermFilters(): void {
    this.permSearchQuery.set('');
    this.permModuleFilter.set('ALL');
    this.permStatusFilter.set('ALL');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  setSort(field: 'code' | 'name' | 'module' | 'isActive' | 'isDeleted'): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  openCreatePermissionModal(): void {
    this.selectedPermissionToEdit.set(null);
    this.isPermissionModalOpen.set(true);
  }

  openEditPermissionModal(permission: SystemPermission): void {
    this.selectedPermissionToEdit.set(permission);
    this.isPermissionModalOpen.set(true);
  }

  closePermissionModal(): void {
    this.isPermissionModalOpen.set(false);
    this.selectedPermissionToEdit.set(null);
  }

  onPermissionSaved(): void {
    this.closePermissionModal();
    this.loadPermissions();
    this.loadModules();
  }

  togglePermissionActive(permission: SystemPermission): void {
    if (permission.isDeleted) {
      const confirmActivate = window.confirm(
        `Are you sure you want to activate and restore permission "${permission.name}" (${permission.code})?`
      );
      if (!confirmActivate) return;

      this.settingsService.activatePermission(permission.id).subscribe({
        next: () => {
          this.loadPermissions();
          this.loadModules();
        },
        error: (err) => {
          window.alert(err?.error?.message || 'Failed to activate permission');
        },
      });
      return;
    }

    if (permission.isActive) {
      const confirmDeactivate = window.confirm(
        `Are you sure you want to deactivate permission "${permission.name}" (${permission.code})? It will be excluded from all access control evaluations.`
      );
      if (!confirmDeactivate) return;

      this.settingsService.deactivatePermission(permission.id).subscribe({
        next: () => {
          this.loadPermissions();
          this.loadModules();
        },
        error: (err) => {
          window.alert(err?.error?.message || 'Failed to deactivate permission');
        },
      });
    } else {
      this.settingsService.activatePermission(permission.id).subscribe({
        next: () => {
          this.loadPermissions();
          this.loadModules();
        },
        error: (err) => {
          window.alert(err?.error?.message || 'Failed to activate permission');
        },
      });
    }
  }

  deletePermission(permission: SystemPermission): void {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete permission "${permission.name}" (${permission.code})? If all permissions belonging to module "${this.getModuleName(permission)}" are deleted, the module will be automatically marked as deleted.`
    );
    if (!confirmDelete) return;

    this.settingsService.deletePermission(permission.id).subscribe({
      next: () => {
        this.loadPermissions();
        this.loadModules();
      },
      error: (err) => {
        window.alert(err?.error?.message || 'Failed to delete permission');
      },
    });
  }

  exportPermissionsCsv(): void {
    const list = this.filteredPermissions();
    if (list.length === 0) return;

    const headers = [
      'Permission Code',
      'Permission Name',
      'Module',
      'Status',
      'Description',
    ];

    const rows = list.map((p) => [
      p.code,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${this.getModuleName(p).replace(/"/g, '""')}"`,
      p.isActive ? 'Active' : 'Inactive',
      `"${(p.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `system_permissions_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
