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
import { SelectComponent } from '../../../../shared/ui/select/select.component';
import { CompanyLoan, LoanType } from '../../models/loan.model';
import { LoanService } from '../../services/loan.service';

@Component({
  selector: 'app-loan-apply-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './loan-apply-modal.component.html',
  styleUrl: './loan-apply-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanApplyModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loanService = inject(LoanService);

  readonly isOpen = input<boolean>(false);
  readonly closeModal = output<void>();
  readonly loanApplied = output<CompanyLoan>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly loanTypes = [
    { value: LoanType.PERSONAL, label: 'Personal Loan' },
    { value: LoanType.EMERGENCY, label: 'Emergency Loan' },
    { value: LoanType.MEDICAL, label: 'Medical Assistance' },
    { value: LoanType.EDUCATION, label: 'Education Support' },
    { value: LoanType.HOME_ADVANCE, label: 'Home Advance' },
    { value: LoanType.OTHER, label: 'Other Purpose' },
  ];

  readonly form: FormGroup = this.fb.group({
    loanType: [LoanType.PERSONAL, [Validators.required]],
    amount: [null, [Validators.required, Validators.min(500)]],
    tenureMonths: [6, [Validators.required, Validators.min(1), Validators.max(60)]],
    purpose: ['', [Validators.required, Validators.minLength(5)]],
    notes: [''],
  });

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  onCancel(): void {
    this.form.reset({
      loanType: LoanType.PERSONAL,
      amount: null,
      tenureMonths: 6,
      purpose: '',
      notes: '',
    });
    this.errorMessage.set('');
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const formVal = this.form.value;
    const payload = {
      loanType: formVal.loanType,
      amount: Number(formVal.amount),
      tenureMonths: Number(formVal.tenureMonths),
      purpose: formVal.purpose.trim(),
      notes: formVal.notes ? formVal.notes.trim() : undefined,
    };

    this.loanService.applyLoan(payload).subscribe({
      next: (createdLoan) => {
        this.submitting.set(false);
        this.loanApplied.emit(createdLoan);
        this.onCancel();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg =
          err?.error?.message ||
          'Failed to submit loan application. Please try again.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
