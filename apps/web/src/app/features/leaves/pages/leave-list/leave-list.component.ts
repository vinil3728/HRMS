import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { RbacService } from '../../../../core/services/rbac.service';
import { Permission } from '../../../../core/models/permission.model';
import { PermissionScope } from '../../../../core/models/permission-scope.model';
import { BadgeComponent, BadgeVariant } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { DatePickerComponent, DateRangeValue } from '../../../../shared/ui/date-picker/date-picker.component';
import { Employee } from '../../../employees/models/employee.model';
import { EmployeeService } from '../../../employees/services/employee.service';
import { FormsModule } from '@angular/forms';
import { LeaveApplyModalComponent } from '../../components/leave-apply-modal/leave-apply-modal.component';
import { LeaveActionModalComponent } from '../../components/leave-action-modal/leave-action-modal.component';
import { HolidayCalendarComponent } from '../../../holiday-calendar/holiday-calendar.component';
import {
  Leave,
  LeaveBalance,
  LeaveStatus,
  LeaveType,
} from '../../models/leave.model';
import { LeaveService } from '../../services/leave.service';

import { ActivatedRoute } from '@angular/router';

type ViewMode = 'self' | 'team' | 'holidays';

@Component({
  selector: 'app-leave-list',
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    DatePickerComponent,
    FormsModule,
    LeaveApplyModalComponent,
    LeaveActionModalComponent,
    HolidayCalendarComponent,
  ],
  templateUrl: './leave-list.component.html',
  styleUrl: './leave-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveListComponent implements OnInit {
  private readonly leaveService = inject(LeaveService);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  private readonly rbacService = inject(RbacService);
  private readonly route = inject(ActivatedRoute);

  readonly Permission = Permission;
  readonly PermissionScope = PermissionScope;
  readonly currentYear = new Date().getFullYear();
  readonly todayDateStr = new Date().toISOString().substring(0, 10);

  // ── View mode ──────────────────────────────────────────────────────────────
  readonly viewMode = signal<ViewMode>('self');

  // ── Current user identity ──────────────────────────────────────────────────
  readonly myEmployeeId = computed(() => this.authService.currentUser()?.employeeId ?? '');

  readonly hasOrgLeaveAccess = computed(() =>
    this.rbacService.hasScope(Permission.LEAVE_VIEW, PermissionScope.ORG) ||
    this.rbacService.hasScope(Permission.LEAVE_APPROVE, PermissionScope.ORG) ||
    this.rbacService.hasScope(Permission.LEAVE_BALANCE_VIEW, PermissionScope.ORG) ||
    this.rbacService.hasScope(Permission.LEAVE_BALANCE_ADJUST, PermissionScope.ORG) ||
    this.rbacService.hasAnyPermission([
      Permission.EMPLOYEE_VIEWS,
    ])
  );

  readonly hasTeamLeaveAccess = computed(() =>
    this.rbacService.hasScope(Permission.LEAVE_VIEW, PermissionScope.TEAM) ||
    this.rbacService.hasScope(Permission.LEAVE_APPROVE, PermissionScope.TEAM) ||
    this.rbacService.hasScope(Permission.LEAVE_BALANCE_VIEW, PermissionScope.TEAM) ||
    this.rbacService.hasScope(Permission.LEAVE_BALANCE_ADJUST, PermissionScope.TEAM)
  );

  readonly canManageAllEmployees = computed(() =>
    this.hasOrgLeaveAccess() ||
    this.rbacService.hasAnyPermission([
      Permission.EMPLOYEE_VIEWS,
      Permission.EMPLOYEE_UPDATE,
    ])
  );

  readonly canViewTeamOrOrgLeavesTab = computed(
    () => this.hasOrgLeaveAccess() || this.hasTeamLeaveAccess()
  );

  readonly canViewSelfLeavesTab = computed(() =>
    this.rbacService.hasPermission(Permission.LEAVE_VIEW)
  );

  readonly canViewHolidaysTab = computed(() =>
    this.rbacService.hasPermission(Permission.HOLIDAY_VIEW)
  );

  readonly canApplyLeave = computed(() =>
    this.rbacService.hasPermission(Permission.LEAVE_CREATE)
  );

  readonly canAllocateBalance = computed(() =>
    this.rbacService.hasPermission(Permission.LEAVE_BALANCE_CREATE)
  );

  readonly canAdjustBalance = computed(() =>
    this.rbacService.hasPermission(Permission.LEAVE_BALANCE_ADJUST)
  );

  readonly teamOrOrgTabLabel = computed(() =>
    this.hasOrgLeaveAccess()
      ? 'Employees Leaves'
      : 'Team Leaves'
  );

  readonly hasAnyActionPermissions = computed<boolean>(() => {
    if (this.viewMode() === 'self') {
      return this.rbacService.hasAnyPermission([
        Permission.LEAVE_UPDATE,
        Permission.LEAVE_EDIT,
        Permission.LEAVE_CANCEL,
      ]);
    }
    if (this.viewMode() === 'team') {
      return this.canApproveLeaves() || this.canRejectLeaves();
    }
    return false;
  });

  readonly canEditLeave = computed(() =>
    this.rbacService.hasAnyPermission([
      Permission.LEAVE_UPDATE,
      Permission.LEAVE_EDIT,
    ])
  );

  readonly canCancelLeave = computed(() =>
    this.rbacService.hasAnyPermission([
      Permission.LEAVE_CANCEL,
      Permission.LEAVE_DELETE,
    ])
  );

  readonly canViewLeaveSummary = computed(
    () => this.rbacService.hasPermission(Permission.LEAVE_SUMMARY_VIEW)
  );

  readonly canApproveLeaves = computed(() =>
    this.rbacService.hasScope(Permission.LEAVE_APPROVE, PermissionScope.TEAM) ||
    this.rbacService.hasScope(Permission.LEAVE_APPROVE, PermissionScope.ORG) ||
    this.rbacService.hasPermission(Permission.LEAVE_APPROVE)
  );

  readonly canRejectLeaves = computed(() =>
    this.rbacService.hasScope(Permission.LEAVE_REJECT, PermissionScope.TEAM) ||
    this.rbacService.hasScope(Permission.LEAVE_REJECT, PermissionScope.ORG) ||
    this.rbacService.hasPermission(Permission.LEAVE_REJECT)
  );

  // ── Employee data ──────────────────────────────────────────────────────────
  readonly myProfile = signal<Employee | null>(null);
  readonly allEmployees = signal<Employee[]>([]);

  /**
   * In team/employees mode: all other employees if canManageAllEmployees, otherwise direct reports.
   */
  readonly manageableEmployees = computed<Employee[]>(() => {
    const all = this.allEmployees();
    const myId = this.myEmployeeId();
    if (this.canManageAllEmployees()) {
      return myId ? all.filter((e) => e.id !== myId) : all;
    }
    return all.filter((e) => e.manager?.id === myId && e.id !== myId);
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

  /** Filter selection in Team / Employees Leaves mode: 'ALL' or specific employeeId */
  readonly teamEmployeeFilter = signal<string>('ALL');

  /** The currently inspected employee id */
  readonly activeTargetEmployeeId = signal<string>('');


  /** The employee record being viewed in team mode */
  readonly activeTargetEmployee = computed(() => {
    const id = this.activeTargetEmployeeId();
    return this.allEmployees().find((e) => e.id === id) ?? null;
  });

  /** My own employee record */
  readonly myEmployee = computed(() => {
    return (
      this.myProfile() ||
      (this.authService.currentUser()?.employee as Employee | undefined) ||
      null
    );
  });

  /** Quick leave balance summary for "My Leaves" right panel */
  readonly myBalanceSummary = computed(() => {
    return this.balances().slice(0, 3); // show at most 3 for compact strip
  });

  // ── Leave data ─────────────────────────────────────────────────────────────
  readonly leaves = signal<Leave[]>([]);
  readonly balances = signal<LeaveBalance[]>([]);
  readonly myBalances = signal<LeaveBalance[]>([]);
  readonly myLeavesCount = signal<number>(0);
  readonly teamLeavesCount = signal<number>(0);
  readonly summaryPendingCount = signal<number>(0);

  // ── Self Leave Metrics Computed Signals ────────────────────────────────────
  readonly totalAllocatedDays = computed<number>(() =>
    this.balances().reduce((sum, b) => sum + Number(b.totalDays || 0), 0)
  );

  readonly totalAvailableDays = computed<number>(() =>
    this.balances().reduce((sum, b) => sum + Number(b.availableDays || 0), 0)
  );

  readonly totalUsedDays = computed<number>(() =>
    this.balances().reduce((sum, b) => sum + Number(b.usedDays || 0), 0)
  );

  readonly pendingLeavesCount = computed<number>(() => {
    return (
      this.summaryPendingCount() ||
      this.leaves().filter((l) => l.status === LeaveStatus.PENDING).length
    );
  });

  // ── UI state ───────────────────────────────────────────────────────────────
  readonly loading = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly typeFilter = signal<string>('ALL');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly totalRecords = signal<number>(0);
  readonly totalPages = signal<number>(1);

  readonly filteredLeaves = computed<Leave[]>(() => {
    const list = this.leaves();
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return list;

    return list.filter((item) => {
      const typeStr = this.formatLeaveType(item.leaveType).toLowerCase();
      const reasonStr = (item.reason || '').toLowerCase();
      const statusStr = (item.status || '').toLowerCase();
      const rejectReasonStr = (item.rejectionReason || '').toLowerCase();

      return (
        typeStr.includes(query) ||
        reasonStr.includes(query) ||
        statusStr.includes(query) ||
        rejectReasonStr.includes(query)
      );
    });
  });

  readonly emptyStateTitle = computed(() => {
    if (this.hasActiveFilters()) {
      return 'No matching leave applications found';
    }
    if (this.viewMode() === 'self') {
      return 'No leave requests found';
    }
    return this.teamOrOrgTabLabel() === 'Employees Leaves'
      ? 'No employee leave records found'
      : 'No team leave requests found';
  });

  readonly emptyStateDescription = computed(() => {
    if (this.hasActiveFilters()) {
      return 'No applications match your active filter criteria.';
    }
    if (this.viewMode() === 'self') {
      return 'You haven’t submitted any time-off applications yet.';
    }
    const emp = this.contextEmployee;
    if (emp) {
      return `No time-off applications found for ${emp.firstName} ${emp.lastName}.`;
    }
    return this.teamOrOrgTabLabel() === 'Employees Leaves'
      ? 'No time-off applications found for this employee.'
      : 'No time-off applications submitted by team members.';
  });

  readonly isApplyModalOpen = signal<boolean>(false);
  readonly isActionModalOpen = signal<boolean>(false);
  readonly actionType = signal<'REJECT' | 'ALLOCATE_BALANCE' | 'ADJUST_BALANCE'>('REJECT');
  readonly selectedLeave = signal<Leave | null>(null);

  // ── Static options ─────────────────────────────────────────────────────────
  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  readonly typeOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Categories' },
    { value: 'CASUAL', label: 'Casual Leave' },
    { value: 'SICK', label: 'Sick Leave' },
    { value: 'EARNED', label: 'Earned Leave' },
    { value: 'UNPAID', label: 'Unpaid' },
    { value: 'MATERNITY', label: 'Maternity' },
    { value: 'PATERNITY', label: 'Paternity' },
    { value: 'OTHER', label: 'Other' },
  ];

  // ── Computed: which employee id to use for loading ────────────────────────
  private readonly activeLoadId = computed(() => {
    if (this.viewMode() === 'self') return this.myEmployeeId();
    return this.activeTargetEmployeeId();
  });

  readonly teamSummary = signal<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  }>({ total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initializeData();
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('tab') === 'holidays') {
        this.viewMode.set('holidays');
      }
    });
  }

  private initializeData(): void {
    const myId = this.myEmployeeId();
    const sessionEmployee = this.authService.currentUser()?.employee as
      | Employee
      | undefined;

    if (sessionEmployee) {
      this.myProfile.set(sessionEmployee);
    } else if (myId) {
      this.employeeService.getMyProfile().subscribe({
        next: (emp) => this.myProfile.set(emp),
      });
    }

    if (myId && this.canViewSelfLeavesTab()) {
      this.viewMode.set('self');
      this.loadLeaves();
      this.loadBalances(myId);
    }

    if (this.canViewTeamOrOrgLeavesTab()) {
      this.employeeService.getDirectory().subscribe({
        next: (directory) => {
          this.allEmployees.set(directory);
          if (!myId || !this.canViewSelfLeavesTab()) {
            this.viewMode.set('team');
            this.loadLeaves();
          }
        },
        error: () => {
          if (!myId) {
            this.loading.set(false);
          }
        },
      });
    } else if (!myId) {
      this.loading.set(false);
    }
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  loadLeaves(): void {
    this.loading.set(true);
    const status =
      this.statusFilter() !== 'ALL'
        ? (this.statusFilter() as LeaveStatus)
        : undefined;
    const leaveType =
      this.typeFilter() !== 'ALL'
        ? (this.typeFilter() as LeaveType)
        : undefined;
    const fromDate = this.fromDate() || undefined;
    const toDate = this.toDate() || undefined;

    if (this.viewMode() === 'self') {
      const myId = this.myEmployeeId();
      if (!myId) {
        this.loading.set(false);
        return;
      }
      this.leaveService
        .getLeaves(myId, {
          page: this.currentPage(),
          limit: 15,
          status,
          leaveType,
          fromDate,
          toDate,
        })
        .subscribe({
          next: (res) => {
            this.leaves.set(res.data);
            this.totalRecords.set(res.total);
            this.totalPages.set(res.totalPages || 1);
            this.myLeavesCount.set(res.total);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
    } else if (this.viewMode() === 'team') {
      const scope = this.hasOrgLeaveAccess()
        ? PermissionScope.ORG
        : PermissionScope.TEAM;
      const employeeId =
        this.teamEmployeeFilter() !== 'ALL'
          ? this.teamEmployeeFilter()
          : undefined;

      this.leaveService
        .getAllLeaves({
          scope,
          employeeId,
          page: this.currentPage(),
          limit: 15,
          status,
          leaveType,
          fromDate,
          toDate,
        })
        .subscribe({
          next: (res) => {
            this.leaves.set(res.data);
            this.totalRecords.set(res.total);
            this.totalPages.set(res.totalPages || 1);
            this.teamLeavesCount.set(res.total);
            if (res.summary) {
              this.teamSummary.set(res.summary);
            }
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
    }
  }

  loadBalances(employeeId: string): void {
    if (!employeeId) return;
    this.leaveService.getLeaveBalances(employeeId, this.currentYear).subscribe({
      next: (data) => {
        this.balances.set(data);
        if (employeeId === this.myEmployeeId()) {
          this.myBalances.set(data);
        }
      },
      error: () => {
        this.balances.set([]);
        if (employeeId === this.myEmployeeId()) {
          this.myBalances.set([]);
        }
      },
    });
    this.loadSummary(employeeId);
  }

  loadSummary(employeeId: string): void {
    if (!employeeId) return;
    this.leaveService.getLeaveSummary(employeeId, this.currentYear).subscribe({
      next: (res: any) => {
        const pendingItem = res?.statusSummary?.find(
          (s: any) => s.status === 'PENDING'
        );
        this.summaryPendingCount.set(pendingItem?.count ?? 0);
      },
      error: () => {
        this.summaryPendingCount.set(
          this.leaves().filter((l) => l.status === LeaveStatus.PENDING).length
        );
      },
    });
  }

  private refreshCurrentView(): void {
    this.loadLeaves();
    const myId = this.myEmployeeId();
    if (myId) {
      this.loadBalances(myId);
    }
  }

  // ── Tab switching ──────────────────────────────────────────────────────────
  switchTab(mode: ViewMode): void {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    this.currentPage.set(1);
    this.resetFiltersInternal();

    if (mode === 'self') {
      const myId = this.myEmployeeId();
      if (myId) {
        this.loadLeaves();
        this.loadBalances(myId);
      }
    } else if (mode === 'team') {
      this.loadLeaves();
    }
  }

  onEmployeeFilterChange(value: string): void {
    this.teamEmployeeFilter.set(value);
    this.currentPage.set(1);
    this.loadLeaves();
  }

  onEmployeeChange(newId: string): void {
    this.onEmployeeFilterChange(newId);
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadLeaves();
  }

  onTypeFilterChange(value: string): void {
    this.typeFilter.set(value);
    this.currentPage.set(1);
    this.loadLeaves();
  }

  onDateRangeChange(range: DateRangeValue): void {
    this.fromDate.set(range.fromDate || '');
    this.toDate.set(range.toDate || '');
    this.currentPage.set(1);
    this.loadLeaves();
  }

  onFromDateChange(event: Event): void {
    this.fromDate.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
    this.loadLeaves();
  }

  onToDateChange(event: Event): void {
    this.toDate.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
    this.loadLeaves();
  }

  private resetFiltersInternal(): void {
    this.statusFilter.set('ALL');
    this.typeFilter.set('ALL');
    this.fromDate.set('');
    this.toDate.set('');
    this.searchQuery.set('');
  }

  resetFilters(): void {
    this.resetFiltersInternal();
    this.currentPage.set(1);
    this.loadLeaves();
  }

  hasActiveFilters(): boolean {
    return (
      this.statusFilter() !== 'ALL' ||
      this.typeFilter() !== 'ALL' ||
      !!this.fromDate() ||
      !!this.toDate()
    );
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadLeaves();
  }

  // ── Modal handlers ─────────────────────────────────────────────────────────
  openApplyModal(): void {
    this.selectedLeave.set(null);
    this.isApplyModalOpen.set(true);
  }

  openEditModal(leave: Leave): void {
    this.selectedLeave.set(leave);
    this.isApplyModalOpen.set(true);
  }

  closeApplyModal(): void {
    this.isApplyModalOpen.set(false);
    this.selectedLeave.set(null);
  }

  onLeaveSaved(): void {
    this.closeApplyModal();
    const myId = this.myEmployeeId();
    if (myId) {
      this.loadBalances(myId);
    }
    this.refreshCurrentView();
  }

  openRejectModal(leave: Leave): void {
    this.selectedLeave.set(leave);
    this.actionType.set('REJECT');
    this.isActionModalOpen.set(true);
  }

  openAllocateModal(): void {
    this.selectedLeave.set(null);
    this.actionType.set('ALLOCATE_BALANCE');
    this.isActionModalOpen.set(true);
  }

  openAdjustModal(): void {
    this.selectedLeave.set(null);
    this.actionType.set('ADJUST_BALANCE');
    this.isActionModalOpen.set(true);
  }

  closeActionModal(): void {
    this.isActionModalOpen.set(false);
    this.selectedLeave.set(null);
  }

  onActionCompleted(): void {
    this.closeActionModal();
    this.refreshCurrentView();
  }

  // ── Non-blocking Confirmation Dialog State ────────────────────────────────
  readonly isConfirmModalOpen = signal<boolean>(false);
  readonly confirmModalTitle = signal<string>('');
  readonly confirmModalMessage = signal<string>('');
  readonly confirmModalButtonText = signal<string>('Confirm');
  readonly confirmModalVariant = signal<'primary' | 'danger'>('primary');
  private pendingConfirmAction: (() => void) | null = null;

  onApprove(leave: Leave): void {
    this.confirmModalTitle.set('Approve Leave Application');
    this.confirmModalMessage.set(
      `Approve ${leave.numberOfDays} day(s) of ${this.formatLeaveType(leave.leaveType)} for this employee?`
    );
    this.confirmModalButtonText.set('Approve');
    this.confirmModalVariant.set('primary');
    this.pendingConfirmAction = () => {
      const empId = leave.employee?.id || leave.employeeId || this.myEmployeeId();
      this.leaveService.approveLeave(empId, leave.id).subscribe({
        next: () => this.refreshCurrentView(),
      });
    };
    this.isConfirmModalOpen.set(true);
  }

  onCancelLeave(leave: Leave): void {
    this.confirmModalTitle.set('Cancel Leave Application');
    this.confirmModalMessage.set(
      'Are you sure you want to cancel this leave application? Consumed quota will be refunded if already approved.'
    );
    this.confirmModalButtonText.set('Yes, Cancel Request');
    this.confirmModalVariant.set('danger');
    this.pendingConfirmAction = () => {
      const empId = leave.employee?.id || leave.employeeId || this.myEmployeeId();
      this.leaveService.cancelLeave(empId, leave.id).subscribe({
        next: () => this.refreshCurrentView(),
      });
    };
    this.isConfirmModalOpen.set(true);
  }

  closeConfirmModal(): void {
    this.isConfirmModalOpen.set(false);
    this.pendingConfirmAction = null;
  }

  executeConfirmAction(): void {
    if (this.pendingConfirmAction) {
      this.pendingConfirmAction();
    }
    this.closeConfirmModal();
  }

  // ── Computed: active employee for context card ─────────────────────────────
  get contextEmployee(): Employee | null {
    return this.viewMode() === 'self'
      ? this.myEmployee()
      : this.activeTargetEmployee();
  }

  get contextEmployeeId(): string {
    if (this.viewMode() === 'self') return this.myEmployeeId();
    if (this.teamEmployeeFilter() !== 'ALL') return this.teamEmployeeFilter();
    return this.manageableEmployees()[0]?.id || '';
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  formatLeaveType(type: LeaveType): string {
    switch (type) {
      case LeaveType.CASUAL: return 'Casual Leave';
      case LeaveType.SICK: return 'Sick Leave';
      case LeaveType.EARNED: return 'Earned Leave';
      case LeaveType.UNPAID: return 'Unpaid Leave';
      case LeaveType.MATERNITY: return 'Maternity';
      case LeaveType.PATERNITY: return 'Paternity';
      case LeaveType.OTHER: return 'Other';
      default: return type;
    }
  }

  getStatusVariant(status: LeaveStatus): BadgeVariant {
    switch (status) {
      case LeaveStatus.APPROVED: return 'success';
      case LeaveStatus.PENDING: return 'warning';
      case LeaveStatus.REJECTED: return 'error';
      case LeaveStatus.CANCELLED: return 'gray';
      default: return 'gray';
    }
  }

  formatStatusLabel(status: LeaveStatus): string {
    switch (status) {
      case LeaveStatus.PENDING: return 'Pending Approval';
      case LeaveStatus.APPROVED: return 'Approved';
      case LeaveStatus.REJECTED: return 'Rejected';
      case LeaveStatus.CANCELLED: return 'Cancelled';
      default: return status;
    }
  }

  getUsagePercent(b: LeaveBalance): number {
    if (!b.totalDays || b.totalDays === 0) return 0;
    return Math.min(100, Math.round((Number(b.usedDays) / Number(b.totalDays)) * 100));
  }
}
