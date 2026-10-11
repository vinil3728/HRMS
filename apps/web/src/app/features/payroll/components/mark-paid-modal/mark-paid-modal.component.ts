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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { MarkPaidDto, PaymentMode, PayrollRun, Payslip } from '../../models/payroll.model';
import { PayrollService } from '../../services/payroll.service';

@Component({
  selector: 'app-mark-paid-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './mark-paid-modal.component.html',
  styleUrl: './mark-paid-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkPaidModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payrollService = inject(PayrollService);

  readonly isOpen = input<boolean>(false);
  readonly run = input<PayrollRun | null>(null);
  readonly payslip = input<Payslip | null>(null);

  readonly closeModal = output<void>();
  readonly paid = output<{ run?: PayrollRun; payslip?: Payslip }>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly paymentModeOptions: SelectOption[] = [
    { value: 'BANK_TRANSFER', label: 'Direct Bank Transfer (NEFT / RTGS)' },
    { value: 'UPI', label: 'UPI Transaction' },
    { value: 'CHEQUE', label: 'Bank Cheque' },
    { value: 'CASH', label: 'Cash' },
  ];

  private getTodayString(): string {
    return new Date().toISOString().substring(0, 10);
  }

  readonly form: FormGroup = this.fb.group({
    paymentMode: [PaymentMode.BANK_TRANSFER, [Validators.required]],
    paymentReference: [''],
    paymentDate: [this.getTodayString(), [Validators.required]],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      if (open) {
        this.errorMessage.set('');
        this.form.patchValue({
          paymentMode: PaymentMode.BANK_TRANSFER,
          paymentReference: '',
          paymentDate: this.getTodayString(),
          notes: '',
        });
      } else {
        this.errorMessage.set('');
        this.form.reset();
      }
    });
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const currentRun = this.run();
    const currentSlip = this.payslip();

    if (!currentRun && !currentSlip) {
      this.errorMessage.set('No target batch or payslip selected.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const val = this.form.value;
    const dto: MarkPaidDto = {
      paymentMode: val.paymentMode,
      paymentReference: val.paymentReference?.trim() || undefined,
      paidAt: val.paymentDate,
    };

    if (currentRun) {
      this.payrollService.markRunAsPaid(currentRun.id, dto).subscribe({
        next: (updatedRun) => {
          this.submitting.set(false);
          this.paid.emit({ run: updatedRun });
        },
        error: (err: { error?: { message?: string } }) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to mark payroll batch cycle as paid.'
          );
        },
      });
    } else if (currentSlip) {
      this.payrollService.markPayslipAsPaid(currentSlip.id, dto).subscribe({
        next: (updatedSlip) => {
          this.submitting.set(false);
          this.paid.emit({ payslip: updatedSlip });
        },
        error: (err: { error?: { message?: string } }) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to mark payslip as paid.'
          );
        },
      });
    }
  }
}
