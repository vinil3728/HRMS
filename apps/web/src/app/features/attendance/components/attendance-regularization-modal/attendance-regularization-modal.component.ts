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
import { AttendanceRegularization } from '../../models/attendance.model';
import { AttendanceService } from '../../services/attendance.service';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { DatePickerComponent } from '../../../../shared/ui/date-picker/date-picker.component';

@Component({
  selector: 'app-attendance-regularization-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent, DatePickerComponent],
  templateUrl: './attendance-regularization-modal.component.html',
  styleUrl: './attendance-regularization-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceRegularizationModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly attendanceService = inject(AttendanceService);

  readonly isOpen = input<boolean>(false);
  readonly employeeId = input<string>('');
  readonly initialDate = input<string>('');
  readonly initialCheckIn = input<string>('');
  readonly initialCheckOut = input<string>('');

  readonly closeModal = output<void>();
  readonly saved = output<AttendanceRegularization>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly reasonCategoryOptions: SelectOption[] = [
    { label: 'Forgot to punch out before leaving', value: 'Forgot to punch out before leaving' },
    { label: 'Forgot to punch in upon arrival', value: 'Forgot to punch in upon arrival' },
    { label: 'Official on-duty / Client visit', value: 'Official on-duty / Client visit' },
    { label: 'Biometric / Network device offline', value: 'Biometric / Network device offline' },
    { label: 'Remote / Work from home connectivity issue', value: 'Remote / Work from home connectivity issue' },
    { label: 'Other reason', value: 'Other' },
  ];

  readonly form: FormGroup = this.fb.group({
    attendanceDate: ['', [Validators.required]],
    requestedCheckIn: ['09:30'],
    requestedCheckOut: ['18:30'],
    reasonCategory: ['Forgot to punch out before leaving', [Validators.required]],
    reasonNotes: [''],
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        const date = this.initialDate() || new Date().toISOString().substring(0, 10);
        let checkInTime = '09:30';
        let checkOutTime = '18:30';

        if (this.initialCheckIn()) {
          const d = new Date(this.initialCheckIn());
          if (!isNaN(d.getTime())) {
            checkInTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }
        }
        if (this.initialCheckOut()) {
          const d = new Date(this.initialCheckOut());
          if (!isNaN(d.getTime())) {
            checkOutTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }
        }

        this.form.patchValue({
          attendanceDate: date,
          requestedCheckIn: checkInTime,
          requestedCheckOut: checkOutTime,
          reasonCategory: 'Forgot to punch out before leaving',
          reasonNotes: '',
        });
        this.errorMessage.set('');
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onCancel(): void {
    this.form.reset();
    this.errorMessage.set('');
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const empId = this.employeeId();
    if (!empId) {
      this.errorMessage.set('Employee ID is missing.');
      return;
    }

    const val = this.form.value;
    const fullReason =
      val.reasonCategory === 'Other'
        ? (val.reasonNotes?.trim() || 'Other reason')
        : `${val.reasonCategory}${val.reasonNotes?.trim() ? ` — ${val.reasonNotes.trim()}` : ''}`;

    this.submitting.set(true);
    this.errorMessage.set('');

    this.attendanceService
      .createRegularization(empId, {
        attendanceDate: val.attendanceDate,
        requestedCheckIn: val.requestedCheckIn || undefined,
        requestedCheckOut: val.requestedCheckOut || undefined,
        reason: fullReason,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.saved.emit(res);
          this.closeModal.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message ||
              'Failed to submit regularization request. Please verify and try again.'
          );
        },
      });
  }
}
