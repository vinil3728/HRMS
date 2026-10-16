import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import {
  AdjustLeaveBalanceDto,
  BatchCreateLeaveBalanceDto,
  Leave,
  LeaveBalance,
  LeaveType,
} from '../../models/leave.model';
import { LeaveService } from '../../services/leave.service';

@Component({
  selector: 'app-leave-action-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './leave-action-modal.component.html',
  styleUrl: './leave-action-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveActionModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly leaveService = inject(LeaveService);

  readonly isOpen = input<boolean>(false);
  readonly actionType = input<'REJECT' | 'ALLOCATE_BALANCE' | 'ADJUST_BALANCE'>('REJECT');
  readonly leave = input<Leave | null>(null);
  readonly employeeId = input.required<string>();
  readonly employeeOptions = input<SelectOption[]>([]);
  readonly balances = input<LeaveBalance[]>([]);

  readonly closeModal = output<void>();
  readonly actionCompleted = output<void>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly loadingBalances = signal<boolean>(false);

  // Dynamic balances loaded for selected employee in adjust mode
  readonly dynamicAdjustBalances = signal<LeaveBalance[]>([]);

  readonly adjustBalanceOptions = computed<SelectOption[]>(() => {
    const activeList =
      this.dynamicAdjustBalances().length > 0
        ? this.dynamicAdjustBalances()
        : this.balances();

    return activeList.map((b) => ({
      value: b.id,
      label: `${b.leaveType} (${b.year}) — Available: ${b.availableDays} / ${b.totalDays} days`,
    }));
  });

  readonly rejectForm: FormGroup = this.fb.group({
    rejectionReason: ['', [Validators.required, Validators.minLength(5)]],
  });

  // Batch allocation form: assigns all leave categories for a single user in one go!
  readonly batchBalanceForm: FormGroup = this.fb.group({
    employeeId: ['', [Validators.required]],
    year: [new Date().getFullYear(), [Validators.required]],
    casualDays: [12, [Validators.required, Validators.min(0)]],
    sickDays: [10, [Validators.required, Validators.min(0)]],
    earnedDays: [15, [Validators.required, Validators.min(0)]],
    maternityDays: [0, [Validators.required, Validators.min(0)]],
    paternityDays: [0, [Validators.required, Validators.min(0)]],
    otherDays: [5, [Validators.required, Validators.min(0)]],
  });

  readonly adjustForm: FormGroup = this.fb.group({
    employeeId: ['', [Validators.required]],
    balanceId: ['', [Validators.required]],
    adjustmentDays: [1, [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(5)]],
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.errorMessage.set('');
        this.rejectForm.reset({ rejectionReason: '' });

        const defaultEmp =
          this.employeeId() ||
          (this.employeeOptions()[0]?.value as string) ||
          '';

        this.batchBalanceForm.reset({
          employeeId: defaultEmp,
          year: new Date().getFullYear(),
          casualDays: 12,
          sickDays: 10,
          earnedDays: 15,
          maternityDays: 0,
          paternityDays: 0,
          otherDays: 5,
        });

        this.adjustForm.reset({
          employeeId: defaultEmp,
          balanceId: '',
          adjustmentDays: 1,
          reason: '',
        });

        if (defaultEmp) {
          this.loadEmployeeBalancesForAdjust(defaultEmp);
        }
      }
    });
  }

  onAdjustEmployeeChange(selectedEmpId: string): void {
    this.adjustForm.patchValue({ employeeId: selectedEmpId, balanceId: '' });
    if (selectedEmpId) {
      this.loadEmployeeBalancesForAdjust(selectedEmpId);
    } else {
      this.dynamicAdjustBalances.set([]);
    }
  }

  loadEmployeeBalancesForAdjust(empId: string): void {
    this.loadingBalances.set(true);
    const year = Number(this.adjustForm.value.year) || new Date().getFullYear();
    this.leaveService.getLeaveBalances(empId, year).subscribe({
      next: (bals) => {
        this.dynamicAdjustBalances.set(bals);
        if (bals.length > 0) {
          this.adjustForm.patchValue({ balanceId: bals[0].id });
        }
        this.loadingBalances.set(false);
      },
      error: () => {
        this.dynamicAdjustBalances.set([]);
        this.loadingBalances.set(false);
      },
    });
  }

  isRejectInvalid(field: string): boolean {
    const c = this.rejectForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  isAdjustInvalid(field: string): boolean {
    const c = this.adjustForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onRejectSubmit(): void {
    if (this.rejectForm.invalid || this.submitting()) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    const targetLeave = this.leave();
    const empId = this.employeeId();
    if (!targetLeave || !empId) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const reason = this.rejectForm.value.rejectionReason.trim();
    this.leaveService.rejectLeave(empId, targetLeave.id, reason).subscribe({
      next: () => {
        this.submitting.set(false);
        this.actionCompleted.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to reject leave request'
        );
      },
    });
  }

  onBatchBalanceSubmit(): void {
    if (this.batchBalanceForm.invalid || this.submitting()) {
      this.batchBalanceForm.markAllAsTouched();
      return;
    }

    const val = this.batchBalanceForm.value;
    const empId = val.employeeId;
    if (!empId) {
      this.errorMessage.set('Employee is required for quota allocation');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const dto: BatchCreateLeaveBalanceDto = {
      year: Number(val.year),
      balances: [
        { leaveType: LeaveType.CASUAL, totalDays: Number(val.casualDays) },
        { leaveType: LeaveType.SICK, totalDays: Number(val.sickDays) },
        { leaveType: LeaveType.EARNED, totalDays: Number(val.earnedDays) },
        { leaveType: LeaveType.MATERNITY, totalDays: Number(val.maternityDays) },
        { leaveType: LeaveType.PATERNITY, totalDays: Number(val.paternityDays) },
        { leaveType: LeaveType.OTHER, totalDays: Number(val.otherDays) },
      ],
    };

    this.leaveService.createBatchLeaveBalances(empId, dto).subscribe({
      next: () => {
        this.submitting.set(false);
        this.actionCompleted.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to allocate leave balances'
        );
      },
    });
  }

  onAdjustSubmit(): void {
    if (this.adjustForm.invalid || this.submitting()) {
      this.adjustForm.markAllAsTouched();
      return;
    }

    const val = this.adjustForm.value;
    const empId = val.employeeId;
    if (!empId) {
      this.errorMessage.set('Employee is required to adjust balance');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const dto: AdjustLeaveBalanceDto = {
      adjustmentDays: Number(val.adjustmentDays),
      reason: val.reason.trim(),
    };

    this.leaveService.adjustLeaveBalance(empId, val.balanceId, dto).subscribe({
      next: () => {
        this.submitting.set(false);
        this.actionCompleted.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to adjust leave balance'
        );
      },
    });
  }
}
