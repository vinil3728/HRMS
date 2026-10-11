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
  CreatePerformanceGoalDto,
  PerformanceGoal,
  PerformanceGoalStatus,
  UpdatePerformanceGoalDto,
} from '../../models/performance.model';
import { PerformanceService } from '../../services/performance.service';

@Component({
  selector: 'app-goal-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './goal-form-modal.component.html',
  styleUrl: './goal-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly performanceService = inject(PerformanceService);

  readonly isOpen = input<boolean>(false);
  readonly goal = input<PerformanceGoal | null>(null);
  readonly employeeId = input.required<string>();
  readonly cycleId = input.required<string>();
  readonly currentTotalWeight = input<number>(0);

  readonly closeModal = output<void>();
  readonly saved = output<PerformanceGoal>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.goal());

  readonly goalStatusOptions: SelectOption[] = [
    { value: 'NOT_STARTED', label: 'Not Started' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  readonly form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    target: [''],
    weight: [20, [Validators.required, Validators.min(1), Validators.max(100)]],
    progress: [0, [Validators.min(0), Validators.max(100)]],
    status: [PerformanceGoalStatus.NOT_STARTED],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const g = this.goal();
      const open = this.isOpen();

      if (open && g) {
        const startStr = g.startDate
          ? new Date(g.startDate).toISOString().substring(0, 10)
          : '';
        const endStr = g.endDate
          ? new Date(g.endDate).toISOString().substring(0, 10)
          : '';

        this.form.patchValue({
          title: g.title,
          description: g.description || '',
          target: g.target || '',
          weight: Number(g.weight),
          progress: Number(g.progress),
          status: g.status,
          startDate: startStr,
          endDate: endStr,
        });
        this.errorMessage.set('');
      } else if (open) {
        const today = new Date();
        const startStr = today.toISOString().substring(0, 10);
        const end = new Date(today);
        end.setMonth(end.getMonth() + 6);
        const endStr = end.toISOString().substring(0, 10);

        this.form.reset({
          title: '',
          description: '',
          target: '',
          weight: 25,
          progress: 0,
          status: PerformanceGoalStatus.NOT_STARTED,
          startDate: startStr,
          endDate: endStr,
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
    const empId = this.employeeId();
    const cycId = this.cycleId();
    const currentGoal = this.goal();

    if (currentGoal) {
      const dto: UpdatePerformanceGoalDto = {
        title: val.title.trim(),
        description: val.description?.trim() || null,
        target: val.target?.trim() || null,
        weight: Number(val.weight),
        progress: Number(val.progress),
        status: val.status,
        startDate: val.startDate,
        endDate: val.endDate,
      };

      this.performanceService
        .updateGoal(empId, cycId, currentGoal.id, dto)
        .subscribe({
          next: (updated) => {
            this.submitting.set(false);
            this.saved.emit(updated);
          },
          error: (err) => {
            this.submitting.set(false);
            this.errorMessage.set(
              err.error?.message || 'Failed to update performance goal'
            );
          },
        });
    } else {
      const dto: CreatePerformanceGoalDto = {
        title: val.title.trim(),
        description: val.description?.trim() || undefined,
        target: val.target?.trim() || undefined,
        weight: Number(val.weight),
        startDate: val.startDate,
        endDate: val.endDate,
      };

      this.performanceService.createGoal(empId, cycId, dto).subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.saved.emit(created);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to create performance goal'
          );
        },
      });
    }
  }
}
