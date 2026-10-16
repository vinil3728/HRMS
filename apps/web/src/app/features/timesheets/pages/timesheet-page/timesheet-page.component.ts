import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Permission } from '../../../../core/models/permission.model';
import { PermissionScope } from '../../../../core/models/permission-scope.model';
import { AuthService } from '../../../../core/services/auth.service';
import { RbacService } from '../../../../core/services/rbac.service';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import { DatePickerComponent, DateRangeValue } from '../../../../shared/ui/date-picker/date-picker.component';
import { Employee } from '../../../employees/models/employee.model';
import { EmployeeService } from '../../../employees/services/employee.service';
import { TimesheetDetailModalComponent } from '../../components/timesheet-detail-modal/timesheet-detail-modal.component';
import { TimesheetFormModalComponent } from '../../components/timesheet-form-modal/timesheet-form-modal.component';
import { TimesheetRejectModalComponent } from '../../components/timesheet-reject-modal/timesheet-reject-modal.component';
import {
  Timesheet,
  TimesheetQueryParams,
  TimesheetStatus,
  TimesheetSummary,
} from '../../models/timesheet.model';
import { TimesheetService } from '../../services/timesheet.service';

@Component({
  selector: 'app-timesheet-page',
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    DatePickerComponent,
    TimesheetFormModalComponent,
    TimesheetRejectModalComponent,
    TimesheetDetailModalComponent,
  ],
  templateUrl: './timesheet-page.component.html',
  styleUrl: './timesheet-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimesheetPageComponent implements OnInit {
  private readonly timesheetService = inject(TimesheetService);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  readonly rbacService = inject(RbacService);

  readonly Permission = Permission;
  readonly PermissionScope = PermissionScope;
  readonly TimesheetStatus = TimesheetStatus;

  readonly currentUser = this.authService.currentUser;
  readonly viewMode = signal<'self' | 'team'>('self');

  // ── Employee Context ──────────────────────────────────────────

  readonly currentEmployeeId = computed(
    () => this.currentUser()?.employeeId ?? ''
  );

  readonly hasEmployeeProfile = computed(
    () => Boolean(this.currentEmployeeId())
  );

  // ── View Permissions ──────────────────────────────────────────

  readonly canViewOwnTimesheets = computed(
    () => this.rbacService.hasScope(
      Permission.TIMESHEET_VIEW,
      PermissionScope.SELF
    )
  );

  readonly canViewTeamTimesheets = computed(
    () => this.rbacService.hasScope(
      Permission.TIMESHEET_VIEW,
      PermissionScope.TEAM
    )
  );

  readonly canViewOrganizationTimesheets = computed(
    () => this.rbacService.hasScope(
      Permission.TIMESHEET_VIEW,
      PermissionScope.ORG
    )
  );

  // ── Tab Availability ──────────────────────────────────────────

  readonly canShowSelfTab = computed(
    () => this.hasEmployeeProfile() &&
          this.canViewOwnTimesheets()
  );

  readonly canShowTeamTab = computed(
    () => this.hasEmployeeProfile() &&
          (
            this.canViewTeamTimesheets() ||
            this.canViewOrganizationTimesheets()
          ) &&
          this.rbacService.hasPermission(Permission.EMPLOYEE_VIEW)
  );

  readonly teamTabLabel = computed(() =>
    this.canViewOrganizationTimesheets()
      ? 'Employees Timesheets'
      : 'Team Timesheets'
  );

  // ── Timesheet CRUD Permissions ────────────────────────────────

  readonly canCreateTimesheet = computed(
    () => this.rbacService.hasScope(
      Permission.TIMESHEET_CREATE,
      PermissionScope.SELF
    )
  );

  readonly canUpdateTimesheet = computed(
    () => this.rbacService.hasPermission(
      Permission.TIMESHEET_UPDATE
    )
  );

  readonly canDeleteTimesheet = computed(
    () => this.rbacService.hasPermission(
      Permission.TIMESHEET_DELETE
    )
  );

  readonly canSubmitTimesheet = computed(
    () => this.rbacService.hasPermission(
      Permission.TIMESHEET_SUBMIT
    )
  );

  readonly canViewTimesheetSummary = computed(
    () => this.rbacService.hasPermission(
      Permission.TIMESHEET_SUMMARY_VIEW
    )
  );

  // ── Approval & Rejection Permissions ──────────────────────────────────────

  readonly canApproveTeamTimesheets = computed(
    () => this.rbacService.hasScope(
      Permission.TIMESHEET_APPROVE,
      PermissionScope.TEAM
    )
  );

  readonly canApproveOrganizationTimesheets = computed(
    () => this.rbacService.hasScope(
      Permission.TIMESHEET_APPROVE,
      PermissionScope.ORG
    )
  );

  readonly canRejectTeamTimesheets = computed(
    () => this.rbacService.hasScope(
      Permission.TIMESHEET_REJECT,
      PermissionScope.TEAM
    )
  );

  readonly canRejectOrganizationTimesheets = computed(
    () => this.rbacService.hasScope(
      Permission.TIMESHEET_REJECT,
      PermissionScope.ORG
    )
  );

  readonly canApproveTimesheet = computed(
    () => this.canApproveTeamTimesheets() || this.canApproveOrganizationTimesheets()
  );

  readonly canRejectTimesheet = computed(
    () => this.canRejectTeamTimesheets() || this.canRejectOrganizationTimesheets()
  );

  // ── Row Actions ───────────────────────────────────────────────

  readonly hasRowActionsForCurrentView = computed(() => {
    if (this.viewMode() === 'self') {
      return (
        this.canUpdateTimesheet() ||
        this.canDeleteTimesheet() ||
        this.canSubmitTimesheet()
      );
    }

    return (
      this.canApproveTeamTimesheets() ||
      this.canApproveOrganizationTimesheets() ||
      this.canRejectTeamTimesheets() ||
      this.canRejectOrganizationTimesheets()
    );
  });

  readonly myProfile = signal<Employee | null>(null);
  readonly allEmployees = signal<Employee[]>([]);
  readonly selectedEmployeeId = signal<string>('');
  readonly teamEmployeeFilter = signal<string>('ALL');

  /**
   * Employees available in the Team / Employee Timesheets tab:
   * - All employees if user has org-wide employee management permissions
   * - Direct reports (emp.manager?.id === myEmployeeId) otherwise
   */
  readonly manageableEmployees = computed<Employee[]>(() => {
    const all = this.allEmployees();
    const myId = this.currentEmployeeId();
    if (this.canViewOrganizationTimesheets()) {
      return myId ? all.filter((emp) => emp.id !== myId) : all;
    }
    if (!myId) {
      return [];
    }
    return all.filter((emp) => emp.manager?.id === myId && emp.id !== myId);
  });

  readonly employeeFilterOptions = computed<SelectOption[]>(() => [
    { value: 'ALL', label: 'All Employees' },
    ...this.manageableEmployees().map((emp) => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`,
    })),
  ]);

  readonly employeeOptions = computed<SelectOption[]>(() =>
    this.manageableEmployees().map((emp) => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`,
    }))
  );

  readonly activeTargetEmployeeId = computed<string>(() =>
    this.viewMode() === 'self'
      ? this.currentEmployeeId()
      : (this.teamEmployeeFilter() !== 'ALL' ? this.teamEmployeeFilter() : (this.manageableEmployees()[0]?.id || ''))
  );

  readonly activeTargetEmployee = computed<Employee | null>(() => {
    if (this.viewMode() === 'self') {
      return (
        this.myProfile() ||
        (this.currentUser()?.employee as Employee | undefined) ||
        null
      );
    }
    const id = this.activeTargetEmployeeId();
    return this.allEmployees().find((e) => e.id === id) || null;
  });

  readonly isViewingSelf = computed<boolean>(
    () =>
      Boolean(this.currentEmployeeId()) &&
      this.activeTargetEmployeeId() === this.currentEmployeeId()
  );

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: TimesheetStatus.DRAFT, label: 'Draft' },
    { value: TimesheetStatus.SUBMITTED, label: 'Submitted' },
    { value: TimesheetStatus.APPROVED, label: 'Approved' },
    { value: TimesheetStatus.REJECTED, label: 'Rejected' },
  ];

  // Timesheets & summary data
  readonly timesheets = signal<Timesheet[]>([]);
  readonly summary = signal<TimesheetSummary | null>(null);
  readonly teamSummary = signal<{
    totalHours: number;
    draftHours: number;
    submittedHours: number;
    approvedHours: number;
    rejectedHours: number;
    totalCount: number;
    pendingCount: number;
  }>({
    totalHours: 0,
    draftHours: 0,
    submittedHours: 0,
    approvedHours: 0,
    rejectedHours: 0,
    totalCount: 0,
    pendingCount: 0,
  });
  readonly isLoading = signal<boolean>(true);
  readonly actionLoadingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filters, Sorting & Pagination
  readonly searchQuery = signal<string>('');
  readonly filterStatus = signal<TimesheetStatus | 'ALL'>('ALL');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly sortField = signal<'date' | 'project' | 'hours' | 'status'>('date');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly page = signal<number>(1);
  readonly limit = 10;
  readonly total = signal<number>(0);
  readonly totalPages = signal<number>(1);

  // Modals state
  readonly isFormOpen = signal<boolean>(false);
  readonly isRejectOpen = signal<boolean>(false);
  readonly isDetailOpen = signal<boolean>(false);
  readonly activeTimesheet = signal<Timesheet | null>(null);

  readonly hasActiveFilters = computed<boolean>(
    () =>
      this.filterStatus() !== 'ALL' ||
      Boolean(this.fromDate()) ||
      Boolean(this.toDate())
  );

  readonly displayedTimesheets = computed<Timesheet[]>(() => {
    const field = this.sortField();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;

    const list = [...this.timesheets()];

    list.sort((a, b) => {
      if (field === 'date') {
        return (
          (new Date(a.workDate).getTime() - new Date(b.workDate).getTime()) *
          dir
        );
      }
      if (field === 'project') {
        return a.project.localeCompare(b.project) * dir;
      }
      if (field === 'hours') {
        return (a.hours - b.hours) * dir;
      }
      return a.status.localeCompare(b.status) * dir;
    });

    return list;
  });

  ngOnInit(): void {
    this.initializeEmployeeContext();
  }

  private initializeEmployeeContext(): void {
    const myEmpId = this.currentEmployeeId();
    const sessionEmployee = this.currentUser()?.employee as
      | Employee
      | undefined;

    if (sessionEmployee) {
      this.myProfile.set(sessionEmployee);
    } else if (myEmpId) {
      this.employeeService.getMyProfile().subscribe({
        next: (emp) => this.myProfile.set(emp),
      });
    }

    if (myEmpId && this.canShowSelfTab()) {
      this.viewMode.set('self');
      this.reloadAll();
    }

    if (this.canShowTeamTab()) {
      this.employeeService.getDirectory().subscribe({
        next: (directory) => {
          this.allEmployees.set(directory);
          if (!myEmpId || !this.canShowSelfTab()) {
            this.viewMode.set('team');
            this.reloadAll();
          }
        },
        error: () => {
          if (!myEmpId) {
            this.isLoading.set(false);
          }
        },
      });
    } else if (!myEmpId || !this.canShowSelfTab()) {
      this.isLoading.set(false);
    }
  }

  setViewMode(mode: 'self' | 'team'): void {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    this.page.set(1);
    this.clearMessages();
    this.reloadAll();
  }

  onEmployeeFilterChange(newEmpId: string): void {
    if (newEmpId === this.teamEmployeeFilter()) return;
    this.teamEmployeeFilter.set(newEmpId);
    this.page.set(1);
    this.clearMessages();
    this.reloadAll();
  }

  onEmployeeChange(newEmpId: string): void {
    this.onEmployeeFilterChange(newEmpId);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onStatusChange(status: string): void {
    this.filterStatus.set((status as TimesheetStatus | 'ALL') || 'ALL');
    this.page.set(1);
    this.loadTimesheets();
  }

  onDateRangeChange(range: DateRangeValue): void {
    this.fromDate.set(range.fromDate || '');
    this.toDate.set(range.toDate || '');
    this.page.set(1);
    this.loadTimesheets();
  }

  onFromDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fromDate.set(input.value);
    this.page.set(1);
    this.loadTimesheets();
  }

  onToDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.toDate.set(input.value);
    this.page.set(1);
    this.loadTimesheets();
  }

  toggleSort(field: 'date' | 'project' | 'hours' | 'status'): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set(field === 'date' ? 'desc' : 'asc');
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterStatus.set('ALL');
    this.fromDate.set('');
    this.toDate.set('');
    this.page.set(1);
    this.loadTimesheets();
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages() || newPage === this.page()) {
      return;
    }
    this.page.set(newPage);
    this.loadTimesheets();
  }

  reloadAll(): void {
    this.loadTimesheets();
    this.loadSummary();
  }

  loadTimesheets(): void {
    this.isLoading.set(true);
    const query: any = {
      page: this.page(),
      limit: this.limit,
    };

    if (this.fromDate()) {
      query.fromDate = this.fromDate();
    }
    if (this.toDate()) {
      query.toDate = this.toDate();
    }
    if (this.filterStatus() !== 'ALL') {
      query.status = this.filterStatus() as TimesheetStatus;
    }

    if (this.viewMode() === 'self') {
      const empId = this.currentEmployeeId();
      if (!empId) {
        this.isLoading.set(false);
        return;
      }

      this.timesheetService.getTimesheets(empId, query).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.timesheets.set(res.data);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages || 1);
        },
        error: (err: { error?: { message?: string } }) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to load timesheet entries.'
          );
        },
      });
    } else if (this.viewMode() === 'team') {
      const scope = this.canViewOrganizationTimesheets()
        ? PermissionScope.ORG
        : PermissionScope.TEAM;
      const employeeId =
        this.teamEmployeeFilter() !== 'ALL'
          ? this.teamEmployeeFilter()
          : undefined;

      this.timesheetService
        .getAllTimesheets({
          ...query,
          scope,
          employeeId,
        })
        .subscribe({
          next: (res) => {
            this.isLoading.set(false);
            this.timesheets.set(res.data);
            this.total.set(res.total);
            this.totalPages.set(res.totalPages || 1);
            if (res.summary) {
              this.teamSummary.set(res.summary);
            }
          },
          error: (err: { error?: { message?: string } }) => {
            this.isLoading.set(false);
            this.errorMessage.set(
              err.error?.message || 'Failed to load team timesheet entries.'
            );
          },
        });
    }
  }

  loadSummary(): void {
    if (this.viewMode() === 'self') {
      if (!this.canViewTimesheetSummary()) {
        this.summary.set(null);
        return;
      }
      const empId = this.currentEmployeeId();
      if (!empId) return;

      this.timesheetService.getSummary(empId).subscribe({
        next: (summary) => {
          this.summary.set(summary);
        },
        error: () => {
          this.summary.set(null);
        },
      });
    }
  }

  openCreateModal(): void {
    this.activeTimesheet.set(null);
    this.isFormOpen.set(true);
  }

  openEditModal(item: Timesheet): void {
    this.activeTimesheet.set(item);
    this.isFormOpen.set(true);
  }

  openDetailModal(item: Timesheet): void {
    this.activeTimesheet.set(item);
    this.isDetailOpen.set(true);
  }

  openRejectModal(item: Timesheet): void {
    this.activeTimesheet.set(item);
    this.isRejectOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormOpen.set(false);
  }

  closeRejectModal(): void {
    this.isRejectOpen.set(false);
  }

  closeDetailModal(): void {
    this.isDetailOpen.set(false);
  }

  onSubmitTimesheet(item: Timesheet): void {
    const empId = item.employeeId || item.employee?.id || this.currentEmployeeId();
    if (!empId) return;

    const confirmed = confirm(
      `Submit ${item.hours} hrs on ${item.project} for manager approval?`
    );
    if (!confirmed) return;

    this.actionLoadingId.set(item.id);
    this.timesheetService.submitTimesheet(empId, item.id).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.setToast('Timesheet submitted for approval.');
        this.reloadAll();
      },
      error: (err: { error?: { message?: string } }) => {
        this.actionLoadingId.set(null);
        this.errorMessage.set(
          err.error?.message || 'Failed to submit timesheet.'
        );
      },
    });
  }

  onApproveTimesheet(item: Timesheet): void {
    const empId = item.employeeId || item.employee?.id || this.currentEmployeeId();
    if (!empId) return;

    const confirmed = confirm(
      `Approve ${item.hours} hrs log for ${item.project}?`
    );
    if (!confirmed) return;

    this.actionLoadingId.set(item.id);
    this.timesheetService.approveTimesheet(empId, item.id).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.setToast('Timesheet approved successfully.');
        this.reloadAll();
      },
      error: (err: { error?: { message?: string } }) => {
        this.actionLoadingId.set(null);
        this.errorMessage.set(
          err.error?.message || 'Failed to approve timesheet.'
        );
      },
    });
  }

  onDeleteTimesheet(item: Timesheet): void {
    const empId = item.employeeId || item.employee?.id || this.currentEmployeeId();
    if (!empId) return;

    const confirmed = confirm(
      `Are you sure you want to delete this draft entry (${item.hours} hrs on ${item.project})?`
    );
    if (!confirmed) return;

    this.actionLoadingId.set(item.id);
    this.timesheetService.deleteTimesheet(empId, item.id).subscribe({
      next: () => {
        this.actionLoadingId.set(null);
        this.setToast('Draft timesheet deleted successfully.');
        this.reloadAll();
      },
      error: (err: { error?: { message?: string } }) => {
        this.actionLoadingId.set(null);
        this.errorMessage.set(
          err.error?.message || 'Failed to delete timesheet.'
        );
      },
    });
  }

  onFormSaved(saved: Timesheet): void {
    this.isFormOpen.set(false);
    this.setToast(
      saved.status === TimesheetStatus.SUBMITTED
        ? 'Timesheet logged and submitted for approval.'
        : 'Timesheet log saved successfully.'
    );
    this.reloadAll();
  }

  onRejected(): void {
    this.isRejectOpen.set(false);
    this.setToast('Timesheet entry returned/rejected with feedback.');
    this.reloadAll();
  }

  clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private setToast(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 4500);
  }
}
