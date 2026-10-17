import { CommonModule, DatePipe } from '@angular/common';
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
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { UserFormModalComponent } from '../../components/user-form-modal/user-form-modal.component';
import { UserViewModalComponent } from '../../components/user-view-modal/user-view-modal.component';
import { Role, SystemUser } from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';
import { RbacService } from '../../../../core/services/rbac.service';

@Component({
  selector: 'app-users-page',
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    SelectComponent,
    UserFormModalComponent,
    UserViewModalComponent,
  ],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPageComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly rbacService = inject(RbacService);

  readonly Permission = Permission;

  readonly users = signal<SystemUser[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loadingUsers = signal<boolean>(false);
  readonly userSearchQuery = signal<string>('');
  readonly userRoleFilter = signal<string>('ALL');
  readonly userStatusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  readonly sortField = signal<'username' | 'createdAt' | 'isActive' | 'employeeCode' | 'employeeName' | 'role'>('username');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  // ── Permission Signals (Replacing directive) ─────────────────────────────
  readonly canCreateUser = computed(() =>
    this.rbacService.hasPermission(Permission.USR_CREATE)
  );

  readonly canViewUser = computed(() =>
    this.rbacService.hasPermission(Permission.USR_VIEW)
  );

  readonly canEditUser = computed(() =>
    this.rbacService.hasPermission(Permission.USR_UPDATE)
  );

  readonly canDeleteUser = computed(() =>
    this.rbacService.hasPermission(Permission.USR_DELETE)
  );

  readonly canActivateUser = computed(() =>
    this.rbacService.hasPermission(Permission.USR_ACTIVATE)
  );

  readonly canDeactivateUser = computed(() =>
    this.rbacService.hasPermission(Permission.USR_DEACTIVATE)
  );

  readonly hasRowActionPermissions = computed(() => {
    return (
      this.canViewUser() ||
      this.canEditUser() ||
      this.canActivateUser() ||
      this.canDeactivateUser()
    );
  });

  readonly hasAnyActionPermissions = this.hasRowActionPermissions;

  // ── Metrics Computed Signals ─────────────────────────────────────────────
  readonly totalUsersCount = computed(() => this.users().length);
  readonly activeUsersCount = computed(
    () => this.users().filter((u) => u.isActive).length
  );
  readonly inactiveUsersCount = computed(
    () => this.users().filter((u) => !u.isActive).length
  );
  readonly linkedEmployeesCount = computed(
    () => this.users().filter((u) => !!u.employee).length
  );

  readonly roleOptions = computed<SelectOption[]>(() => [
    { value: 'ALL', label: 'All Roles' },
    ...this.roles().map((r) => ({ value: r.id, label: r.name })),
  ]);

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
  ];

  readonly hasActiveFilters = computed(
    () =>
      this.userSearchQuery().trim().length > 0 ||
      this.userRoleFilter() !== 'ALL' ||
      this.userStatusFilter() !== 'ALL'
  );

  readonly isUserFormOpen = signal<boolean>(false);
  readonly selectedUserToEdit = signal<SystemUser | null>(null);

  readonly isUserViewOpen = signal<boolean>(false);
  readonly selectedUserToView = signal<SystemUser | null>(null);

  readonly filteredUsers = computed(() => {
    const q = this.userSearchQuery().toLowerCase().trim();
    const roleId = this.userRoleFilter();
    const status = this.userStatusFilter();
    const field = this.sortField();
    const dir = this.sortDirection();

    const list = this.users().filter((u) => {
      if (roleId !== 'ALL' && u.role?.id !== roleId) return false;

      if (status === 'ACTIVE' && !u.isActive) return false;
      if (status === 'INACTIVE' && u.isActive) return false;

      if (q) {
        const matchesUsername = u.username.toLowerCase().includes(q);
        const matchesRole = !!(
          u.role?.name && u.role.name.toLowerCase().includes(q)
        );
        const matchesEmpName = !!(
          u.employee &&
          `${u.employee.firstName} ${u.employee.lastName}`
            .toLowerCase()
            .includes(q)
        );
        const matchesEmpCode = !!(
          u.employee?.employeeCode &&
          u.employee.employeeCode.toLowerCase().includes(q)
        );
        const matchesEmail = !!(
          u.employee?.email && u.employee.email.toLowerCase().includes(q)
        );
        return (
          matchesUsername ||
          matchesRole ||
          matchesEmpName ||
          matchesEmpCode ||
          matchesEmail
        );
      }

      return true;
    });

    list.sort((a, b) => {
      if (field === 'employeeCode') {
        const codeA = a.employee?.employeeCode || '';
        const codeB = b.employee?.employeeCode || '';
        return codeA.localeCompare(codeB, undefined, { sensitivity: 'base' }) * (dir === 'asc' ? 1 : -1);
      }

      if (field === 'employeeName') {
        const nameA = a.employee ? `${a.employee.firstName} ${a.employee.lastName}` : '';
        const nameB = b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : '';
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' }) * (dir === 'asc' ? 1 : -1);
      }

      if (field === 'role') {
        const roleA = a.role?.name || '';
        const roleB = b.role?.name || '';
        return roleA.localeCompare(roleB, undefined, { sensitivity: 'base' }) * (dir === 'asc' ? 1 : -1);
      }

      const valA = a[field as keyof SystemUser];
      const valB = b[field as keyof SystemUser];

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
    Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize))
  );

  readonly displayedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers(): void {
    this.loadingUsers.set(true);
    this.settingsService.getUsers().subscribe({
      next: (list) => {
        this.users.set(list);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.loadingUsers.set(false);
      },
    });
  }

  loadRoles(): void {
    this.settingsService.getRoles().subscribe({
      next: (list) => {
        this.roles.set(list);
      },
    });
  }

  onUserSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.userSearchQuery.set(input.value);
    this.currentPage.set(1);
  }

  onUserRoleChange(value: string): void {
    this.userRoleFilter.set(value || 'ALL');
    this.currentPage.set(1);
  }

  onUserStatusChange(value: string): void {
    this.userStatusFilter.set((value || 'ALL') as 'ALL' | 'ACTIVE' | 'INACTIVE');
    this.currentPage.set(1);
  }

  resetUserFilters(): void {
    this.userSearchQuery.set('');
    this.userRoleFilter.set('ALL');
    this.userStatusFilter.set('ALL');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  setSort(field: 'username' | 'createdAt' | 'isActive' | 'employeeCode' | 'employeeName' | 'role'): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  openCreateUserModal(): void {
    this.selectedUserToEdit.set(null);
    this.isUserFormOpen.set(true);
  }

  openEditUserModal(user: SystemUser): void {
    this.selectedUserToEdit.set(user);
    this.isUserFormOpen.set(true);
  }

  closeUserFormModal(): void {
    this.isUserFormOpen.set(false);
    this.selectedUserToEdit.set(null);
  }

  onUserSaved(savedUser: SystemUser): void {
    this.closeUserFormModal();
    this.loadUsers();
    if (this.selectedUserToView()?.id === savedUser.id) {
      this.selectedUserToView.set(savedUser);
    }
  }

  openViewUserModal(user: SystemUser): void {
    this.selectedUserToView.set(user);
    this.isUserViewOpen.set(true);
  }

  closeUserViewModal(): void {
    this.isUserViewOpen.set(false);
    this.selectedUserToView.set(null);
  }

  onUserViewEdit(user: SystemUser): void {
    this.closeUserViewModal();
    this.openEditUserModal(user);
  }

  toggleUserStatus(user: SystemUser): void {
    if (user.isActive) {
      const confirmDeactivate = window.confirm(
        `Are you sure you want to deactivate user account "${user.username}"? This user will not be able to log in.`
      );
      if (!confirmDeactivate) return;

      this.settingsService.deactivateUser(user.id).subscribe({
        next: (updated) => {
          this.loadUsers();
          if (this.selectedUserToView()?.id === user.id) {
            this.selectedUserToView.set(updated);
          }
        },
      });
    } else {
      this.settingsService.activateUser(user.id).subscribe({
        next: (updated) => {
          this.loadUsers();
          if (this.selectedUserToView()?.id === user.id) {
            this.selectedUserToView.set(updated);
          }
        },
      });
    }
  }

  exportUsersCsv(): void {
    const list = this.filteredUsers();
    if (list.length === 0) return;

    const headers = [
      'Username',
      'Employee Name',
      'Employee Code',
      'Email',
      'Role',
      'Status',
      'Created At',
    ];

    const rows = list.map((u) => [
      `"${u.username.replace(/"/g, '""')}"`,
      `"${u.employee ? (u.employee.firstName + ' ' + u.employee.lastName).replace(/"/g, '""') : 'Unlinked'}"`,
      u.employee?.employeeCode || '—',
      `"${(u.employee?.email || '').replace(/"/g, '""')}"`,
      `"${u.role?.name || 'No Role'}"`,
      u.isActive ? 'Active' : 'Inactive',
      u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '—',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `USR_accounts_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
