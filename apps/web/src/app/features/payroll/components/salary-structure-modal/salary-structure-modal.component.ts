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
import { Employee } from '../../../employees/models/employee.model';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import {
  CreateSalaryStructureDto,
  SalaryStructure,
  UpdateSalaryStructureDto,
} from '../../models/payroll.model';
import { PayrollService } from '../../services/payroll.service';

@Component({
  selector: 'app-salary-structure-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './salary-structure-modal.component.html',
  styleUrl: './salary-structure-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalaryStructureModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly payrollService = inject(PayrollService);

  readonly isOpen = input<boolean>(false);
  readonly structure = input<SalaryStructure | null>(null);
  readonly employees = input<Employee[]>([]);

  readonly closeModal = output<void>();
  readonly saved = output<SalaryStructure>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.structure());
  readonly selectedStructure = computed(() => this.structure());
  readonly employeeOptions = computed<SelectOption[]>(() =>
    this.employees().map((emp) => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode}) - ${emp.department?.name || 'General'}`,
    }))
  );

  readonly computedGross = signal<number>(0);
  readonly computedDeductions = signal<number>(0);
  readonly computedNet = signal<number>(0);

  readonly form: FormGroup = this.fb.group({
    employeeId: ['', Validators.required],
    ctc: [0, [Validators.required, Validators.min(1000)]],
    basicSalary: [0, [Validators.required, Validators.min(0)]],
    hra: [0, [Validators.required, Validators.min(0)]],
    conveyanceAllowance: [0, [Validators.min(0)]],
    medicalAllowance: [0, [Validators.min(0)]],
    specialAllowance: [0, [Validators.min(0)]],
    providentFund: [0, [Validators.min(0)]],
    professionalTax: [0, [Validators.min(0)]],
    tds: [0, [Validators.min(0)]],
  });

  constructor() {
    this.form.valueChanges.subscribe(() => {
      this.recalculateTotals();
    });

    effect(() => {
      const open = this.isOpen();
      const current = this.structure();

      if (open) {
        this.errorMessage.set('');
        if (current) {
          this.form.patchValue({
            employeeId: current.employeeId || current.employee?.id || '',
            ctc: current.ctc,
            basicSalary: current.basicSalary,
            hra: current.hra,
            conveyanceAllowance: current.conveyanceAllowance || 0,
            medicalAllowance: current.medicalAllowance || 0,
            specialAllowance: current.specialAllowance || 0,
            providentFund: current.providentFund || 0,
            professionalTax: current.professionalTax || 0,
            tds: current.tds || 0,
          });
          this.form.get('employeeId')?.disable();
        } else {
          this.form.reset({
            employeeId: '',
            ctc: 0,
            basicSalary: 0,
            hra: 0,
            conveyanceAllowance: 0,
            medicalAllowance: 0,
            specialAllowance: 0,
            providentFund: 0,
            professionalTax: 0,
            tds: 0,
          });
          this.form.get('employeeId')?.enable();
        }
        this.recalculateTotals();
      } else {
        this.errorMessage.set('');
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  applyStandardBreakdown(): void {
    const ctc = Number(this.form.get('ctc')?.value) || 0;
    if (ctc <= 0) return;

    const monthlyCtc = Math.round(ctc / 12);
    const basic = Math.round(monthlyCtc * 0.45);
    const hra = Math.round(monthlyCtc * 0.25);
    const conveyance = 2500;
    const medical = 1500;
    const standardCost = basic + hra + conveyance + medical;
    const special = Math.max(0, monthlyCtc - standardCost);

    const pf = Math.round(basic * 0.12);
    const pt = 200;
    const tds = Math.round(monthlyCtc * 0.08);

    this.form.patchValue({
      basicSalary: basic,
      hra: hra,
      conveyanceAllowance: conveyance,
      medicalAllowance: medical,
      specialAllowance: special,
      providentFund: pf,
      professionalTax: pt,
      tds: tds,
    });

    this.recalculateTotals();
  }

  private recalculateTotals(): void {
    const val = this.form.getRawValue();
    const basic = Number(val.basicSalary) || 0;
    const hra = Number(val.hra) || 0;
    const conv = Number(val.conveyanceAllowance) || 0;
    const med = Number(val.medicalAllowance) || 0;
    const special = Number(val.specialAllowance) || 0;

    const pf = Number(val.providentFund) || 0;
    const pt = Number(val.professionalTax) || 0;
    const tds = Number(val.tds) || 0;

    const gross = basic + hra + conv + med + special;
    const deductions = pf + pt + tds;
    const net = gross - deductions;

    this.computedGross.set(gross);
    this.computedDeductions.set(deductions);
    this.computedNet.set(net);
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

    const val = this.form.getRawValue();
    const editMode = this.isEditMode();
    const current = this.structure();

    if (editMode && current) {
      const dto: UpdateSalaryStructureDto = {
        ctc: Number(val.ctc),
        basicSalary: Number(val.basicSalary),
        hra: Number(val.hra),
        conveyanceAllowance: Number(val.conveyanceAllowance),
        medicalAllowance: Number(val.medicalAllowance),
        specialAllowance: Number(val.specialAllowance),
        providentFund: Number(val.providentFund),
        professionalTax: Number(val.professionalTax),
        tds: Number(val.tds),
      };

      this.payrollService.updateSalaryStructure(current.id, {
        ...dto,
        employeeId: current.employee?.id || current.employeeId,
      }).subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.saved.emit(res);
        },
        error: (err: { error?: { message?: string } }) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to update salary compensation structure.'
          );
        },
      });
    } else {
      const dto: CreateSalaryStructureDto = {
        employeeId: val.employeeId,
        ctc: Number(val.ctc),
        basicSalary: Number(val.basicSalary),
        hra: Number(val.hra),
        conveyanceAllowance: Number(val.conveyanceAllowance),
        medicalAllowance: Number(val.medicalAllowance),
        specialAllowance: Number(val.specialAllowance),
        providentFund: Number(val.providentFund),
        professionalTax: Number(val.professionalTax),
        tds: Number(val.tds),
      };

      this.payrollService.createSalaryStructure(dto).subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.saved.emit(res);
        },
        error: (err: { error?: { message?: string } }) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to create employee salary structure.'
          );
        },
      });
    }
  }
}
