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
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import { PermissionMatrixModalComponent } from '../../components/permission-matrix-modal/permission-matrix-modal.component';
import { RoleFormModalComponent } from '../../components/role-form-modal/role-form-modal.component';
import { Role } from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-roles-page',
  imports: [
    CommonModule,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    HasPermissionDirective,
    RoleFormModalComponent,
    PermissionMatrixModalComponent,
  ],
  templateUrl: './roles-page.component.html',
  styleUrl: './roles-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesPageComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);

  readonly Permission = Permission;

  readonly roles = signal<Role[]>([]);
  readonly loadingRoles = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE' | 'DELETED'>('ALL');
  readonly sortField = signal<'code' | 'name' | 'isActive' | 'isDeleted'>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly isRoleFormOpen = signal<boolean>(false);
  readonly selectedRoleToEdit = signal<Role | null>(null);

  readonly isMatrixOpen = signal<boolean>(false);
  readonly selectedRoleForMatrix = signal<Role | null>(null);

  readonly statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Deleted', value: 'DELETED' },
  ];

  readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.statusFilter() !== 'ALL'
  );

  readonly filteredRoles = computed(() => {
    let list = [...this.roles()];
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const field = this.sortField();
    const dir = this.sortDirection();

    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    if (status !== 'ALL') {
      if (status === 'ACTIVE') {
        list = list.filter((r) => r.isActive && !r.isDeleted);
      } else if (status === 'INACTIVE') {
        list = list.filter((r) => !r.isActive && !r.isDeleted);
      } else if (status === 'DELETED') {
        list = list.filter((r) => !!r.isDeleted);
      }
    }

    list.sort((a, b) => {
      const valA = a[field];
      const valB = b[field];

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
        return dir === 'asc' ? cmp : -cmp;
      }

      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        const numA = valA ? 1 : 0;
        const numB = valB ? 1 : 0;
        return (numA - numB) * (dir === 'asc' ? 1 : -1);
      }

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      return (valA < valB ? -1 : 1) * (dir === 'asc' ? 1 : -1);
    });

    return list;
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRoles().length / this.pageSize))
  );

  readonly displayedRoles = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRoles().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loadingRoles.set(true);
    this.settingsService.getRoles(true).subscribe({
      next: (list) => {
        this.roles.set(list);
        this.loadingRoles.set(false);
      },
      error: () => {
        this.loadingRoles.set(false);
      },
    });
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set((value || 'ALL') as 'ALL' | 'ACTIVE' | 'INACTIVE' | 'DELETED');
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  setSort(field: 'code' | 'name' | 'isActive' | 'isDeleted'): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  openCreateRoleModal(): void {
    this.selectedRoleToEdit.set(null);
    this.isRoleFormOpen.set(true);
  }

  openEditRoleModal(role: Role): void {
    this.selectedRoleToEdit.set(role);
    this.isRoleFormOpen.set(true);
  }

  closeRoleFormModal(): void {
    this.isRoleFormOpen.set(false);
    this.selectedRoleToEdit.set(null);
  }

  onRoleSaved(): void {
    this.closeRoleFormModal();
    this.loadRoles();
  }

  openPermissionMatrix(role: Role): void {
    this.selectedRoleForMatrix.set(role);
    this.isMatrixOpen.set(true);
  }

  closeMatrixModal(): void {
    this.isMatrixOpen.set(false);
    this.selectedRoleForMatrix.set(null);
  }

  onPermissionsSaved(): void {
    this.closeMatrixModal();
    this.loadRoles();
  }

  toggleRoleActive(role: Role): void {
    if (role.isDeleted) {
      this.settingsService.activateRole(role.id).subscribe({
        next: () => this.loadRoles(),
        error: (err) => alert(err?.error?.message || 'Failed to activate role'),
      });
      return;
    }

    if (role.isActive) {
      const confirmDeactivate = window.confirm(
        `Are you sure you want to deactivate role "${role.name}"? Users with this role may lose access to assigned modules.`
      );
      if (!confirmDeactivate) return;

      this.settingsService.deactivateRole(role.id).subscribe({
        next: () => this.loadRoles(),
        error: (err) => alert(err?.error?.message || 'Failed to deactivate role'),
      });
    } else {
      this.settingsService.activateRole(role.id).subscribe({
        next: () => this.loadRoles(),
        error: (err) => alert(err?.error?.message || 'Failed to activate role'),
      });
    }
  }

  deleteRole(role: Role): void {
    if (role.isSystemRole) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete role "${role.name}"? This action will soft-delete the role and mark it as deleted.`
    );
    if (!confirmDelete) return;

    this.settingsService.deleteRole(role.id).subscribe({
      next: () => this.loadRoles(),
      error: (err) => alert(err?.error?.message || 'Failed to delete role'),
    });
  }

  exportRolesCsv(): void {
    const list = this.filteredRoles();
    if (list.length === 0) return;

    const headers = [
      'Role Code',
      'Role Name',
      'Type',
      'Status',
      'Deleted',
      'Granted Permissions Count',
      'Description',
    ];

    const rows = list.map((r) => [
      r.code,
      `"${r.name.replace(/"/g, '""')}"`,
      r.isSystemRole ? 'System' : 'Custom',
      r.isActive ? 'Active' : 'Inactive',
      r.isDeleted ? 'True' : 'False',
      r.rolePermissions?.length || 0,
      `"${(r.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `access_control_roles_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
