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
import { Designation } from '../../models/designation.model';
import { DesignationService } from '../../services/designation.service';
import { DepartmentService } from '../../../departments/services/department.service';
import { Department } from '../../../departments/models/department.model';

import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';

@Component({
  selector: 'app-designation-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './designation-form-modal.component.html',
  styleUrl: './designation-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignationFormModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly designationService = inject(DesignationService);
  private readonly departmentService = inject(DepartmentService);

  readonly isOpen = input<boolean>(false);
  readonly designation = input<Designation | null>(null);

  readonly closeModal = output<void>();
  readonly saved = output<Designation>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly departments = signal<Department[]>([]);

  readonly departmentOptions = computed<SelectOption[]>(() => [
    { value: '', label: '-- No Department (Organization-Wide / Global) --' },
    ...this.departments().map((d) => ({
      value: d.id,
      label: `${d.name} (${d.code})`,
    })),
  ]);

  readonly isEditMode = computed(() => !!this.designation());

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
    departmentId: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.departmentService.getDepartments().subscribe({
      next: (depts) => this.departments.set(depts.filter((d) => d.isActive)),
      error: () => this.departments.set([]),
    });
  }

  constructor() {
    effect(() => {
      const desig = this.designation();
      const open = this.isOpen();

      if (open && desig) {
        this.form.patchValue({
          name: desig.name,
          code: desig.code,
          departmentId: desig.departmentId || '',
          isActive: desig.isActive,
        });
        this.errorMessage.set('');
      } else if (open) {
        this.form.reset({
          name: '',
          code: '',
          departmentId: '',
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
      departmentId: formVal.departmentId ? formVal.departmentId : null,
      isActive: !!formVal.isActive,
    };

    const currentDesig = this.designation();
    const req$ = currentDesig
      ? this.designationService.updateDesignation(currentDesig.id, payload)
      : this.designationService.createDesignation(payload);

    req$.subscribe({
      next: (savedDesig) => {
        this.submitting.set(false);
        this.saved.emit(savedDesig);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to save designation. Please try again.'
        );
      },
    });
  }
}
