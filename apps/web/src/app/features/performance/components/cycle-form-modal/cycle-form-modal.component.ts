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
  CreatePerformanceCycleDto,
  PerformanceCycle,
  PerformanceCycleStatus,
  UpdatePerformanceCycleDto,
} from '../../models/performance.model';
import { PerformanceService } from '../../services/performance.service';

@Component({
  selector: 'app-cycle-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './cycle-form-modal.component.html',
  styleUrl: './cycle-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CycleFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly performanceService = inject(PerformanceService);

  readonly isOpen = input<boolean>(false);
  readonly cycle = input<PerformanceCycle | null>(null);

  readonly closeModal = output<void>();
  readonly saved = output<PerformanceCycle>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.cycle());

  readonly cycleStatusOptions: SelectOption[] = [
    { value: 'DRAFT', label: 'DRAFT (Initial setup, goals can be drafted)' },
    { value: 'OPEN', label: 'OPEN (Active appraisal & reviews)' },
    { value: 'CLOSED', label: 'CLOSED (Completed, ready for final summary)' },
  ];

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    status: [PerformanceCycleStatus.DRAFT],
  });

  constructor() {
    effect(() => {
      const c = this.cycle();
      const open = this.isOpen();

      if (open && c) {
        const startStr = c.startDate
          ? new Date(c.startDate).toISOString().substring(0, 10)
          : '';
        const endStr = c.endDate
          ? new Date(c.endDate).toISOString().substring(0, 10)
          : '';

        this.form.patchValue({
          name: c.name,
          startDate: startStr,
          endDate: endStr,
          status: c.status,
        });
        this.errorMessage.set('');
      } else if (open) {
        const today = new Date();
        const startStr = today.toISOString().substring(0, 10);
        const nextYear = new Date(today);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const endStr = nextYear.toISOString().substring(0, 10);

        this.form.reset({
          name: '',
          startDate: startStr,
          endDate: endStr,
          status: PerformanceCycleStatus.DRAFT,
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

    this.submitting.set(true);
    this.errorMessage.set('');

    const val = this.form.value;
    const currentCycle = this.cycle();

    if (currentCycle) {
      const dto: UpdatePerformanceCycleDto = {
        name: val.name.trim(),
        startDate: val.startDate,
        endDate: val.endDate,
        status: val.status,
      };

      this.performanceService.updateCycle(currentCycle.id, dto).subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.saved.emit(updated);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to update appraisal cycle'
          );
        },
      });
    } else {
      const dto: CreatePerformanceCycleDto = {
        name: val.name.trim(),
        startDate: val.startDate,
        endDate: val.endDate,
      };

      this.performanceService.createCycle(dto).subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.saved.emit(created);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to create appraisal cycle'
          );
        },
      });
    }
  }
}
