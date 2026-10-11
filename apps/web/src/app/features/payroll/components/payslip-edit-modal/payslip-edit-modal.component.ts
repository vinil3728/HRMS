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
import { Payslip, UpdatePayslipDto } from '../../models/payroll.model';
import { PayrollService } from '../../services/payroll.service';

@Component({
  selector: 'app-payslip-edit-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './payslip-edit-modal.component.html',
  styleUrl: './payslip-edit-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayslipEditModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payrollService = inject(PayrollService);

  readonly isOpen = input<boolean>(false);
  readonly payslip = input<Payslip | null>(null);

  readonly closeModal = output<void>();
  readonly saved = output<Payslip>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly baseEarnings = signal<number>(0);
  readonly baseDeductions = signal<number>(0);

  readonly previewGross = signal<number>(0);
  readonly previewDeductions = signal<number>(0);
  readonly previewNet = signal<number>(0);

  readonly form: FormGroup = this.fb.group({
    bonus: [0, [Validators.min(0)]],
    overtimePay: [0, [Validators.min(0)]],
    lossOfPayDays: [0, [Validators.min(0)]],
    lossOfPayDeduction: [0, [Validators.min(0)]],
    otherDeductions: [0, [Validators.min(0)]],
    notes: [''],
  });

  constructor() {
    this.form.get('lossOfPayDays')?.valueChanges.subscribe((days) => {
      const numDays = Number(days) || 0;
      const earnings = this.baseEarnings();
      if (numDays >= 0 && earnings > 0) {
        const perDay = earnings / 30;
        const autoLop = Math.round(perDay * numDays * 100) / 100;
        this.form.get('lossOfPayDeduction')?.setValue(autoLop, { emitEvent: false });
      }
      this.recalculate();
    });

    this.form.valueChanges.subscribe(() => {
      this.recalculate();
    });

    effect(() => {
      const open = this.isOpen();
      const slip = this.payslip();

      if (open && slip) {
        this.errorMessage.set('');

        const baseEarn =
          Number(slip.basicSalary) +
          Number(slip.hra) +
          Number(slip.conveyance || 0) +
          Number(slip.medicalAllowance || 0) +
          Number(slip.specialAllowance || 0);

        const baseDed =
          Number(slip.providentFund || 0) +
          Number(slip.professionalTax || 0) +
          Number(slip.tds || 0);

        this.baseEarnings.set(baseEarn);
        this.baseDeductions.set(baseDed);

        this.form.patchValue(
          {
            bonus: slip.bonus || 0,
            overtimePay: slip.overtimePay || 0,
            lossOfPayDays: slip.lossOfPayDays || 0,
            lossOfPayDeduction: slip.lossOfPayDeduction || 0,
            otherDeductions: slip.otherDeductions || 0,
            notes: slip.remarks || '',
          },
          { emitEvent: false }
        );

        this.recalculate();
      } else {
        this.errorMessage.set('');
        this.form.reset();
      }
    });
  }

  private recalculate(): void {
    const val = this.form.value;
    const bonus = Number(val.bonus) || 0;
    const ot = Number(val.overtimePay) || 0;
    const lop = Number(val.lossOfPayDeduction) || 0;
    const other = Number(val.otherDeductions) || 0;

    const gross = this.baseEarnings() + bonus + ot;
    const totalDed = this.baseDeductions() + lop + other;
    const net = gross - totalDed;

    this.previewGross.set(gross);
    this.previewDeductions.set(totalDed);
    this.previewNet.set(net);
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    const slip = this.payslip();
    if (!slip || this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const val = this.form.value;
    const dto: UpdatePayslipDto = {
      bonus: Number(val.bonus) || 0,
      overtimePay: Number(val.overtimePay) || 0,
      lossOfPayDays: Number(val.lossOfPayDays) || 0,
      lossOfPayDeduction: Number(val.lossOfPayDeduction) || 0,
      otherDeductions: Number(val.otherDeductions) || 0,
      remarks: val.notes?.trim() || undefined,
    };

    this.payrollService.updatePayslip(slip.id, dto).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.saved.emit(res);
      },
      error: (err: { error?: { message?: string } }) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to update payslip.');
      },
    });
  }
}
