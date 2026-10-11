import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
  CreateLeaveBalanceDto,
  Leave,
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
  readonly actionType = input<'REJECT' | 'ALLOCATE_BALANCE'>('REJECT');
  readonly leave = input<Leave | null>(null);
  readonly employeeId = input.required<string>();
  readonly employeeOptions = input<SelectOption[]>([]);

  readonly closeModal = output<void>();
  readonly actionCompleted = output<void>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly leaveTypeOptions: SelectOption[] = [
    { value: 'CASUAL', label: 'Casual Leave (CL)' },
    { value: 'SICK', label: 'Sick Leave (SL)' },
    { value: 'EARNED', label: 'Earned Leave (EL)' },
    { value: 'MATERNITY', label: 'Maternity Leave' },
    { value: 'PATERNITY', label: 'Paternity Leave' },
    { value: 'OTHER', label: 'Other Leave' },
  ];

  readonly rejectForm: FormGroup = this.fb.group({
    rejectionReason: ['', [Validators.required, Validators.minLength(5)]],
  });

  readonly balanceForm: FormGroup = this.fb.group({
    employeeId: ['', [Validators.required]],
    leaveType: [LeaveType.CASUAL, [Validators.required]],
    year: [new Date().getFullYear(), [Validators.required]],
    totalDays: [12, [Validators.required, Validators.min(0.5)]],
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
        this.balanceForm.reset({
          employeeId: defaultEmp,
          leaveType: LeaveType.CASUAL,
          year: new Date().getFullYear(),
          totalDays: 12,
        });
      }
    });
  }

  isRejectInvalid(field: string): boolean {
    const c = this.rejectForm.get(field);
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

  onBalanceSubmit(): void {
    if (this.balanceForm.invalid || this.submitting()) {
      this.balanceForm.markAllAsTouched();
      return;
    }

    const val = this.balanceForm.value;
    const empId = val.employeeId || this.employeeId();
    if (!empId) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const dto: CreateLeaveBalanceDto = {
      leaveType: val.leaveType,
      year: Number(val.year),
      totalDays: Number(val.totalDays),
    };

    this.leaveService.createLeaveBalance(empId, dto).subscribe({
      next: () => {
        this.submitting.set(false);
        this.actionCompleted.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to allocate leave balance'
        );
      },
    });
  }
}
