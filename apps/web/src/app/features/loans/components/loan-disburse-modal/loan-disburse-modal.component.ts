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
  selector: 'app-loan-disburse-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './loan-disburse-modal.component.html',
  styleUrl: './loan-disburse-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanDisburseModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loanService = inject(LoanService);

  readonly isOpen = input<boolean>(false);
  readonly loan = input<CompanyLoan | null>(null);
  readonly closeModal = output<void>();
  readonly loanDisbursed = output<CompanyLoan>();

  readonly submitting = signal<boolean>(false);
  readonly uploadingFile = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly uploadedReceiptUrl = signal<string>('');
  readonly selectedFileName = signal<string>('');

  readonly form: FormGroup = this.fb.group({
    disbursedAt: [new Date().toISOString().slice(0, 10), [Validators.required]],
    disbursementReference: ['', [Validators.required, Validators.minLength(3)]],
    notes: [''],
  });

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      const file = inputEl.files[0];
      this.selectedFileName.set(file.name);
      this.uploadingFile.set(true);
      this.errorMessage.set('');

      this.loanService.uploadReceipt(file).subscribe({
        next: (res) => {
          this.uploadingFile.set(false);
          this.uploadedReceiptUrl.set(res.fileUrl);
        },
        error: (err) => {
          this.uploadingFile.set(false);
          const msg = err?.error?.message || 'Receipt upload failed.';
          this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      });
    }
  }

  onCancel(): void {
    this.form.reset({
      disbursedAt: new Date().toISOString().slice(0, 10),
      disbursementReference: '',
      notes: '',
    });
    this.uploadedReceiptUrl.set('');
    this.selectedFileName.set('');
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
      disbursedAt: formVal.disbursedAt,
      disbursementReference: formVal.disbursementReference.trim(),
      disbursementReceiptUrl: this.uploadedReceiptUrl() || undefined,
      notes: formVal.notes ? formVal.notes.trim() : undefined,
    };

    this.loanService.disburseLoan(currentLoan.id, payload).subscribe({
      next: (updatedLoan) => {
        this.submitting.set(false);
        this.loanDisbursed.emit(updatedLoan);
        this.onCancel();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg =
          err?.error?.message ||
          'Failed to record disbursement. Please try again.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
