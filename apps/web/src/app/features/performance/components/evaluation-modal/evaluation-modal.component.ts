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
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { Permission } from '../../../../core/models/permission.model';
import { RbacService } from '../../../../core/services/rbac.service';
import {
  CreatePerformanceEvaluationDto,
  PerformanceEvaluation,
  PerformanceEvaluationStatus,
  PerformanceEvaluationType,
  PerformanceGoal,
  UpdatePerformanceEvaluationDto,
} from '../../models/performance.model';
import { PerformanceService } from '../../services/performance.service';

@Component({
  selector: 'app-evaluation-modal',
  imports: [CommonModule, IconComponent],
  templateUrl: './evaluation-modal.component.html',
  styleUrl: './evaluation-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationModalComponent {
  private readonly performanceService = inject(PerformanceService);
  private readonly rbacService = inject(RbacService);

  readonly isOpen = input<boolean>(false);
  readonly goal = input<PerformanceGoal | null>(null);
  readonly employeeId = input.required<string>();
  readonly cycleId = input.required<string>();
  readonly isCurrentUserSelf = input<boolean>(false);

  readonly closeModal = output<void>();
  readonly evaluationUpdated = output<void>();

  readonly loading = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  readonly evaluations = signal<PerformanceEvaluation[]>([]);
  readonly selectedTab = signal<'SELF' | 'MANAGER'>('SELF');

  readonly selectedRating = signal<number>(0);
  readonly evalComments = signal<string>('');

  readonly selfEvaluation = computed(() =>
    this.evaluations().find((e) => e.evaluationType === PerformanceEvaluationType.SELF) || null
  );

  readonly managerEvaluation = computed(() =>
    this.evaluations().find((e) => e.evaluationType === PerformanceEvaluationType.MANAGER) || null
  );

  readonly currentEval = computed(() =>
    this.selectedTab() === 'SELF' ? this.selfEvaluation() : this.managerEvaluation()
  );

  readonly canEditCurrentTab = computed(() => {
    const curr = this.currentEval();
    if (curr?.status === PerformanceEvaluationStatus.SUBMITTED) {
      return false;
    }

    const hasEvalPerm = this.rbacService.hasAnyPermission([
      Permission.PERFORMANCE_EVALUATION_CREATE,
      Permission.PERFORMANCE_EVALUATION_UPDATE,
    ]);
    if (!hasEvalPerm) {
      return false;
    }

    if (this.selectedTab() === 'SELF') {
      return this.isCurrentUserSelf();
    } else {
      return !this.isCurrentUserSelf();
    }
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const g = this.goal();
      const isSelf = this.isCurrentUserSelf();

      if (open && g) {
        this.selectedTab.set(isSelf ? 'SELF' : 'MANAGER');
        this.errorMessage.set('');
        this.successMessage.set('');
        this.loadEvaluations(g.id);
      }
    });

    effect(() => {
      // Whenever selected tab or currentEval changes, sync inputs
      const curr = this.currentEval();
      if (curr) {
        this.selectedRating.set(curr.rating || 0);
        this.evalComments.set(curr.comments || '');
      } else {
        this.selectedRating.set(0);
        this.evalComments.set('');
      }
      this.errorMessage.set('');
    });
  }

  loadEvaluations(goalId: string): void {
    this.loading.set(true);
    this.performanceService
      .getEvaluations(this.employeeId(), this.cycleId(), goalId)
      .subscribe({
        next: (res) => {
          this.evaluations.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to load evaluations for this goal'
          );
        },
      });
  }

  selectTab(tab: 'SELF' | 'MANAGER'): void {
    this.selectedTab.set(tab);
  }

  setRating(rating: number): void {
    if (this.currentEval()?.status === PerformanceEvaluationStatus.SUBMITTED) {
      return;
    }
    this.selectedRating.set(rating);
  }

  onCommentsInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.evalComments.set(target.value);
  }

  getRatingLabel(rating: number): string {
    switch (rating) {
      case 1:
        return 'Unsatisfactory';
      case 2:
        return 'Needs Improvement';
      case 3:
        return 'Meets Expectations';
      case 4:
        return 'Exceeds Expectations';
      case 5:
        return 'Outstanding';
      default:
        return '';
    }
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  saveDraft(): void {
    this.processEvaluation(false);
  }

  submitReview(): void {
    if (this.selectedRating() === 0) {
      this.errorMessage.set('Rating is required before submitting review.');
      return;
    }
    if (!this.evalComments().trim()) {
      this.errorMessage.set('Comments are required before submitting review.');
      return;
    }
    this.processEvaluation(true);
  }

  private processEvaluation(submitAfter: boolean): void {
    const g = this.goal();
    if (!g) return;

    this.submitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const empId = this.employeeId();
    const cycId = this.cycleId();
    const goalId = g.id;
    const evalType = this.selectedTab() === 'SELF'
      ? PerformanceEvaluationType.SELF
      : PerformanceEvaluationType.MANAGER;

    const existing = this.currentEval();

    if (existing) {
      const updateDto: UpdatePerformanceEvaluationDto = {
        rating: this.selectedRating(),
        comments: this.evalComments().trim() || null,
      };

      this.performanceService
        .updateEvaluation(empId, cycId, goalId, existing.id, updateDto)
        .subscribe({
          next: (updated) => {
            if (submitAfter) {
              this.performanceService
                .submitEvaluation(empId, cycId, goalId, updated.id)
                .subscribe({
                  next: () => {
                    this.submitting.set(false);
                    this.successMessage.set('Evaluation submitted successfully!');
                    this.loadEvaluations(goalId);
                    this.evaluationUpdated.emit();
                  },
                  error: (err) => {
                    this.submitting.set(false);
                    this.errorMessage.set(
                      err.error?.message || 'Failed to submit evaluation'
                    );
                  },
                });
            } else {
              this.submitting.set(false);
              this.successMessage.set('Draft saved successfully.');
              this.loadEvaluations(goalId);
              this.evaluationUpdated.emit();
            }
          },
          error: (err) => {
            this.submitting.set(false);
            this.errorMessage.set(
              err.error?.message || 'Failed to update evaluation'
            );
          },
        });
    } else {
      const createDto: CreatePerformanceEvaluationDto = {
        evaluationType: evalType,
        rating: this.selectedRating(),
        comments: this.evalComments().trim() || null,
      };

      this.performanceService
        .createEvaluation(empId, cycId, goalId, createDto)
        .subscribe({
          next: (created) => {
            if (submitAfter) {
              this.performanceService
                .submitEvaluation(empId, cycId, goalId, created.id)
                .subscribe({
                  next: () => {
                    this.submitting.set(false);
                    this.successMessage.set('Evaluation submitted successfully!');
                    this.loadEvaluations(goalId);
                    this.evaluationUpdated.emit();
                  },
                  error: (err) => {
                    this.submitting.set(false);
                    this.errorMessage.set(
                      err.error?.message || 'Failed to submit evaluation'
                    );
                  },
                });
            } else {
              this.submitting.set(false);
              this.successMessage.set('Draft saved successfully.');
              this.loadEvaluations(goalId);
              this.evaluationUpdated.emit();
            }
          },
          error: (err) => {
            this.submitting.set(false);
            this.errorMessage.set(
              err.error?.message || 'Failed to create evaluation'
            );
          },
        });
    }
  }
}
