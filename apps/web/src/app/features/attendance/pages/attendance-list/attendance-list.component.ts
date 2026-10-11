import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { RbacService } from '../../../../core/services/rbac.service';
import { Permission } from '../../../../core/models/permission.model';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { BadgeComponent, BadgeVariant } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import { Employee } from '../../../employees/models/employee.model';
import { EmployeeService } from '../../../employees/services/employee.service';
import { DatePickerComponent, DateRangeValue } from '../../../../shared/ui/date-picker/date-picker.component';
import { AttendanceFormModalComponent } from '../../components/attendance-form-modal/attendance-form-modal.component';
import { AttendanceRegularizationModalComponent } from '../../components/attendance-regularization-modal/attendance-regularization-modal.component';
import { AttendanceRegularizationListComponent } from '../../components/attendance-regularization-list/attendance-regularization-list.component';
import {
  Attendance,
  AttendanceRegularization,
  AttendanceStatus,
  AttendanceSummary,
  RegularizationStatus,
} from '../../models/attendance.model';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-attendance-list',
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    DatePickerComponent,
    HasPermissionDirective,
    AttendanceFormModalComponent,
    AttendanceRegularizationModalComponent,
    AttendanceRegularizationListComponent,
  ],
  templateUrl: './attendance-list.component.html',
  styleUrl: './attendance-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceListComponent implements OnInit, OnDestroy {
  private readonly attendanceService = inject(AttendanceService);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  private readonly rbacService = inject(RbacService);

  readonly Permission = Permission;

  private clockIntervalId?: ReturnType<typeof setInterval>;

  readonly liveTime = signal<string>('');
  readonly currentDateFormatted = signal<string>('');

  readonly viewMode = signal<'self' | 'team'>('self');
  readonly myProfile = signal<Employee | null>(null);
  readonly employees = signal<Employee[]>([]);
  readonly selectedEmployeeId = signal<string>('');
  readonly activeSection = signal<'logs' | 'regularizations'>('logs');
  readonly isRegularizationModalOpen = signal<boolean>(false);
  readonly regularizationInitialDate = signal<string>('');
  readonly regularizationInitialCheckIn = signal<string>('');
  readonly regularizationInitialCheckOut = signal<string>('');

  readonly pendingRegularizationsCount = signal<number>(0);
  readonly totalRegularizationsCount = signal<number>(0);

  @ViewChild(AttendanceRegularizationListComponent)
  regularizationListComponent?: AttendanceRegularizationListComponent;

  readonly canViewRegularization = computed(() =>
    this.rbacService.hasPermission(Permission.ATTENDANCE_REGULARIZATION_VIEW)
  );
  readonly canCreateRegularization = computed(() =>
    this.rbacService.hasPermission(Permission.ATTENDANCE_REGULARIZATION_CREATE)
  );
  readonly canApproveRegularization = computed(() =>
    this.rbacService.hasPermission(Permission.ATTENDANCE_REGULARIZATION_APPROVE)
  );
  readonly canRejectRegularization = computed(() =>
    this.rbacService.hasPermission(Permission.ATTENDANCE_REGULARIZATION_REJECT)
  );
  readonly canCancelRegularization = computed(() =>
    this.rbacService.hasPermission(Permission.ATTENDANCE_REGULARIZATION_CANCEL)
  );

  readonly myEmployeeId = computed<string>(
    () => this.authService.currentUser()?.employeeId || ''
  );

  readonly hasPersonalProfile = computed<boolean>(() =>
    Boolean(this.myEmployeeId())
  );

  /**
   * Scope permissions from login response:
   * - ATTENDANCE_ALL_VIEW (or modification permissions): view all employees' attendance
   * - ATTENDANCE_TEAM_VIEW: view direct reports' attendance
   */
  readonly canViewAllAttendance = computed<boolean>(() =>
    this.rbacService.hasAnyPermission([
      Permission.ATTENDANCE_ALL_VIEW,
      Permission.ATTENDANCE_CREATE,
      Permission.ATTENDANCE_UPDATE,
      Permission.ATTENDANCE_DELETE,
    ])
  );

  readonly canViewTeamAttendance = computed<boolean>(() =>
    this.rbacService.hasPermission(Permission.ATTENDANCE_TEAM_VIEW)
  );

  readonly canInspectOtherEmployees = computed<boolean>(
    () => this.canViewAllAttendance() || this.canViewTeamAttendance()
  );

  readonly canViewSummary = computed<boolean>(() =>
    this.rbacService.hasPermission(Permission.ATTENDANCE_SUMMARY_VIEW)
  );

  /**
   * Employees available in the Team / Employee Attendance tab.
   * Excludes the logged-in user's own record (which is managed under "My Attendance").
   */
  readonly manageableEmployees = computed<Employee[]>(() => {
    const all = this.employees();
    const myId = this.myEmployeeId();
    if (this.canViewAllAttendance()) {
      return myId ? all.filter((emp) => emp.id !== myId) : all;
    }
    if (!myId) {
      return [];
    }
    return all.filter((emp) => emp.manager?.id === myId && emp.id !== myId);
  });

  readonly canViewTeamOrOrgTab = computed<boolean>(
    () =>
      this.canInspectOtherEmployees() && this.manageableEmployees().length > 0
  );

  readonly showViewTabs = computed<boolean>(
    () => this.hasPersonalProfile() && this.canViewTeamOrOrgTab()
  );

  readonly teamTabLabel = computed<string>(() =>
    this.canViewAllAttendance() ? 'Employees Attendance' : 'Team Attendance Logs'
  );

  readonly teamRegularizationTabLabel = computed<string>(() =>
    this.canViewAllAttendance()
      ? 'Employee Regularization Requests'
      : 'Team Regularization Requests'
  );

  readonly employeeOptions = computed<SelectOption[]>(() =>
    this.manageableEmployees().map((emp) => ({
      label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`,
      value: emp.id,
    }))
  );

  readonly activeTargetEmployeeId = computed<string>(() =>
    this.viewMode() === 'self'
      ? this.myEmployeeId()
      : this.selectedEmployeeId()
  );

  readonly isViewingSelf = computed<boolean>(
    () =>
      this.viewMode() === 'self' ||
      this.activeTargetEmployeeId() === this.myEmployeeId()
  );

  /**
   * Add / Edit / Delete actions are never shown on own attendance ("My Attendance"),
   * and are shown for specific employees only when the user has the corresponding permission.
   */
  readonly canCreateForTarget = computed<boolean>(
    () =>
      !this.isViewingSelf() &&
      this.rbacService.hasPermission(Permission.ATTENDANCE_CREATE)
  );

  readonly hasRowActions = computed<boolean>(
    () =>
      (!this.isViewingSelf() &&
        this.rbacService.hasAnyPermission([
          Permission.ATTENDANCE_UPDATE,
          Permission.ATTENDANCE_DELETE,
        ])) ||
      (this.isViewingSelf() && this.canCreateRegularization())
  );

  readonly activeTargetEmployee = computed<Employee | null>(() => {
    if (this.viewMode() === 'self') {
      return (
        this.myProfile() ||
        (this.authService.currentUser()?.employee as Employee | undefined) ||
        null
      );
    }
    const id = this.activeTargetEmployeeId();
    return this.employees().find((e) => e.id === id) || null;
  });

  readonly statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Present', value: 'PRESENT' },
    { label: 'Absent', value: 'ABSENT' },
    { label: 'Half Day', value: 'HALF_DAY' },
    { label: 'Leave', value: 'LEAVE' },
    { label: 'Holiday', value: 'HOLIDAY' },
    { label: 'Week Off', value: 'WEEK_OFF' },
  ];

  readonly attendanceRecords = signal<Attendance[]>([]);
  readonly myTodayRecord = signal<Attendance | null>(null);
  readonly targetTodayRecord = signal<Attendance | null>(null);
  readonly summary = signal<AttendanceSummary | null>(null);

  // ── Self Attendance Metrics Computed Signals ───────────────────────────────
  readonly totalWorkHours = computed(() => {
    if (this.summary()?.totalWorkingHours != null) {
      return Number(this.summary()!.totalWorkingHours).toFixed(1);
    }
    const sum = this.attendanceRecords().reduce(
      (acc, r) => acc + (Number(r.workingHours) || 0),
      0
    );
    return sum.toFixed(1);
  });

  readonly presentDaysCount = computed(() => {
    if (this.summary()?.present != null) return this.summary()!.present;
    return this.attendanceRecords().filter(
      (r) => r.status === AttendanceStatus.PRESENT
    ).length;
  });

  readonly absentDaysCount = computed(() => {
    if (this.summary()?.absent != null) return this.summary()!.absent;
    return this.attendanceRecords().filter(
      (r) => r.status === AttendanceStatus.ABSENT
    ).length;
  });

  readonly halfDayOrLeaveCount = computed(() => {
    const s = this.summary();
    if (s) return (s.halfDay || 0) + (s.leave || 0);
    return this.attendanceRecords().filter(
      (r) =>
        r.status === AttendanceStatus.HALF_DAY ||
        r.status === AttendanceStatus.LEAVE
    ).length;
  });

  readonly loading = signal<boolean>(true);
  readonly punching = signal<boolean>(false);
  readonly punchType = signal<'in' | 'out'>('in');

  readonly selectedMonth = signal<string>(
    new Date().toISOString().substring(0, 7)
  );
  readonly statusFilter = signal<string>('ALL');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly sortField = signal<'date' | 'hours' | 'status'>('date');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly currentPage = signal<number>(1);
  readonly totalRecords = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly myTotalRecords = signal<number>(0);

  readonly activeTab = computed<
    'self-logs' | 'team-logs' | 'self-regularizations' | 'team-regularizations'
  >(() => {
    if (this.activeSection() === 'regularizations') {
      return this.viewMode() === 'self'
        ? 'self-regularizations'
        : 'team-regularizations';
    }
    return this.viewMode() === 'self' ? 'self-logs' : 'team-logs';
  });

  readonly isModalOpen = signal<boolean>(false);
  readonly selectedRecord = signal<Attendance | null>(null);

  readonly regularizationStatusFilter = signal<string>('ALL');
  readonly regularizationStatusOptions: SelectOption[] = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Pending Approval', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  onRegularizationStatusChange(value: string): void {
    this.regularizationStatusFilter.set(value);
  }

  readonly hasActiveFilters = computed<boolean>(
    () =>
      this.statusFilter() !== 'ALL' ||
      Boolean(this.fromDate()) ||
      Boolean(this.toDate())
  );

  readonly displayedRecords = computed<Attendance[]>(() => {
    const field = this.sortField();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;

    const list = [...this.attendanceRecords()];

    list.sort((a, b) => {
      if (field === 'date') {
        return (
          (new Date(a.attendanceDate).getTime() -
            new Date(b.attendanceDate).getTime()) *
          dir
        );
      }
      if (field === 'hours') {
        return ((a.workingHours || 0) - (b.workingHours || 0)) * dir;
      }
      return (
        this.formatStatusLabel(a.status).localeCompare(
          this.formatStatusLabel(b.status)
        ) * dir
      );
    });

    return list;
  });

  ngOnInit(): void {
    this.updateClock();
    this.clockIntervalId = setInterval(() => this.updateClock(), 1000);
    this.initializeData();
  }

  ngOnDestroy(): void {
    if (this.clockIntervalId) {
      clearInterval(this.clockIntervalId);
    }
  }

  private updateClock(): void {
    const now = new Date();
    this.liveTime.set(
      now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    );
    this.currentDateFormatted.set(
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
    );
  }

  private initializeData(): void {
    const myEmpId = this.myEmployeeId();
    const sessionEmployee = this.authService.currentUser()?.employee as
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
      this.loadMyTodayRecord(myEmpId);
      this.loadEmployeeAttendance(myEmpId);
    }

    if (this.canInspectOtherEmployees()) {
      this.employeeService.getDirectory().subscribe({
        next: (directory) => {
          this.employees.set(directory);
          const manageable = this.manageableEmployees();
          const defaultTeamEmpId = manageable[0]?.id || '';
          this.selectedEmployeeId.set(defaultTeamEmpId);

          if (!myEmpId && defaultTeamEmpId) {
            this.viewMode.set('team');
            this.loadEmployeeAttendance(defaultTeamEmpId);
          } else if (!myEmpId) {
            this.loading.set(false);
          }
        },
        error: () => {
          if (!myEmpId) {
            this.loading.set(false);
          }
        },
      });
    } else if (!myEmpId) {
      this.loading.set(false);
    }
  }

  setViewMode(mode: 'self' | 'team'): void {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    this.currentPage.set(1);

    const targetId = this.activeTargetEmployeeId();
    if (targetId) {
      this.loadEmployeeAttendance(targetId);
    }
  }

  loadEmployeeAttendance(employeeId: string): void {
    if (!employeeId) return;

    this.loading.set(true);
    const params = {
      page: this.currentPage(),
      limit: 10,
      status:
        this.statusFilter() !== 'ALL'
          ? (this.statusFilter() as AttendanceStatus)
          : undefined,
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
    };

    this.attendanceService.getAttendance(employeeId, params).subscribe({
      next: (res) => {
        this.attendanceRecords.set(res.data);
        this.totalRecords.set(res.total);
        this.totalPages.set(res.totalPages || 1);
        if (employeeId === this.myEmployeeId()) {
          this.myTotalRecords.set(res.total);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });

    this.loadTargetTodayRecord(employeeId);
    if (this.canViewSummary() || employeeId === this.myEmployeeId()) {
      this.loadMonthlySummary(employeeId);
    }
    if (this.canViewRegularization()) {
      this.loadRegularizations(employeeId);
    }
  }

  private loadMyTodayRecord(myEmpId: string): void {
    const today = new Date().toISOString().substring(0, 10);
    this.attendanceService
      .getAttendance(myEmpId, { fromDate: today, toDate: today, limit: 1 })
      .subscribe({
        next: (res) => {
          this.myTodayRecord.set(res.data.length > 0 ? res.data[0] : null);
        },
        error: () => {
          this.myTodayRecord.set(null);
        },
      });
  }

  private loadTargetTodayRecord(employeeId: string): void {
    const today = new Date().toISOString().substring(0, 10);
    this.attendanceService
      .getAttendance(employeeId, { fromDate: today, toDate: today, limit: 1 })
      .subscribe({
        next: (res) => {
          const rec = res.data.length > 0 ? res.data[0] : null;
          this.targetTodayRecord.set(rec);
          if (employeeId === this.myEmployeeId()) {
            this.myTodayRecord.set(rec);
          }
        },
        error: () => {
          this.targetTodayRecord.set(null);
        },
      });
  }

  private loadMonthlySummary(employeeId: string): void {
    const month = this.selectedMonth();
    this.attendanceService.getMonthlySummary(employeeId, month).subscribe({
      next: (sum) => {
        this.summary.set(sum);
      },
      error: () => {
        this.summary.set(null);
      },
    });
  }

  onEmployeeChange(newId: string): void {
    this.selectedEmployeeId.set(newId);
    this.currentPage.set(1);
    this.loadEmployeeAttendance(newId);
    if (this.activeSection() === 'regularizations') {
      setTimeout(() => {
        this.regularizationListComponent?.loadRegularizations();
      });
    }
  }

  onMonthChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.selectedMonth.set(input.value);
      const empId = this.activeTargetEmployeeId();
      if (empId) {
        this.loadMonthlySummary(empId);
      }
    }
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadEmployeeAttendance(empId);
    }
  }

  onDateRangeChange(range: DateRangeValue): void {
    this.fromDate.set(range.fromDate || '');
    this.toDate.set(range.toDate || '');
    this.currentPage.set(1);
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadEmployeeAttendance(empId);
    }
  }

  onFromDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fromDate.set(input.value);
    this.currentPage.set(1);
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadEmployeeAttendance(empId);
    }
  }

  onToDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.toDate.set(input.value);
    this.currentPage.set(1);
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadEmployeeAttendance(empId);
    }
  }

  toggleSort(field: 'date' | 'hours' | 'status'): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set(field === 'date' ? 'desc' : 'asc');
    }
  }

  resetFilters(): void {
    this.statusFilter.set('ALL');
    this.fromDate.set('');
    this.toDate.set('');
    this.currentPage.set(1);
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadEmployeeAttendance(empId);
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadEmployeeAttendance(empId);
    }
  }

  onCheckIn(): void {
    const myEmpId = this.myEmployeeId();
    if (!myEmpId || this.punching()) return;

    this.punching.set(true);
    this.punchType.set('in');

    this.attendanceService.checkIn(myEmpId).subscribe({
      next: (rec) => {
        this.myTodayRecord.set(rec);
        this.punching.set(false);
        if (this.activeTargetEmployeeId() === myEmpId) {
          this.loadEmployeeAttendance(myEmpId);
        }
      },
      error: () => {
        this.punching.set(false);
      },
    });
  }

  onCheckOut(): void {
    const myEmpId = this.myEmployeeId();
    if (!myEmpId || this.punching()) return;

    this.punching.set(true);
    this.punchType.set('out');

    this.attendanceService.checkOut(myEmpId).subscribe({
      next: (rec) => {
        this.myTodayRecord.set(rec);
        this.punching.set(false);
        if (this.activeTargetEmployeeId() === myEmpId) {
          this.loadEmployeeAttendance(myEmpId);
        }
      },
      error: () => {
        this.punching.set(false);
      },
    });
  }

  openAddModal(): void {
    this.selectedRecord.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(record: Attendance): void {
    this.selectedRecord.set(record);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedRecord.set(null);
  }

  onAttendanceSaved(): void {
    const empId = this.activeTargetEmployeeId();
    this.closeModal();
    if (empId) {
      this.loadEmployeeAttendance(empId);
    }
  }

  deleteRecord(record: Attendance): void {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the attendance record for ${new Date(
        record.attendanceDate
      ).toLocaleDateString()}?`
    );
    if (!confirmDelete) return;

    const empId = this.activeTargetEmployeeId();
    this.attendanceService.deleteAttendance(empId, record.id).subscribe({
      next: () => {
        if (empId) {
          this.loadEmployeeAttendance(empId);
        }
      },
    });
  }

  formatTime(isoTime: string | null | undefined): string {
    if (!isoTime) return '—';
    const d = new Date(isoTime);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  getStatusVariant(status: AttendanceStatus): BadgeVariant {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'success';
      case AttendanceStatus.ABSENT:
        return 'error';
      case AttendanceStatus.HALF_DAY:
        return 'warning';
      case AttendanceStatus.LEAVE:
        return 'info';
      case AttendanceStatus.HOLIDAY:
      case AttendanceStatus.WEEK_OFF:
        return 'gray';
      default:
        return 'gray';
    }
  }

  formatStatusLabel(status: AttendanceStatus): string {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'Present';
      case AttendanceStatus.ABSENT:
        return 'Absent';
      case AttendanceStatus.HALF_DAY:
        return 'Half Day';
      case AttendanceStatus.LEAVE:
        return 'Leave';
      case AttendanceStatus.HOLIDAY:
        return 'Holiday';
      case AttendanceStatus.WEEK_OFF:
        return 'Week Off';
      default:
        return status;
    }
  }

  // ── Regularization Handlers ────────────────────────────────────────────────
  onRegularizationCountsChanged(counts: { total: number; pending: number }): void {
    this.totalRegularizationsCount.set(counts.total);
    this.pendingRegularizationsCount.set(counts.pending);
  }

  onRegularizationUpdated(): void {
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadEmployeeAttendance(empId);
      if (this.canViewSummary()) {
        this.loadMonthlySummary(empId);
      }
    }
  }

  loadRegularizations(_employeeId?: string): void {
    this.regularizationListComponent?.loadRegularizations();
  }

  switchSection(section: 'logs' | 'regularizations'): void {
    this.activeSection.set(section);
  }

  switchTab(
    tab: 'self-logs' | 'team-logs' | 'self-regularizations' | 'team-regularizations'
  ): void {
    if (tab === 'self-logs') {
      const modeChanged = this.viewMode() !== 'self';
      const sectionChanged = this.activeSection() !== 'logs';
      this.activeSection.set('logs');
      this.viewMode.set('self');
      this.currentPage.set(1);
      const myId = this.myEmployeeId();
      if ((modeChanged || sectionChanged) && myId) {
        this.loadEmployeeAttendance(myId);
      }
    } else if (tab === 'team-logs') {
      const modeChanged = this.viewMode() !== 'team';
      const sectionChanged = this.activeSection() !== 'logs';
      this.activeSection.set('logs');
      this.viewMode.set('team');
      this.currentPage.set(1);
      const teamId = this.selectedEmployeeId();
      if ((modeChanged || sectionChanged) && teamId) {
        this.loadEmployeeAttendance(teamId);
      }
    } else if (tab === 'self-regularizations') {
      this.activeSection.set('regularizations');
      this.viewMode.set('self');
      setTimeout(() => {
        this.regularizationListComponent?.loadRegularizations();
      });
    } else if (tab === 'team-regularizations') {
      this.activeSection.set('regularizations');
      this.viewMode.set('team');
      setTimeout(() => {
        this.regularizationListComponent?.loadRegularizations();
      });
    }
  }

  openRegularizeModal(
    date?: string,
    checkIn?: string | null,
    checkOut?: string | null
  ): void {
    this.regularizationInitialDate.set(date || '');
    this.regularizationInitialCheckIn.set(checkIn || '');
    this.regularizationInitialCheckOut.set(checkOut || '');
    this.isRegularizationModalOpen.set(true);
  }

  openRegularizeForRecord(record: Attendance): void {
    this.openRegularizeModal(
      record.attendanceDate,
      record.checkIn,
      record.checkOut
    );
  }

  closeRegularizeModal(): void {
    this.isRegularizationModalOpen.set(false);
    this.regularizationInitialDate.set('');
    this.regularizationInitialCheckIn.set('');
    this.regularizationInitialCheckOut.set('');
  }

  onRegularizationSaved(): void {
    const myId = this.myEmployeeId();
    this.closeRegularizeModal();
    if (myId) {
      this.regularizationListComponent?.loadRegularizations();
      if (this.viewMode() === 'self') {
        this.loadEmployeeAttendance(myId);
        if (this.canViewSummary()) {
          this.loadMonthlySummary(myId);
        }
      }
    }
  }
}
