import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
  selector: 'app-loan-reject-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './loan-reject-modal.component.html',
  styleUrl: './loan-reject-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanRejectModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loanService = inject(LoanService);

  readonly isOpen = input<boolean>(false);
  readonly loan = input<CompanyLoan | null>(null);
  readonly closeModal = output<void>();
  readonly loanRejected = output<CompanyLoan>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly form: FormGroup = this.fb.group({
    rejectionReason: ['', [Validators.required, Validators.minLength(5)]],
  });

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

    const currentLoan = this.loan();
    if (!currentLoan) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const reason = this.form.value.rejectionReason.trim();

    this.loanService.rejectLoan(currentLoan.id, { rejectionReason: reason }).subscribe({
      next: (updatedLoan) => {
        this.submitting.set(false);
        this.loanRejected.emit(updatedLoan);
        this.onCancel();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg =
          err?.error?.message || 'Failed to reject loan. Please try again.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
