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
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import { PermissionMatrixModalComponent } from '../../components/permission-matrix-modal/permission-matrix-modal.component';
import { RoleFormModalComponent } from '../../components/role-form-modal/role-form-modal.component';
import { RoleDetailModalComponent } from '../../components/role-detail-modal/role-detail-modal.component';
import { Role } from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';
import { RbacService } from '../../../../core/services/rbac.service';

@Component({
  selector: 'app-roles-page',
  imports: [
    CommonModule,
    IconComponent,
    SelectComponent,
    RoleFormModalComponent,
    PermissionMatrixModalComponent,
    RoleDetailModalComponent,
  ],
  templateUrl: './roles-page.component.html',
  styleUrl: './roles-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesPageComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly rbacService = inject(RbacService);

  readonly Permission = Permission;

  readonly roles = signal<Role[]>([]);
  readonly loadingRoles = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  readonly sortField = signal<'code' | 'name' | 'isActive' | 'privileges'>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly isRoleFormOpen = signal<boolean>(false);
  readonly selectedRoleToEdit = signal<Role | null>(null);

  readonly isMatrixOpen = signal<boolean>(false);
  readonly selectedRoleForMatrix = signal<Role | null>(null);

  readonly isDetailModalOpen = signal<boolean>(false);
  readonly selectedRoleForDetail = signal<Role | null>(null);

  // ── Permission Signals (Replacing directive) ─────────────────────────────
  readonly canCreateRole = computed(() =>
    this.rbacService.hasPermission(Permission.ROL_CREATE)
  );

  readonly canViewRole = computed(() =>
    this.rbacService.hasPermission(Permission.ROL_VIEW)
  );

  readonly canEditRole = computed(() =>
    this.rbacService.hasPermission(Permission.ROL_UPDATE)
  );

  readonly canDeleteRole = computed(() =>
    this.rbacService.hasPermission(Permission.ROL_DELETE)
  );

  readonly canActivateRole = computed(() =>
    this.rbacService.hasPermission(Permission.ROL_ACTIVATE)
  );

  readonly canDeactivateRole = computed(() =>
    this.rbacService.hasPermission(Permission.ROL_DEACTIVATE)
  );

  readonly hasRowActionPermissions = computed(() => {
    return (
      this.canViewRole() ||
      this.canEditRole() ||
      this.canActivateRole() ||
      this.canDeactivateRole()
    );
  });

  // ── Metrics Computed Signals ─────────────────────────────────────────────
  readonly activeRolesList = computed(() =>
    this.roles().filter((r) => !r.isDeleted)
  );
  readonly totalRolesCount = computed(() => this.activeRolesList().length);
  readonly activeRolesCount = computed(
    () => this.activeRolesList().filter((r) => r.isActive).length
  );
  readonly inactiveRolesCount = computed(
    () => this.activeRolesList().filter((r) => !r.isActive).length
  );
  readonly totalPrivilegesCount = computed(() =>
    this.activeRolesList().reduce((acc, r) => acc + (r.rolePermissions?.length || 0), 0)
  );

  readonly statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.statusFilter() !== 'ALL'
  );

  readonly filteredRoles = computed(() => {
    let list = this.roles().filter((r) => !r.isDeleted);
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
      const activeWanted = status === 'ACTIVE';
      list = list.filter((r) => r.isActive === activeWanted);
    }

    list.sort((a, b) => {
      if (field === 'privileges') {
        const countA = a.rolePermissions?.length || 0;
        const countB = b.rolePermissions?.length || 0;
        return (countA < countB ? -1 : countA > countB ? 1 : 0) * (dir === 'asc' ? 1 : -1);
      }

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
    this.statusFilter.set((value || 'ALL') as 'ALL' | 'ACTIVE' | 'INACTIVE');
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

  setSort(field: 'code' | 'name' | 'isActive' | 'privileges'): void {
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

  openDetailModal(role: Role): void {
    this.selectedRoleForDetail.set(role);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedRoleForDetail.set(null);
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

  exportRolesCsv(): void {
    const list = this.filteredRoles();
    if (list.length === 0) return;

    const headers = [
      'Role Code',
      'Role Name',
      'Type',
      'Status',
      'Granted Permissions Count',
      'Description',
    ];

    const rows = list.map((r) => [
      r.code,
      `"${r.name.replace(/"/g, '""')}"`,
      r.isSystemRole ? 'System' : 'Custom',
      r.isActive ? 'Active' : 'Inactive',
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
