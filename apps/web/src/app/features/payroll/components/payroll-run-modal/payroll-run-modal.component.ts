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
import { CreatePayrollRunDto, PayrollRun } from '../../models/payroll.model';
import { PayrollService } from '../../services/payroll.service';

@Component({
  selector: 'app-payroll-run-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './payroll-run-modal.component.html',
  styleUrl: './payroll-run-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollRunModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payrollService = inject(PayrollService);

  readonly isOpen = input<boolean>(false);
  readonly defaultMonth = input<number>(new Date().getMonth() + 1);
  readonly defaultYear = input<number>(new Date().getFullYear());

  readonly closeModal = output<void>();
  readonly saved = output<PayrollRun>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly months: SelectOption<number>[] = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  readonly years = [2025, 2026, 2027];
  readonly yearOptions: SelectOption<number>[] = this.years.map((y) => ({
    value: y,
    label: String(y),
  }));

  readonly form: FormGroup = this.fb.group({
    month: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      if (open) {
        this.errorMessage.set('');
        this.form.patchValue({
          month: this.defaultMonth(),
          year: this.defaultYear(),
          notes: '',
        });
      } else {
        this.errorMessage.set('');
        this.form.reset();
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const val = this.form.value;
    const dto: CreatePayrollRunDto = {
      month: Number(val.month),
      year: Number(val.year),
      notes: val.notes?.trim() || undefined,
    };

    this.payrollService.createRun(dto).subscribe({
      next: (run) => {
        this.submitting.set(false);
        this.saved.emit(run);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to process payroll run cycle.'
        );
      },
    });
  }
}
