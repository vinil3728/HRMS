import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  Policy,
  PolicyAcknowledgement,
} from '../../models/policy.model';
import { PolicyService } from '../../services/policy.service';

@Component({
  selector: 'app-policy-view-modal',
  imports: [CommonModule, DatePipe, IconComponent],
  templateUrl: './policy-view-modal.component.html',
  styleUrl: './policy-view-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyViewModalComponent {
  private readonly policyService = inject(PolicyService);

  readonly isOpen = input<boolean>(false);
  readonly policy = input<Policy | null>(null);
  readonly employeeId = input<string>('');

  readonly closeModal = output<void>();
  readonly acknowledged = output<PolicyAcknowledgement>();

  readonly checkingStatus = signal<boolean>(false);
  readonly acknowledging = signal<boolean>(false);
  readonly isAcknowledged = signal<boolean>(false);
  readonly acknowledgedAt = signal<string | null>(null);
  readonly agreementChecked = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const p = this.policy();
      const empId = this.employeeId();

      if (open && p && empId && p.status === 'PUBLISHED') {
        this.checkingStatus.set(true);
        this.agreementChecked.set(false);
        this.errorMessage.set('');

        this.policyService.getEmployeePolicyStatus(empId, p.id).subscribe({
          next: (status) => {
            this.isAcknowledged.set(status.acknowledged);
            this.acknowledgedAt.set(status.acknowledgedAt);
            this.checkingStatus.set(false);
          },
          error: () => {
            this.isAcknowledged.set(false);
            this.acknowledgedAt.set(null);
            this.checkingStatus.set(false);
          },
        });
      } else {
        this.agreementChecked.set(false);
        this.errorMessage.set('');
        this.isAcknowledged.set(false);
        this.acknowledgedAt.set(null);
      }
    });
  }

  onAgreementToggle(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.agreementChecked.set(inputEl.checked);
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  submitAcknowledgement(): void {
    const p = this.policy();
    const empId = this.employeeId();
    if (!p || !empId || !this.agreementChecked() || this.acknowledging()) {
      return;
    }

    this.acknowledging.set(true);
    this.errorMessage.set('');

    this.policyService.acknowledgePolicy(empId, p.id).subscribe({
      next: (ack) => {
        this.acknowledging.set(false);
        this.isAcknowledged.set(true);
        this.acknowledgedAt.set(ack.acknowledgedAt);
        this.acknowledged.emit(ack);
      },
      error: (err) => {
        this.acknowledging.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to acknowledge policy compliance'
        );
      },
    });
  }
}
