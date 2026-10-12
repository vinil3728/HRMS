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
  CreateModuleDto,
  SystemModule,
  UpdateModuleDto,
} from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-module-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './module-form-modal.component.html',
  styleUrl: './module-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);

  readonly isOpen = input<boolean>(false);
  readonly module = input<SystemModule | null>(null);

  readonly closeModal = output<void>();
  readonly saved = output<SystemModule>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.module());

  readonly form: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    description: [''],
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const m = this.module();

      if (open && m) {
        this.form.patchValue({
          code: m.code,
          name: m.name,
          description: m.description || '',
        });
        this.errorMessage.set('');
      } else if (open) {
        this.form.reset({
          code: '',
          name: '',
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
    const current = this.module();

    if (current) {
      const dto: UpdateModuleDto = {
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        description: val.description?.trim() || null,
      };

      this.settingsService.updateModule(current.id, dto).subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.saved.emit(updated);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to update system module'
          );
        },
      });
    } else {
      const dto: CreateModuleDto = {
        code: val.code.trim().toUpperCase(),
        name: val.name.trim(),
        description: val.description?.trim() || null,
      };

      this.settingsService.createModule(dto).subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.saved.emit(created);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to create module'
          );
        },
      });
    }
  }
}
