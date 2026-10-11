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
import {
  CreatePermissionDto,
  SystemPermission,
  UpdatePermissionDto,
} from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';

const DEFAULT_MODULES = [
  'Employees',
  'Departments',
  'Designations',
  'Attendance',
  'Employee Documents',
  'Leave',
  'Leave Balances',
  'Payroll',
  'Performance',
  'Policies',
  'Policy Acknowledgements',
  'Reimbursements',
  'Roles & Permissions',
];

@Component({
  selector: 'app-permission-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './permission-form-modal.component.html',
  styleUrl: './permission-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);

  readonly isOpen = input<boolean>(false);
  readonly permission = input<SystemPermission | null>(null);
  readonly existingModules = input<string[]>([]);

  readonly closeModal = output<void>();
  readonly saved = output<SystemPermission>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.permission());

  readonly moduleSuggestions = computed(() => {
    const fromProps = this.existingModules();
    const set = new Set([...DEFAULT_MODULES, ...fromProps]);
    return Array.from(set).sort();
  });

  readonly form: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(2)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    module: ['', [Validators.required]],
    description: [''],
  });

  constructor() {
    effect(() => {
      const p = this.permission();
      const open = this.isOpen();

      if (open && p) {
        this.form.patchValue({
          code: p.code,
          name: p.name,
          module: p.module,
          description: p.description || '',
        });
        this.errorMessage.set('');
      } else if (open) {
        this.form.reset({
          code: '',
          name: '',
          module: 'Employees',
          description: '',
        });
        this.errorMessage.set('');
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
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
    const current = this.permission();

    if (current) {
      const dto: UpdatePermissionDto = {
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        module: val.module.trim(),
        description: val.description?.trim() || null,
      };

      this.settingsService.updatePermission(current.id, dto).subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.saved.emit(updated);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to update system permission'
          );
        },
      });
    } else {
      const dto: CreatePermissionDto = {
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        module: val.module.trim(),
        description: val.description?.trim() || null,
      };

      this.settingsService.createPermission(dto).subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.saved.emit(created);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to create permission'
          );
        },
      });
    }
  }
}
