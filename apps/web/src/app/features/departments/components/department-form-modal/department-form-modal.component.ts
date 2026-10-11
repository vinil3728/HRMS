import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
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
import { Department } from '../../models/department.model';
import { DepartmentService } from '../../services/department.service';
import { BranchService } from '../../../branches/services/branch.service';
import { Branch } from '../../../branches/models/branch.model';

import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';

@Component({
  selector: 'app-department-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './department-form-modal.component.html',
  styleUrl: './department-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentFormModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly departmentService = inject(DepartmentService);
  private readonly branchService = inject(BranchService);

  readonly isOpen = input<boolean>(false);
  readonly department = input<Department | null>(null);

  readonly closeModal = output<void>();
  readonly saved = output<Department>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly branches = signal<Branch[]>([]);

  readonly branchOptions = computed<SelectOption[]>(() => [
    { value: '', label: '-- No Branch (Global / Corporate Headquarters) --' },
    ...this.branches().map((b) => ({
      value: b.id,
      label: `${b.name} (${b.code})${b.city ? ' - ' + b.city : ''}`,
    })),
  ]);

  readonly isEditMode = computed(() => !!this.department());

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(20),
        Validators.pattern(/^[A-Za-z0-9_-]+$/),
      ],
    ],
    branchId: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.branchService.getBranches().subscribe({
      next: (b) => this.branches.set(b.filter((x) => x.isActive)),
      error: () => this.branches.set([]),
    });
  }

  constructor() {
    effect(() => {
      const dept = this.department();
      const open = this.isOpen();

      if (open && dept) {
        this.form.patchValue({
          name: dept.name,
          code: dept.code,
          branchId: dept.branchId || '',
          isActive: dept.isActive,
        });
        this.errorMessage.set('');
      } else if (open) {
        this.form.reset({
          name: '',
          code: '',
          branchId: '',
          isActive: true,
        });
        this.errorMessage.set('');
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onCodeInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl) {
      inputEl.value = inputEl.value.toUpperCase();
      this.form.get('code')?.setValue(inputEl.value, { emitEvent: false });
    }
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

    const formVal = this.form.value;
    const payload = {
      name: formVal.name.trim(),
      code: formVal.code.trim().toUpperCase(),
      branchId: formVal.branchId ? formVal.branchId : null,
      isActive: !!formVal.isActive,
    };

    const currentDept = this.department();
    const req$ = currentDept
      ? this.departmentService.updateDepartment(currentDept.id, payload)
      : this.departmentService.createDepartment(payload);

    req$.subscribe({
      next: (savedDept) => {
        this.submitting.set(false);
        this.saved.emit(savedDept);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to save department. Please try again.'
        );
      },
    });
  }
}
