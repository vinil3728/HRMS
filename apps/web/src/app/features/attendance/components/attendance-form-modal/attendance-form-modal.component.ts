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
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import { DatePickerComponent } from '../../../../shared/ui/date-picker/date-picker.component';
import {
  Attendance,
  AttendanceStatus,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from '../../models/attendance.model';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-attendance-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent, DatePickerComponent],
  templateUrl: './attendance-form-modal.component.html',
  styleUrl: './attendance-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly attendanceService = inject(AttendanceService);

  readonly isOpen = input<boolean>(false);
  readonly attendance = input<Attendance | null>(null);
  readonly employeeId = input.required<string>();

  readonly statusOptions: SelectOption[] = [
    { label: 'Present', value: 'PRESENT' },
    { label: 'Absent', value: 'ABSENT' },
    { label: 'Half Day', value: 'HALF_DAY' },
    { label: 'Leave', value: 'LEAVE' },
    { label: 'Holiday', value: 'HOLIDAY' },
    { label: 'Week Off', value: 'WEEK_OFF' },
  ];

  readonly closeModal = output<void>();
  readonly saved = output<Attendance>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.attendance());

  readonly form: FormGroup = this.fb.group({
    attendanceDate: [
      new Date().toISOString().substring(0, 10),
      [Validators.required],
    ],
    status: [AttendanceStatus.PRESENT, [Validators.required]],
    checkInTime: [''],
    checkOutTime: [''],
    remarks: [''],
  });

  constructor() {
    effect(() => {
      const att = this.attendance();
      const open = this.isOpen();

      if (open && att) {
        const dateStr = att.attendanceDate
          ? new Date(att.attendanceDate).toISOString().substring(0, 10)
          : '';

        let inTime = '';
        if (att.checkIn) {
          const d = new Date(att.checkIn);
          inTime = d.toTimeString().substring(0, 5);
        }

        let outTime = '';
        if (att.checkOut) {
          const d = new Date(att.checkOut);
          outTime = d.toTimeString().substring(0, 5);
        }

        this.form.patchValue({
          attendanceDate: dateStr,
          status: att.status,
          checkInTime: inTime,
          checkOutTime: outTime,
          remarks: att.remarks || '',
        });
        this.errorMessage.set('');
      } else if (open) {
        this.form.reset({
          attendanceDate: new Date().toISOString().substring(0, 10),
          status: AttendanceStatus.PRESENT,
          checkInTime: '',
          checkOutTime: '',
          remarks: '',
        });
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
    const dateStr = val.attendanceDate;

    let checkInIso: string | undefined = undefined;
    let checkOutIso: string | undefined = undefined;

    if (val.checkInTime) {
      checkInIso = new Date(`${dateStr}T${val.checkInTime}:00`).toISOString();
    }

    if (val.checkOutTime) {
      checkOutIso = new Date(`${dateStr}T${val.checkOutTime}:00`).toISOString();
    }

    if (checkInIso && checkOutIso && new Date(checkOutIso) <= new Date(checkInIso)) {
      this.errorMessage.set('Check-out time must be after check-in time');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const empId = this.employeeId();
    const currentAtt = this.attendance();

    if (currentAtt) {
      const dto: UpdateAttendanceDto = {
        attendanceDate: dateStr,
        checkIn: checkInIso || null,
        checkOut: checkOutIso || null,
        status: val.status,
        remarks: val.remarks?.trim() || null,
      };

      this.attendanceService
        .updateAttendance(empId, currentAtt.id, dto)
        .subscribe({
          next: (savedRecord) => {
            this.submitting.set(false);
            this.saved.emit(savedRecord);
          },
          error: (err) => {
            this.submitting.set(false);
            this.errorMessage.set(
              err.error?.message || 'Failed to update attendance record'
            );
          },
        });
    } else {
      const dto: CreateAttendanceDto = {
        attendanceDate: dateStr,
        checkIn: checkInIso,
        checkOut: checkOutIso,
        status: val.status,
        remarks: val.remarks?.trim() || undefined,
      };

      this.attendanceService.createAttendance(empId, dto).subscribe({
        next: (savedRecord) => {
          this.submitting.set(false);
          this.saved.emit(savedRecord);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to record attendance entry'
          );
        },
      });
    }
  }
}
