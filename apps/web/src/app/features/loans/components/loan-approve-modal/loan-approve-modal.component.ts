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
import { CompanyLoan } from '../../models/loan.model';
import { LoanService } from '../../services/loan.service';

@Component({
  selector: 'app-loan-approve-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './loan-approve-modal.component.html',
  styleUrl: './loan-approve-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanApproveModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loanService = inject(LoanService);

  readonly isOpen = input<boolean>(false);
  readonly loan = input<CompanyLoan | null>(null);
  readonly closeModal = output<void>();
  readonly loanApproved = output<CompanyLoan>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly form: FormGroup = this.fb.group({
    approvedAmount: [null, [Validators.required, Validators.min(500)]],
    tenureMonths: [null, [Validators.required, Validators.min(1), Validators.max(60)]],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const currentLoan = this.loan();
      if (currentLoan) {
        this.form.patchValue({
          approvedAmount: currentLoan.approvedAmount || currentLoan.amount,
          tenureMonths: currentLoan.tenureMonths,
          notes: '',
        });
      }
    });
  }

  onCancel(): void {
    this.errorMessage.set('');
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const currentLoan = this.loan();
    if (!currentLoan) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const formVal = this.form.value;
    const payload = {
      approvedAmount: Number(formVal.approvedAmount),
      tenureMonths: Number(formVal.tenureMonths),
      notes: formVal.notes ? formVal.notes.trim() : undefined,
    };

    this.loanService.approveLoan(currentLoan.id, payload).subscribe({
      next: (updatedLoan) => {
        this.submitting.set(false);
        this.loanApproved.emit(updatedLoan);
        this.onCancel();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg =
          err?.error?.message || 'Failed to approve loan. Please try again.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
