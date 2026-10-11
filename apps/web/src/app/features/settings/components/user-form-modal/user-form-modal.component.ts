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
import { EmployeeService } from '../../../employees/services/employee.service';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import {
  CreateUserDto,
  Role,
  SystemUser,
  UpdateUserDto,
} from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-user-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './user-form-modal.component.html',
  styleUrl: './user-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly employeeService = inject(EmployeeService);

  readonly isOpen = input<boolean>(false);
  readonly user = input<SystemUser | null>(null);
  readonly roles = input<Role[]>([]);
  readonly existingUsers = input<SystemUser[]>([]);

  readonly closeModal = output<void>();
  readonly saved = output<SystemUser>();

  readonly allEmployees = signal<Employee[]>([]);
  readonly internalRoles = signal<Role[]>([]);
  readonly loadingEmployees = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.user());

  readonly availableRoles = computed<Role[]>(() => {
    const list = this.roles().length > 0 ? this.roles() : this.internalRoles();
    return list.filter((r) => r.isActive);
  });

  readonly eligibleEmployees = computed<Employee[]>(() => {
    const users = this.existingUsers();
    const existingEmployeeIds = new Set<string>();
    for (const u of users) {
      if (u.employee?.id) {
        existingEmployeeIds.add(u.employee.id);
      }
    }

    const currentUserId = this.user()?.employee?.id;
    return this.allEmployees().filter(
      (emp) => !existingEmployeeIds.has(emp.id) || emp.id === currentUserId
    );
  });

  readonly employeeOptions = computed<SelectOption[]>(() =>
    this.eligibleEmployees().map((emp) => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode}) - ${emp.department?.name || 'General'}`,
    }))
  );

  readonly roleOptions = computed<SelectOption[]>(() =>
    this.availableRoles().map((r) => ({
      value: r.id,
      label: `${r.name} (${r.code})${r.isSystemRole ? ' [System]' : ''}`,
    }))
  );

  readonly form: FormGroup = this.fb.group({
    employeeId: ['', [Validators.required]],
    roleId: ['', [Validators.required]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const currentUser = this.user();

      if (open) {
        this.errorMessage.set('');

        if (this.roles().length === 0) {
          this.loadRoles();
        }

        if (currentUser) {
          // Edit mode
          this.form.get('employeeId')?.clearValidators();
          this.form.get('employeeId')?.updateValueAndValidity();
          this.form.get('password')?.setValidators([Validators.minLength(8)]);
          this.form.get('password')?.updateValueAndValidity();

          this.form.patchValue({
            employeeId: currentUser.employee?.id || '',
            roleId: currentUser.role?.id || '',
            username: currentUser.username,
            password: '',
          });
        } else {
          // Create mode
          this.form.get('employeeId')?.setValidators([Validators.required]);
          this.form.get('employeeId')?.updateValueAndValidity();
          this.form.get('password')?.setValidators([
            Validators.required,
            Validators.minLength(8),
          ]);
          this.form.get('password')?.updateValueAndValidity();

          this.form.reset({
            employeeId: '',
            roleId: '',
            username: '',
            password: '',
          });

          this.loadEmployees();
        }
      } else {
        this.errorMessage.set('');
        this.form.reset();
      }
    });
  }

  private loadRoles(): void {
    this.settingsService.getRoles().subscribe({
      next: (data) => this.internalRoles.set(data),
      error: () => {
        // Handled silently
      },
    });
  }

  private loadEmployees(): void {
    this.loadingEmployees.set(true);
    this.employeeService.getEmployees({ limit: 100, status: 'ACTIVE' }).subscribe({
      next: (res) => {
        this.allEmployees.set(res.data);
        this.loadingEmployees.set(false);
      },
      error: () => {
        this.loadingEmployees.set(false);
      },
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

    const raw = this.form.getRawValue();
    const currentUser = this.user();

    if (currentUser) {
      const dto: UpdateUserDto = {};
      if (raw.username && raw.username.trim() !== currentUser.username) {
        dto.username = raw.username.trim();
      }
      if (raw.roleId && raw.roleId !== currentUser.role?.id) {
        dto.roleId = raw.roleId;
      }
      if (raw.password && raw.password.trim().length > 0) {
        dto.password = raw.password.trim();
      }

      this.settingsService.updateUser(currentUser.id, dto).subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.saved.emit(updated);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to update user account credentials.'
          );
        },
      });
    } else {
      const dto: CreateUserDto = {
        employeeId: raw.employeeId,
        roleId: raw.roleId,
        username: raw.username.trim(),
        password: raw.password,
      };

      this.settingsService.createUser(dto).subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.saved.emit(created);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to create user account.'
          );
        },
      });
    }
  }
}
