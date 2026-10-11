import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  CreatePerformanceSummaryDto,
  PerformanceCycle,
  PerformanceCycleStatus,
  PerformanceEvaluationType,
  PerformanceGoal,
  PerformanceSummary,
} from '../../models/performance.model';
import { PerformanceService } from '../../services/performance.service';

@Component({
  selector: 'app-summary-modal',
  imports: [CommonModule, IconComponent],
  templateUrl: './summary-modal.component.html',
  styleUrl: './summary-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryModalComponent {
  private readonly performanceService = inject(PerformanceService);

  readonly isOpen = input<boolean>(false);
  readonly employeeId = input.required<string>();
  readonly employeeName = input<string>('');
  readonly cycle = input<PerformanceCycle | null>(null);
  readonly goals = input<PerformanceGoal[]>([]);
  readonly summary = input<PerformanceSummary | null>(null);
  readonly canFinalize = input<boolean>(false);

  readonly closeModal = output<void>();
  readonly finalized = output<PerformanceSummary>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly comments = signal<string>('');

  readonly isFinalized = computed(() => !!this.summary());

  readonly totalWeight = computed(() => {
    return this.goals().reduce(
      (sum, g) => sum + (Number(g.weight) || 0),
      0
    );
  });

  readonly isWeightValid = computed(() => {
    return Math.abs(this.totalWeight() - 100) < 0.01;
  });

  readonly goalsCount = computed(() => this.goals().length);

  readonly projectedRating = computed(() => {
    const list = this.goals();
    if (list.length === 0) return 0;

    let totalScore = 0;
    let countedWeight = 0;

    for (const g of list) {
      const mgrEval = g.evaluations?.find(
        (e) => e.evaluationType === PerformanceEvaluationType.MANAGER
      );
      if (mgrEval && mgrEval.rating) {
        totalScore += mgrEval.rating * (Number(g.weight) || 0);
        countedWeight += Number(g.weight) || 0;
      }
    }

    if (countedWeight === 0) return 0;
    return totalScore / 100;
  });

  readonly isReadyToFinalize = computed(() => {
    const c = this.cycle();
    return (
      c?.status === PerformanceCycleStatus.CLOSED &&
      this.isWeightValid() &&
      this.goalsCount() > 0
    );
  });

  onCommentsInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.comments.set(target.value);
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  finalize(): void {
    const c = this.cycle();
    if (!c || !this.isReadyToFinalize() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const dto: CreatePerformanceSummaryDto = {
      comments: this.comments().trim() || null,
    };

    this.performanceService
      .finalizeSummary(this.employeeId(), c.id, dto)
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.finalized.emit(res);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to finalize performance appraisal'
          );
        },
      });
  }
}
