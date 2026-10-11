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
  CreatePolicyDto,
  Policy,
  UpdatePolicyDto,
} from '../../models/policy.model';
import { PolicyService } from '../../services/policy.service';

@Component({
  selector: 'app-policy-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './policy-form-modal.component.html',
  styleUrl: './policy-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly policyService = inject(PolicyService);

  readonly isOpen = input<boolean>(false);
  readonly policy = input<Policy | null>(null);

  readonly closeModal = output<void>();
  readonly saved = output<Policy>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.policy());

  readonly form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    code: ['', [Validators.required, Validators.minLength(2)]],
    version: ['v1.0'],
    effectiveDate: [new Date().toISOString().substring(0, 10)],
    content: ['', [Validators.required, Validators.minLength(10)]],
  });

  constructor() {
    effect(() => {
      const p = this.policy();
      const open = this.isOpen();

      if (open && p) {
        const effDate = p.effectiveDate
          ? new Date(p.effectiveDate).toISOString().substring(0, 10)
          : '';

        this.form.patchValue({
          title: p.title,
          code: p.code,
          version: p.version || '',
          effectiveDate: effDate,
          content: p.content,
        });
        this.errorMessage.set('');
      } else if (open) {
        const today = new Date().toISOString().substring(0, 10);
        this.form.reset({
          title: '',
          code: '',
          version: 'v1.0',
          effectiveDate: today,
          content: '',
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

    const val = this.form.value;
    const current = this.policy();

    if (current) {
      const dto: UpdatePolicyDto = {
        title: val.title.trim(),
        code: val.code.trim().toUpperCase(),
        version: val.version?.trim() || null,
        effectiveDate: val.effectiveDate || null,
        content: val.content.trim(),
      };

      this.policyService.updatePolicy(current.id, dto).subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.saved.emit(updated);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to update organizational policy'
          );
        },
      });
    } else {
      const dto: CreatePolicyDto = {
        title: val.title.trim(),
        code: val.code.trim().toUpperCase(),
        version: val.version?.trim() || undefined,
        effectiveDate: val.effectiveDate || undefined,
        content: val.content.trim(),
      };

      this.policyService.createPolicy(dto).subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.saved.emit(created);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to create organizational policy'
          );
        },
      });
    }
  }
}
