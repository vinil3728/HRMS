import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Permission } from '../../../../core/models/permission.model';
import { AuthService } from '../../../../core/services/auth.service';
import { RbacService } from '../../../../core/services/rbac.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent, IconName } from '../../../../shared/ui/icon/icon.component';
import {
  Attendance,
  AttendanceSummary,
} from '../../../attendance/models/attendance.model';
import { AttendanceService } from '../../../attendance/services/attendance.service';
import { Employee } from '../../../employees/models/employee.model';
import { EmployeeService } from '../../../employees/services/employee.service';
import { Leave, LeaveBalance } from '../../../leaves/models/leave.model';
import { LeaveService } from '../../../leaves/services/leave.service';
import {
  Policy,
  PolicyAcknowledgement,
  PolicyStatus,
} from '../../../policies/models/policy.model';
import { PolicyService } from '../../../policies/services/policy.service';

import { HolidayService } from '../../../../core/services/holiday.service';
import { CompanyHoliday, UpcomingHoliday } from '../../../../core/models/holiday.model';

interface QuickShortcut {
  label: string;
  subtitle: string;
  route: string;
  icon: IconName;
  colorClass: string;
  permission?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterModule,
    HasPermissionDirective,
    IconComponent,
    AvatarComponent,
    BadgeComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly rbacService = inject(RbacService);
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  readonly currentTime = signal<Date>(new Date());
  private readonly employeeService = inject(EmployeeService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly leaveService = inject(LeaveService);
  private readonly policyService = inject(PolicyService);
  private readonly holidayService = inject(HolidayService);

  readonly Permission = Permission;
  readonly todayDate = new Date();
  readonly currentYear = this.todayDate.getFullYear();
  readonly currentMonthStr = `${this.currentYear}-${String(
    this.todayDate.getMonth() + 1
  ).padStart(2, '0')}`;
  readonly todayIso = `${this.currentMonthStr}-${String(
    this.todayDate.getDate()
  ).padStart(2, '0')}`;

  readonly myProfile = signal<Employee | null>(null);
  readonly recentAttendance = signal<Attendance[]>([]);
  readonly attendanceSummary = signal<AttendanceSummary | null>(null);
  readonly leaveBalances = signal<LeaveBalance[]>([]);
  readonly recentLeaves = signal<Leave[]>([]);
  readonly publishedPolicies = signal<Policy[]>([]);
  readonly myAcknowledgements = signal<PolicyAcknowledgement[]>([]);
  readonly upcomingHolidays = signal<UpcomingHoliday[]>([]);
  readonly isTodayHoliday = signal<CompanyHoliday | null>(null);

  readonly isCheckingInOut = signal<boolean>(false);
  readonly actionBanner = signal<string | null>(null);
  readonly errorBanner = signal<string | null>(null);

  private readonly allShortcuts: QuickShortcut[] = [
    {
      label: 'My Profile',
      subtitle: 'Personal details, bank & documents',
      route: '/my-profile',
      icon: 'users',
      colorClass: 'sc-blue',
    },
    {
      label: 'Reimbursements',
      subtitle: 'Submit and track expense claims',
      route: '/reimbursements',
      icon: 'receipt',
      colorClass: 'sc-blue',
      permission: Permission.REIMBURSEMENT_VIEW,
    },
    {
      label: 'Attendance',
      subtitle: 'Check in, check out & attendance logs',
      route: '/attendance',
      icon: 'calendar',
      colorClass: 'sc-blue',
      permission: Permission.ATTENDANCE_VIEW,
    },
    {
      label: 'Performance',
      subtitle: 'Goals and performance reviews',
      route: '/performance',
      icon: 'trending-up',
      colorClass: 'sc-blue',
      permission: Permission.PERFORMANCE_CYCLE_VIEW,
    },
    {
      label: 'Leave Management',
      subtitle: 'Apply for leave & view balances',
      route: '/leaves',
      icon: 'archive',
      colorClass: 'sc-blue',
      permission: Permission.LEAVE_VIEW,
    },
    {
      label: 'Timesheets',
      subtitle: 'Record and submit work hours',
      route: '/timesheets',
      icon: 'clock',
      colorClass: 'sc-blue',
      permission: Permission.TIMESHEET_VIEW,
    },
    {
      label: 'Payroll & Payslips',
      subtitle: 'Salary details and payslips',
      route: '/payroll',
      icon: 'dollar',
      colorClass: 'sc-blue',
      permission: Permission.PAYROLL_VIEW,
    },
    {
      label: 'Company Policies',
      subtitle: 'Read and acknowledge policies',
      route: '/policies',
      icon: 'file-text',
      colorClass: 'sc-blue',
      permission: Permission.POLICY_VIEW,
    },
  ];

  readonly visibleShortcuts = computed(() =>
    this.allShortcuts.filter(
      (s) => !s.permission || this.rbacService.hasPermission(s.permission)
    )
  );

  readonly displayName = computed(() => {
    const profile = this.myProfile();
    if (profile?.firstName) {
      return `${profile.firstName} ${profile.lastName}`.trim();
    }
    return this.authService.currentUser()?.username || 'Team Member';
  });

  readonly todayRecord = computed(() => {
    return (
      this.recentAttendance().find((a) =>
        String(a.attendanceDate).startsWith(this.todayIso)
      ) || null
    );
  });

  readonly totalAvailableLeave = computed(() => {
    return this.leaveBalances().reduce(
      (sum, b) => sum + (Number(b.availableDays) || 0),
      0
    );
  });

  readonly pendingLeaveCount = computed(() => {
    return this.recentLeaves().filter((l) => l.status === 'PENDING').length;
  });

  readonly pendingPolicies = computed(() => {
    const ackSet = new Set(this.myAcknowledgements().map((a) => a.policy?.id));
    return this.publishedPolicies().filter(
      (p) => p.status === PolicyStatus.PUBLISHED && !ackSet.has(p.id)
    );
  });

  readonly currentTimeFormatted = computed(() => {
    const now = this.currentTime();
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  });

  readonly elapsedTimeFormatted = computed(() => {
    const record = this.todayRecord();
    if (!record?.checkIn || record.checkOut) {
      return null;
    }
    const checkInDate = this.parseCheckTime(record.checkIn);
    if (!checkInDate) return null;

    const now = this.currentTime();
    const diffMs = Math.max(0, now.getTime() - checkInDate.getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  });

  readonly totalWorkedFormatted = computed(() => {
    const record = this.todayRecord();
    if (!record?.checkOut) {
      return null;
    }
    if (record.checkIn) {
      const start = this.parseCheckTime(record.checkIn);
      const end = this.parseCheckTime(record.checkOut);
      if (start && end && end.getTime() > start.getTime()) {
        const totalSecs = Math.floor((end.getTime() - start.getTime()) / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    }
    if (record.workingHours != null) {
      const hrs = Math.floor(record.workingHours);
      const mins = Math.round((record.workingHours - hrs) * 60);
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
    }
    return null;
  });

  private parseCheckTime(val: string | null | undefined): Date | null {
    if (!val) return null;
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    const match = val.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const parsed = new Date();
      parsed.setHours(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3] || '0', 10), 0);
      return parsed;
    }
    return null;
  }

  ngOnInit(): void {
    this.startDigitalTimer();
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  private startDigitalTimer(): void {
    this.currentTime.set(new Date());
    this.timerIntervalId = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  loadDashboardData(): void {
    if (this.rbacService.hasPermission(Permission.HOLIDAY_VIEW)) {
      this.holidayService
        .getUpcomingHolidays(4)
        .pipe(catchError(() => of([])))
        .subscribe((holidays) => {
          this.upcomingHolidays.set(holidays);
          const match = holidays.find((h) => h.isToday);
          this.isTodayHoliday.set(match || null);
        });
    }

    const empId = this.authService.currentUser()?.employeeId;

    this.employeeService
      .getMyProfile()
      .pipe(catchError(() => of(null)))
      .subscribe((prof) => {
        if (prof) this.myProfile.set(prof);
      });

    if (!empId) return;

    if (this.rbacService.hasPermission(Permission.ATTENDANCE_VIEW)) {
      this.attendanceService
        .getAttendance(empId, { page: 1, limit: 5 })
        .pipe(catchError(() => of({ data: [], total: 0, page: 1, limit: 5, totalPages: 0 })))
        .subscribe((res) => this.recentAttendance.set(res.data || []));
    }

    if (this.rbacService.hasPermission(Permission.ATTENDANCE_SUMMARY_VIEW)) {
      this.attendanceService
        .getMonthlySummary(empId, this.currentMonthStr)
        .pipe(catchError(() => of(null)))
        .subscribe((sum) => this.attendanceSummary.set(sum));
    }

    if (this.rbacService.hasPermission(Permission.LEAVE_BALANCE_VIEW)) {
      this.leaveService
        .getLeaveBalances(empId, this.currentYear)
        .pipe(catchError(() => of([])))
        .subscribe((bals) => this.leaveBalances.set(bals || []));
    }

    if (this.rbacService.hasPermission(Permission.LEAVE_VIEW)) {
      this.leaveService
        .getLeaves(empId, { page: 1, limit: 4 })
        .pipe(catchError(() => of({ data: [], total: 0, page: 1, limit: 4, totalPages: 0 })))
        .subscribe((res) => this.recentLeaves.set(res.data || []));
    }

    if (this.rbacService.hasPermission(Permission.POLICY_VIEW)) {
      this.policyService
        .getPolicies(PolicyStatus.PUBLISHED)
        .pipe(catchError(() => of([])))
        .subscribe((pols) => this.publishedPolicies.set(pols || []));

      if (
        this.rbacService.hasPermission(Permission.POLICY_ACKNOWLEDGEMENT_VIEW)
      ) {
        this.policyService
          .getEmployeeAcknowledgements(empId)
          .pipe(catchError(() => of([])))
          .subscribe((acks) => this.myAcknowledgements.set(acks || []));
      }
    }
  }

  onQuickCheckIn(): void {
    const empId = this.authService.currentUser()?.employeeId;
    if (!empId) return;

    this.isCheckingInOut.set(true);
    this.errorBanner.set(null);
    this.attendanceService.checkIn(empId).subscribe({
      next: () => {
        this.isCheckingInOut.set(false);
        this.actionBanner.set('Checked in successfully for today.');
        this.loadDashboardData();
      },
      error: (err) => {
        this.isCheckingInOut.set(false);
        this.errorBanner.set(
          err?.error?.message || 'Unable to check in right now.'
        );
      },
    });
  }

  onQuickCheckOut(): void {
    const empId = this.authService.currentUser()?.employeeId;
    if (!empId) return;

    this.isCheckingInOut.set(true);
    this.errorBanner.set(null);
    this.attendanceService.checkOut(empId).subscribe({
      next: () => {
        this.isCheckingInOut.set(false);
        this.actionBanner.set('Checked out successfully for today.');
        this.loadDashboardData();
      },
      error: (err) => {
        this.isCheckingInOut.set(false);
        this.errorBanner.set(
          err?.error?.message || 'Unable to check out right now.'
        );
      },
    });
  }
}
