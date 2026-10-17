import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
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
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import {
  CreateEmployeeRequest,
  Department,
  Designation,
  Employee,
  EmployeeStatus,
  UpdateEmployeeRequest,
} from '../../models/employee.model';

@Component({
  selector: 'app-employee-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './employee-form-modal.component.html',
  styleUrl: './employee-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly EmployeeStatus = EmployeeStatus;

  readonly employee = input<Employee | null>(null);
  readonly departments = input<Department[]>([]);
  readonly designations = input<Designation[]>([]);
  readonly managers = input<Employee[]>([]);

  readonly selectedDepartmentId = signal<string>('');

  readonly departmentOptions = computed<SelectOption[]>(() => [
    { label: 'Select Department', value: '' },
    ...this.departments().map((d) => ({
      label: `${d.name} (${d.code})`,
      value: d.id,
    })),
  ]);

  readonly designationOptions = computed<SelectOption[]>(() => {
    const deptId = this.selectedDepartmentId();
    const allDesigs = this.designations();
    const filtered = deptId
      ? allDesigs.filter((d) => !d.departmentId || d.departmentId === deptId)
      : allDesigs;

    return [
      { label: 'Select Designation', value: '' },
      ...filtered.map((d) => ({
        label: `${d.name} (${d.code})`,
        value: d.id,
      })),
    ];
  });

  readonly statusOptions: SelectOption[] = [
    { label: 'Active', value: EmployeeStatus.ACTIVE },
    { label: 'Inactive', value: EmployeeStatus.INACTIVE },
    { label: 'Resigned', value: EmployeeStatus.RESIGNED },
    { label: 'Terminated', value: EmployeeStatus.TERMINATED },
  ];

  readonly managerOptions = computed<SelectOption[]>(() => [
    { label: 'None (Top Level)', value: '' },
    ...this.managers()
      .filter((mgr) => mgr.id !== this.employee()?.id)
      .map((mgr) => ({
        label: `${mgr.firstName} ${mgr.lastName} (${mgr.employeeCode || mgr.email})`,
        value: mgr.id,
      })),
  ]);

  readonly saveModal = output<CreateEmployeeRequest | UpdateEmployeeRequest>();
  readonly cancelModal = output<void>();

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  form!: FormGroup;

  isEditMode(): boolean {
    return !!this.employee()?.id;
  }

  ngOnInit(): void {
    const emp = this.employee();
    this.selectedDepartmentId.set(emp?.department?.id || '');

    this.form = this.fb.group({
      firstName: [emp?.firstName || '', [Validators.required]],
      lastName: [emp?.lastName || '', [Validators.required]],
      email: [emp?.email || '', [Validators.required, Validators.email]],
      phone: [
        emp?.phone || '+91',
        [Validators.required, Validators.pattern(/^\+91[6-9]\d{9}$/)],
      ],
      dateOfJoining: [
        emp?.dateOfJoining
          ? new Date(emp.dateOfJoining).toISOString().substring(0, 10)
          : new Date().toISOString().substring(0, 10),
        [Validators.required],
      ],
      status: [emp?.status || EmployeeStatus.ACTIVE, [Validators.required]],
      departmentId: [emp?.department?.id || '', [Validators.required]],
      designationId: [emp?.designation?.id || '', [Validators.required]],
      managerId: [emp?.manager?.id || ''],
    });

    this.form.get('departmentId')?.valueChanges.subscribe((deptId) => {
      this.selectedDepartmentId.set(deptId || '');
      const currentDesigId = this.form.get('designationId')?.value;
      if (currentDesigId) {
        const found = this.designations().find((d) => d.id === currentDesigId);
        if (found && found.departmentId && found.departmentId !== deptId) {
          this.form.get('designationId')?.setValue('');
        }
      }
    });
  }

  isFieldInvalid(name: string): boolean {
    const f = this.form.get(name);
    return !!(f && f.invalid && (f.dirty || f.touched));
  }

  onCancel(): void {
    this.cancelModal.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.getRawValue();
    const payload: CreateEmployeeRequest = {
      firstName: val.firstName.trim(),
      lastName: val.lastName.trim(),
      email: val.email.trim(),
      phone: val.phone.trim(),
      dateOfJoining: val.dateOfJoining,
      status: val.status,
      departmentId: val.departmentId,
      designationId: val.designationId,
      managerId: val.managerId ? val.managerId : null,
    };

    this.saveModal.emit(payload);
  }
}
