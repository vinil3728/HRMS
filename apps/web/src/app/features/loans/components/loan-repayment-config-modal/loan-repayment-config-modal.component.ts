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
import { CompanyLoan, RepaymentMode } from '../../models/loan.model';
import { LoanService } from '../../services/loan.service';

@Component({
  selector: 'app-loan-repayment-config-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './loan-repayment-config-modal.component.html',
  styleUrl: './loan-repayment-config-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanRepaymentConfigModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loanService = inject(LoanService);

  readonly isOpen = input<boolean>(false);
  readonly loan = input<CompanyLoan | null>(null);
  readonly closeModal = output<void>();
  readonly repaymentConfigured = output<CompanyLoan>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly repaymentModes = [
    {
      value: RepaymentMode.SALARY_DEDUCTION,
      label: '100% Salary Deduction',
      desc: 'Full installment automatically deducted during monthly payroll',
    },
    {
      value: RepaymentMode.CASH,
      label: '100% Cash / Bank Transfer',
      desc: 'Employee deposits cash or transfers funds directly each month',
    },
    {
      value: RepaymentMode.SPLIT,
      label: 'Split Payment (Cash + Salary Deduction)',
      desc: 'Custom split, e.g. 50% via cash and 50% deducted from salary',
    },
  ];

  readonly form: FormGroup = this.fb.group({
    repaymentMode: [RepaymentMode.SALARY_DEDUCTION, [Validators.required]],
    cashAmount: [0, [Validators.min(0)]],
    salaryDeductionAmount: [0, [Validators.min(0)]],
    repaymentStartDate: ['', [Validators.required]],
    tenureMonths: [6, [Validators.required, Validators.min(1), Validators.max(60)]],
    notes: [''],
  });

  readonly principalAmount = computed(() => {
    const l = this.loan();
    if (!l) return 0;
    return Number(l.approvedAmount || l.amount || 0);
  });

  constructor() {
    effect(() => {
      const currentLoan = this.loan();
      if (currentLoan) {
        const principal = Number(currentLoan.approvedAmount || currentLoan.amount);
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        const defaultStartDate = nextMonth.toISOString().slice(0, 10);

        const mode = currentLoan.repaymentMode || RepaymentMode.SALARY_DEDUCTION;
        let cash = 0;
        let salary = principal;

        if (mode === RepaymentMode.SPLIT) {
          cash = currentLoan.cashAmount || Math.round(principal / 2);
          salary = currentLoan.salaryDeductionAmount || (principal - cash);
        } else if (mode === RepaymentMode.CASH || mode === RepaymentMode.BANK_TRANSFER) {
          cash = principal;
          salary = 0;
        }

        this.form.patchValue({
          repaymentMode: mode,
          cashAmount: cash,
          salaryDeductionAmount: salary,
          repaymentStartDate: currentLoan.repaymentStartDate
            ? new Date(currentLoan.repaymentStartDate).toISOString().slice(0, 10)
            : defaultStartDate,
          tenureMonths: currentLoan.tenureMonths || 6,
          notes: currentLoan.notes || '',
        });
      }
    });
  }

  isSplitMode(): boolean {
    return this.form.get('repaymentMode')?.value === RepaymentMode.SPLIT;
  }

  onModeChange(mode: RepaymentMode): void {
    this.form.patchValue({ repaymentMode: mode });
    const principal = this.principalAmount();
    if (mode === RepaymentMode.SPLIT) {
      const half = Math.round(principal / 2);
      this.form.patchValue({
        cashAmount: half,
        salaryDeductionAmount: principal - half,
      });
    } else if (mode === RepaymentMode.SALARY_DEDUCTION) {
      this.form.patchValue({
        cashAmount: 0,
        salaryDeductionAmount: principal,
      });
    } else {
      this.form.patchValue({
        cashAmount: principal,
        salaryDeductionAmount: 0,
      });
    }
  }

  applySplitPreset(percentCash: number): void {
    const principal = this.principalAmount();
    const cash = Math.round((principal * percentCash) / 100);
    const salary = principal - cash;
    this.form.patchValue({
      cashAmount: cash,
      salaryDeductionAmount: salary,
    });
  }

  onCashAmountChange(cashVal: number): void {
    const principal = this.principalAmount();
    const salary = Math.max(0, principal - Number(cashVal));
    this.form.patchValue({ salaryDeductionAmount: salary }, { emitEvent: false });
  }

  onSalaryAmountChange(salaryVal: number): void {
    const principal = this.principalAmount();
    const cash = Math.max(0, principal - Number(salaryVal));
    this.form.patchValue({ cashAmount: cash }, { emitEvent: false });
  }

  getMonthlyEstimate(): number {
    const principal = this.principalAmount();
    const tenure = Number(this.form.get('tenureMonths')?.value) || 1;
    return Number((principal / tenure).toFixed(2));
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
      repaymentMode: formVal.repaymentMode,
      cashAmount: Number(formVal.cashAmount || 0),
      salaryDeductionAmount: Number(formVal.salaryDeductionAmount || 0),
      repaymentStartDate: formVal.repaymentStartDate,
      tenureMonths: Number(formVal.tenureMonths),
      notes: formVal.notes ? formVal.notes.trim() : undefined,
    };

    this.loanService.configureRepayment(currentLoan.id, payload).subscribe({
      next: (updatedLoan) => {
        this.submitting.set(false);
        this.repaymentConfigured.emit(updatedLoan);
        this.onCancel();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg =
          err?.error?.message ||
          'Failed to configure repayment options. Please check the values.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
