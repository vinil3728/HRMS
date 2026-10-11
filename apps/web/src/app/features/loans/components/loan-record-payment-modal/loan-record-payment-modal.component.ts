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
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { DatePickerComponent } from '../../../../shared/ui/date-picker/date-picker.component';
import { CompanyLoan, LoanRepayment, RepaymentMode } from '../../models/loan.model';
import { LoanService } from '../../services/loan.service';

@Component({
  selector: 'app-loan-record-payment-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent, DatePickerComponent],
  templateUrl: './loan-record-payment-modal.component.html',
  styleUrl: './loan-record-payment-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanRecordPaymentModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loanService = inject(LoanService);

  readonly paymentModeOptions: SelectOption[] = [
    { value: RepaymentMode.CASH, label: 'Cash Deposit' },
    { value: RepaymentMode.BANK_TRANSFER, label: 'Direct Bank Transfer (NEFT/UPI)' },
    { value: RepaymentMode.SALARY_DEDUCTION, label: 'Salary Deduction Adjustment' },
  ];

  readonly isOpen = input<boolean>(false);
  readonly loan = input<CompanyLoan | null>(null);
  readonly repayment = input<LoanRepayment | null>(null);
  readonly closeModal = output<void>();
  readonly paymentRecorded = output<CompanyLoan>();

  readonly submitting = signal<boolean>(false);
  readonly uploadingFile = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly uploadedReceiptUrl = signal<string>('');
  readonly selectedFileName = signal<string>('');

  readonly form: FormGroup = this.fb.group({
    amountPaid: [null, [Validators.required, Validators.min(1)]],
    paymentMode: [RepaymentMode.CASH, [Validators.required]],
    paidAt: [new Date().toISOString().slice(0, 10), [Validators.required]],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const rep = this.repayment();
      if (rep) {
        const remainingDue = Math.max(0, Number(rep.amountDue) - Number(rep.amountPaid || 0));
        this.form.patchValue({
          amountPaid: remainingDue,
          paymentMode: rep.paymentMode === RepaymentMode.SALARY_DEDUCTION ? RepaymentMode.CASH : rep.paymentMode,
          paidAt: new Date().toISOString().slice(0, 10),
          notes: '',
        });
        this.uploadedReceiptUrl.set('');
        this.selectedFileName.set('');
      }
    });
  }

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
    this.errorMessage.set('');
    this.uploadedReceiptUrl.set('');
    this.selectedFileName.set('');
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const currentLoan = this.loan();
    const currentRepayment = this.repayment();
    if (!currentLoan || !currentRepayment) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const formVal = this.form.value;
    const payload = {
      amountPaid: Number(formVal.amountPaid),
      paymentMode: formVal.paymentMode,
      paidAt: formVal.paidAt,
      receiptUrl: this.uploadedReceiptUrl() || undefined,
      notes: formVal.notes ? formVal.notes.trim() : undefined,
    };

    this.loanService.recordPayment(currentLoan.id, currentRepayment.id, payload).subscribe({
      next: (updatedLoan) => {
        this.submitting.set(false);
        this.paymentRecorded.emit(updatedLoan);
        this.onCancel();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg =
          err?.error?.message || 'Failed to record payment. Please try again.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
