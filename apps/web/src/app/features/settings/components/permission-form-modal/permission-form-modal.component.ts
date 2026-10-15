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
  SystemModule,
  SystemPermission,
  UpdatePermissionDto,
} from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';

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

  readonly closeModal = output<void>();
  readonly saved = output<SystemPermission>();

  readonly modules = signal<SystemModule[]>([]);
  readonly loadingModules = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.permission());

  readonly form: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(2)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    moduleId: ['', [Validators.required]],
    scopes: ['SELF', [Validators.required]],
    description: [''],
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const p = this.permission();

      if (open) {
        this.loadModules();

        if (p) {
          const modId =
            p.moduleId ||
            (typeof p.module === 'object' ? p.module?.id : '') ||
            '';
          this.form.patchValue({
            code: p.code,
            name: p.name,
            moduleId: modId,
            scopes: p.scopes || 'SELF',
            description: p.description || '',
          });
          this.errorMessage.set('');
        } else {
          this.form.reset({
            code: '',
            name: '',
            moduleId: '',
            scopes: 'SELF',
            description: '',
          });
          this.errorMessage.set('');
        }
      }
    });
  }

  loadModules(): void {
    if (this.modules().length > 0) return;
    this.loadingModules.set(true);
    this.settingsService.getModules().subscribe({
      next: (data) => {
        this.modules.set(data);
        this.loadingModules.set(false);
        const p = this.permission();
        if (p && !this.form.get('moduleId')?.value) {
          // If moduleId wasn't matched yet, attempt to match by module name/code
          const modName = typeof p.module === 'object' ? p.module?.name : p.module;
          const match = data.find(
            (m) =>
              m.id === p.moduleId ||
              (modName && (m.name.toLowerCase() === modName.toLowerCase() || m.code.toLowerCase() === modName.toLowerCase()))
          );
          if (match) {
            this.form.patchValue({ moduleId: match.id });
          }
        }
      },
      error: () => {
        this.loadingModules.set(false);
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

    const val = this.form.getRawValue();
    const current = this.permission();
    const selectedMod = this.modules().find((m) => m.id === val.moduleId);

    if (current) {
      const dto: UpdatePermissionDto = {
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        moduleId: val.moduleId,
        module: selectedMod?.name,
        description: val.description?.trim() || null,
        scopes: val.scopes || 'SELF',
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
        moduleId: val.moduleId,
        module: selectedMod?.name,
        description: val.description?.trim() || null,
        scopes: val.scopes || 'SELF',
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
