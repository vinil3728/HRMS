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
import { Branch } from '../../models/branch.model';
import { BranchService } from '../../services/branch.service';

@Component({
  selector: 'app-branch-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './branch-form-modal.component.html',
  styleUrl: './branch-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly branchService = inject(BranchService);

  readonly isOpen = input<boolean>(false);
  readonly branch = input<Branch | null>(null);

  readonly closeModal = output<void>();
  readonly saved = output<Branch>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.branch());

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
    email: ['', [Validators.email]],
    phone: [''],
    city: [''],
    state: [''],
    country: ['India'],
    postalCode: [''],
    address: [''],
    isActive: [true],
  });

  constructor() {
    effect(() => {
      const b = this.branch();
      const open = this.isOpen();

      if (open && b) {
        this.form.patchValue({
          name: b.name,
          code: b.code,
          email: b.email || '',
          phone: b.phone || '',
          city: b.city || '',
          state: b.state || '',
          country: b.country || 'India',
          postalCode: b.postalCode || '',
          address: b.address || '',
          isActive: b.isActive,
        });
        this.errorMessage.set('');
      } else if (open) {
        this.form.reset({
          name: '',
          code: '',
          email: '',
          phone: '',
          city: '',
          state: '',
          country: 'India',
          postalCode: '',
          address: '',
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
      email: formVal.email ? formVal.email.trim() : undefined,
      phone: formVal.phone ? formVal.phone.trim() : undefined,
      city: formVal.city ? formVal.city.trim() : undefined,
      state: formVal.state ? formVal.state.trim() : undefined,
      country: formVal.country ? formVal.country.trim() : 'India',
      postalCode: formVal.postalCode ? formVal.postalCode.trim() : undefined,
      address: formVal.address ? formVal.address.trim() : undefined,
      isActive: !!formVal.isActive,
    };

    const currentBranch = this.branch();
    const req$ = currentBranch
      ? this.branchService.updateBranch(currentBranch.id, payload)
      : this.branchService.createBranch(payload);

    req$.subscribe({
      next: (savedBranch) => {
        this.submitting.set(false);
        this.saved.emit(savedBranch);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to save branch. Please try again.'
        );
      },
    });
  }
}
