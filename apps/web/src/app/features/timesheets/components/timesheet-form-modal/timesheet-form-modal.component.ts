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
  CreateTimesheetDto,
  Timesheet,
  UpdateTimesheetDto,
} from '../../models/timesheet.model';
import { TimesheetService } from '../../services/timesheet.service';

@Component({
  selector: 'app-timesheet-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './timesheet-form-modal.component.html',
  styleUrl: './timesheet-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimesheetFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly timesheetService = inject(TimesheetService);

  readonly isOpen = input<boolean>(false);
  readonly timesheet = input<Timesheet | null>(null);
  readonly employeeId = input<string>('');

  readonly closeModal = output<void>();
  readonly saved = output<Timesheet>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.timesheet());
  readonly todayString = new Date().toISOString().substring(0, 10);

  readonly form: FormGroup = this.fb.group({
    workDate: [this.todayString, [Validators.required]],
    hours: [8.0, [Validators.required, Validators.min(0.25), Validators.max(24)]],
    project: ['', [Validators.required]],
    description: ['', [Validators.required]],
    submitDirectly: [false],
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const existing = this.timesheet();

      if (open) {
        this.errorMessage.set('');
        if (existing) {
          const formattedDate = existing.workDate
            ? new Date(existing.workDate).toISOString().substring(0, 10)
            : this.todayString;

          this.form.patchValue({
            workDate: formattedDate,
            hours: Number(existing.hours),
            project: existing.project,
            description: existing.description,
            submitDirectly: false,
          });
        } else {
          this.form.reset({
            workDate: this.todayString,
            hours: 8.0,
            project: '',
            description: '',
            submitDirectly: false,
          });
        }
      } else {
        this.errorMessage.set('');
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
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const empId = this.employeeId();
    if (!empId) {
      this.errorMessage.set('No target employee specified for timesheet log.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const val = this.form.value;
    const existing = this.timesheet();

    if (existing) {
      const updateDto: UpdateTimesheetDto = {
        workDate: val.workDate,
        hours: Number(val.hours),
        project: val.project.trim(),
        description: val.description.trim(),
      };

      this.timesheetService.updateTimesheet(empId, existing.id, updateDto).subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.saved.emit(res);
        },
        error: (err: { error?: { message?: string } }) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to update timesheet log entry.'
          );
        },
      });
    } else {
      const createDto: CreateTimesheetDto = {
        workDate: val.workDate,
        hours: Number(val.hours),
        project: val.project.trim(),
        description: val.description.trim(),
      };

      this.timesheetService.createTimesheet(empId, createDto).subscribe({
        next: (created) => {
          if (val.submitDirectly) {
            this.timesheetService.submitTimesheet(empId, created.id).subscribe({
              next: (submitted) => {
                this.submitting.set(false);
                this.saved.emit(submitted);
              },
              error: () => {
                // If submit fails, return the created draft
                this.submitting.set(false);
                this.saved.emit(created);
              },
            });
          } else {
            this.submitting.set(false);
            this.saved.emit(created);
          }
        },
        error: (err: { error?: { message?: string } }) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to record timesheet entry.'
          );
        },
      });
    }
  }
}
