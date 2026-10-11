import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Permission } from '../../../../core/models/permission.model';
import { RbacService } from '../../../../core/services/rbac.service';
import { BadgeComponent, BadgeVariant } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import {
  AttendanceRegularization,
  RegularizationStatus,
} from '../../models/attendance.model';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-attendance-regularization-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    BadgeComponent,
  ],
  templateUrl: './attendance-regularization-list.component.html',
  styleUrl: './attendance-regularization-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceRegularizationListComponent {
  private readonly attendanceService = inject(AttendanceService);
  private readonly rbacService = inject(RbacService);

  readonly employeeId = input<string>('');
  readonly isViewingSelf = input<boolean>(false);

  readonly requestNew = output<void>();
  readonly countsChanged = output<{ total: number; pending: number }>();
  readonly regularizationUpdated = output<void>();

  readonly Permission = Permission;
  readonly regularizations = signal<AttendanceRegularization[]>([]);
  readonly loading = signal<boolean>(false);
  readonly statusFilter = input<string>('ALL');

  // Strictly dynamic RBAC - zero role hardcoding
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

  readonly statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Pending Approval', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  readonly filteredRegularizations = computed(() => {
    const list = this.regularizations();
    const filter = this.statusFilter();
    if (filter === 'ALL') return list;
    return list.filter((r) => r.status === filter);
  });

  readonly pendingCount = computed(
    () =>
      this.regularizations().filter(
        (r) => r.status === RegularizationStatus.PENDING
      ).length
  );

  constructor() {
    effect(() => {
      const id = this.employeeId();
      if (id) {
        untracked(() => this.loadRegularizations());
      } else {
        this.regularizations.set([]);
        this.countsChanged.emit({ total: 0, pending: 0 });
      }
    });
  }

  loadRegularizations(): void {
    const empId = this.employeeId();
    if (!empId) return;

    this.loading.set(true);
    this.attendanceService
      .getRegularizations(empId, {
        status:
          this.statusFilter() !== 'ALL'
            ? (this.statusFilter() as RegularizationStatus)
            : undefined,
      })
      .subscribe({
        next: (res) => {
          const data = res.data || [];
          this.regularizations.set(data);
          this.loading.set(false);
          const pending = data.filter(
            (r) => r.status === RegularizationStatus.PENDING
          ).length;
          this.countsChanged.emit({ total: data.length, pending });
        },
        error: () => {
          this.regularizations.set([]);
          this.loading.set(false);
          this.countsChanged.emit({ total: 0, pending: 0 });
        },
      });
  }

  onRequestNew(): void {
    this.requestNew.emit();
  }

  onApprove(item: AttendanceRegularization): void {
    const notes = window.prompt(
      `Approve regularization for ${item.attendanceDate}? Optional supervisor notes:`,
      'Approved by supervisor'
    );
    if (notes === null) return;

    const empId = this.employeeId();
    this.attendanceService
      .approveRegularization(empId, item.id, notes)
      .subscribe({
        next: () => {
          this.loadRegularizations();
          this.regularizationUpdated.emit();
        },
        error: (err) => {
          alert(err.error?.message || 'Failed to approve regularization.');
        },
      });
  }

  onReject(item: AttendanceRegularization): void {
    const reason = window.prompt(
      `Reject regularization for ${item.attendanceDate}. Please provide reason:`
    );
    if (!reason || !reason.trim()) return;

    const empId = this.employeeId();
    this.attendanceService
      .rejectRegularization(empId, item.id, reason.trim())
      .subscribe({
        next: () => {
          this.loadRegularizations();
          this.regularizationUpdated.emit();
        },
        error: (err) => {
          alert(err.error?.message || 'Failed to reject regularization.');
        },
      });
  }

  onCancel(item: AttendanceRegularization): void {
    const confirmed = window.confirm(
      `Cancel pending regularization request for ${item.attendanceDate}?`
    );
    if (!confirmed) return;

    const empId = this.employeeId();
    this.attendanceService.cancelRegularization(empId, item.id).subscribe({
      next: () => {
        this.loadRegularizations();
        this.regularizationUpdated.emit();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to cancel regularization.');
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

  getStatusVariant(status: RegularizationStatus): BadgeVariant {
    switch (status) {
      case RegularizationStatus.APPROVED:
        return 'success';
      case RegularizationStatus.PENDING:
        return 'warning';
      case RegularizationStatus.REJECTED:
        return 'error';
      case RegularizationStatus.CANCELLED:
        return 'gray';
      default:
        return 'gray';
    }
  }
}
