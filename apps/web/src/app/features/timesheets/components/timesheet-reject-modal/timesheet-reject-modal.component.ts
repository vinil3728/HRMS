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
import { Timesheet } from '../../models/timesheet.model';
import { TimesheetService } from '../../services/timesheet.service';

@Component({
  selector: 'app-timesheet-reject-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './timesheet-reject-modal.component.html',
  styleUrl: './timesheet-reject-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimesheetRejectModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly timesheetService = inject(TimesheetService);

  readonly isOpen = input<boolean>(false);
  readonly timesheet = input<Timesheet | null>(null);
  readonly employeeId = input<string>('');

  readonly closeModal = output<void>();
  readonly rejected = output<Timesheet>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly form: FormGroup = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(5)]],
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      if (open) {
        this.errorMessage.set('');
        this.form.reset({ reason: '' });
      } else {
        this.errorMessage.set('');
        this.form.reset();
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    const item = this.timesheet();
    const empId = this.employeeId();

    if (!item || !empId || this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const reason = this.form.value.reason.trim();

    this.timesheetService.rejectTimesheet(empId, item.id, reason).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.rejected.emit(res);
      },
      error: (err: { error?: { message?: string } }) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to reject timesheet entry.'
        );
      },
    });
  }
}
