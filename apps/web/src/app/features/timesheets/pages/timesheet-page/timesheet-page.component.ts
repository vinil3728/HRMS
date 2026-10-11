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
import { AuthService } from '../../../../core/services/auth.service';
import { RbacService } from '../../../../core/services/rbac.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
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
    HasPermissionDirective,
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
  readonly TimesheetStatus = TimesheetStatus;

  readonly currentUser = this.authService.currentUser;
  readonly viewMode = signal<'self' | 'team'>('self');

  readonly myEmployeeId = computed<string>(
    () => this.currentUser()?.employeeId || ''
  );

  readonly hasPersonalProfile = computed<boolean>(() =>
    Boolean(this.myEmployeeId())
  );

  /**
   * Permission-driven check: any role granted org-wide employee management permissions
   * can inspect timesheets across all employees in the company.
   */
  readonly canManageAllTimesheets = computed<boolean>(() =>
    this.rbacService.hasAnyPermission([
      Permission.EMPLOYEE_VIEWS,
      Permission.EMPLOYEE_UPDATE,
    ])
  );

  readonly canInspectTeamTimesheets = computed<boolean>(() =>
    this.rbacService.hasAnyPermission([
      Permission.TIMESHEET_APPROVE,
      Permission.TIMESHEET_REJECT,
      Permission.EMPLOYEE_VIEWS,
      Permission.EMPLOYEE_UPDATE,
    ])
  );

  readonly myProfile = signal<Employee | null>(null);
  readonly allEmployees = signal<Employee[]>([]);
  readonly selectedEmployeeId = signal<string>('');

  /**
   * Employees available in the Team / Employee Timesheets tab:
   * - All employees if user has org-wide employee management permissions
   * - Direct reports (emp.manager?.id === myEmployeeId) otherwise
   */
  readonly manageableEmployees = computed<Employee[]>(() => {
    const all = this.allEmployees();
    const myId = this.myEmployeeId();
    if (this.canManageAllTimesheets()) {
      return myId ? all.filter((emp) => emp.id !== myId) : all;
    }
    if (!myId) {
      return [];
    }
    return all.filter((emp) => emp.manager?.id === myId && emp.id !== myId);
  });

  readonly canViewTeamOrOrgTab = computed<boolean>(
    () =>
      this.canInspectTeamTimesheets() && this.manageableEmployees().length > 0
  );

  readonly showViewTabs = computed<boolean>(
    () => this.hasPersonalProfile() && this.canViewTeamOrOrgTab()
  );

  readonly teamTabLabel = computed<string>(() =>
    this.canManageAllTimesheets() ? 'Employee Timesheets' : 'Team Timesheets'
  );

  readonly employeeOptions = computed<SelectOption[]>(() =>
    this.manageableEmployees().map((emp) => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`,
    }))
  );

  readonly activeTargetEmployeeId = computed<string>(() =>
    this.viewMode() === 'self'
      ? this.myEmployeeId()
      : this.selectedEmployeeId()
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
      Boolean(this.myEmployeeId()) &&
      this.activeTargetEmployeeId() === this.myEmployeeId()
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
    const myEmpId = this.myEmployeeId();
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

    if (myEmpId) {
      this.viewMode.set('self');
      this.reloadAll();
    }

    if (this.canInspectTeamTimesheets()) {
      this.employeeService.getDirectory().subscribe({
        next: (directory) => {
          this.allEmployees.set(directory);
          const manageable = this.manageableEmployees();
          const defaultTeamEmpId = manageable[0]?.id || '';
          this.selectedEmployeeId.set(defaultTeamEmpId);

          if (!myEmpId && defaultTeamEmpId) {
            this.viewMode.set('team');
            this.reloadAll();
          } else if (!myEmpId) {
            this.isLoading.set(false);
          }
        },
        error: () => {
          if (!myEmpId) {
            this.isLoading.set(false);
          }
        },
      });
    } else if (!myEmpId) {
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

  onEmployeeChange(newEmpId: string): void {
    if (newEmpId === this.selectedEmployeeId()) return;
    this.selectedEmployeeId.set(newEmpId);
    this.page.set(1);
    this.clearMessages();
    this.reloadAll();
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
    const empId = this.activeTargetEmployeeId();
    if (!empId) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    const query: TimesheetQueryParams = {
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
  }

  loadSummary(): void {
    const empId = this.activeTargetEmployeeId();
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
    const empId = this.activeTargetEmployeeId();
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
    const empId = this.activeTargetEmployeeId();
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
    const empId = this.activeTargetEmployeeId();
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
