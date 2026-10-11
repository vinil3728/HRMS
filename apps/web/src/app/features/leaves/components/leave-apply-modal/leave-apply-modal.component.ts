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
import { DatePickerComponent } from '../../../../shared/ui/date-picker/date-picker.component';
import {
  CreateLeaveDto,
  Leave,
  LeaveBalance,
  LeaveType,
  UpdateLeaveDto,
} from '../../models/leave.model';
import { LeaveService } from '../../services/leave.service';

@Component({
  selector: 'app-leave-apply-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent, DatePickerComponent],
  templateUrl: './leave-apply-modal.component.html',
  styleUrl: './leave-apply-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveApplyModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly leaveService = inject(LeaveService);

  readonly isOpen = input<boolean>(false);
  readonly leave = input<Leave | null>(null);
  readonly employeeId = input.required<string>();
  readonly balances = input<LeaveBalance[]>([]);

  readonly closeModal = output<void>();
  readonly saved = output<Leave>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.leave());

  readonly leaveTypeOptions: SelectOption[] = [
    { value: 'CASUAL', label: 'Casual Leave (CL)' },
    { value: 'SICK', label: 'Sick Leave (SL)' },
    { value: 'EARNED', label: 'Earned / Privileged Leave (EL)' },
    { value: 'UNPAID', label: 'Leave Without Pay (Unpaid)' },
    { value: 'MATERNITY', label: 'Maternity Leave' },
    { value: 'PATERNITY', label: 'Paternity Leave' },
    { value: 'OTHER', label: 'Other Leave' },
  ];

  readonly form: FormGroup = this.fb.group({
    leaveType: [LeaveType.CASUAL, [Validators.required]],
    startDate: [
      new Date().toISOString().substring(0, 10),
      [Validators.required],
    ],
    endDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    reason: ['', [Validators.required, Validators.minLength(5)]],
  });

  readonly currentLeaveType = signal<LeaveType>(LeaveType.CASUAL);
  readonly currentStartDate = signal<string>(
    new Date().toISOString().substring(0, 10)
  );
  readonly currentEndDate = signal<string>(
    new Date().toISOString().substring(0, 10)
  );

  readonly selectedBalance = computed(() => {
    const type = this.currentLeaveType();
    return this.balances().find((b) => b.leaveType === type) || null;
  });

  readonly computedDays = computed(() => {
    const startStr = this.currentStartDate();
    const endStr = this.currentEndDate();
    if (!startStr || !endStr) return 0;

    const start = new Date(startStr);
    const end = new Date(endStr);
    if (end < start) return 0;

    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  });

  constructor() {
    this.form.get('leaveType')?.valueChanges.subscribe((v) => {
      this.currentLeaveType.set(v);
    });
    this.form.get('startDate')?.valueChanges.subscribe((v) => {
      this.currentStartDate.set(v);
    });
    this.form.get('endDate')?.valueChanges.subscribe((v) => {
      this.currentEndDate.set(v);
    });

    effect(() => {
      const l = this.leave();
      const open = this.isOpen();

      if (open && l) {
        const startStr = l.startDate
          ? new Date(l.startDate).toISOString().substring(0, 10)
          : '';
        const endStr = l.endDate
          ? new Date(l.endDate).toISOString().substring(0, 10)
          : '';

        this.form.patchValue({
          leaveType: l.leaveType,
          startDate: startStr,
          endDate: endStr,
          reason: l.reason || '',
        });
        this.currentLeaveType.set(l.leaveType);
        this.currentStartDate.set(startStr);
        this.currentEndDate.set(endStr);
        this.errorMessage.set('');
      } else if (open) {
        const todayStr = new Date().toISOString().substring(0, 10);
        this.form.reset({
          leaveType: LeaveType.CASUAL,
          startDate: todayStr,
          endDate: todayStr,
          reason: '',
        });
        this.currentLeaveType.set(LeaveType.CASUAL);
        this.currentStartDate.set(todayStr);
        this.currentEndDate.set(todayStr);
        this.errorMessage.set('');
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const start = new Date(val.startDate);
    const end = new Date(val.endDate);

    if (end < start) {
      this.errorMessage.set('End date cannot be earlier than start date');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const empId = this.employeeId();
    const currentLeave = this.leave();

    if (currentLeave) {
      const dto: UpdateLeaveDto = {
        leaveType: val.leaveType,
        startDate: val.startDate,
        endDate: val.endDate,
        reason: val.reason.trim(),
      };

      this.leaveService.updateLeave(empId, currentLeave.id, dto).subscribe({
        next: (savedLeave) => {
          this.submitting.set(false);
          this.saved.emit(savedLeave);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to update leave request'
          );
        },
      });
    } else {
      const dto: CreateLeaveDto = {
        leaveType: val.leaveType,
        startDate: val.startDate,
        endDate: val.endDate,
        reason: val.reason.trim(),
      };

      this.leaveService.applyLeave(empId, dto).subscribe({
        next: (savedLeave) => {
          this.submitting.set(false);
          this.saved.emit(savedLeave);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to submit leave request'
          );
        },
      });
    }
  }
}
