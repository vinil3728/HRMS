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
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import {
  CreateReimbursementDto,
  REIMBURSEMENT_CATEGORIES,
  Reimbursement,
  UpdateReimbursementDto,
} from '../../models/reimbursement.model';
import { ReimbursementService } from '../../services/reimbursement.service';

@Component({
  selector: 'app-reimbursement-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './reimbursement-form-modal.component.html',
  styleUrl: './reimbursement-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly reimbursementService = inject(ReimbursementService);

  readonly categories = REIMBURSEMENT_CATEGORIES;
  readonly categoryOptions: SelectOption[] = REIMBURSEMENT_CATEGORIES.map(
    (cat) => ({ value: cat, label: cat })
  );

  readonly isOpen = input<boolean>(false);
  readonly reimbursement = input<Reimbursement | null>(null);
  readonly employeeId = input.required<string>();

  readonly closeModal = output<void>();
  readonly saved = output<Reimbursement>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly selectedFileName = signal<string>('');

  private pickedFile: File | null = null;

  readonly isEditMode = computed(() => !!this.reimbursement());

  readonly form: FormGroup = this.fb.group({
    expenseDate: [
      new Date().toISOString().substring(0, 10),
      [Validators.required],
    ],
    category: [REIMBURSEMENT_CATEGORIES[0], [Validators.required]],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
  });

  constructor() {
    effect(() => {
      const r = this.reimbursement();
      const open = this.isOpen();

      if (open && r) {
        const dateStr = r.expenseDate
          ? new Date(r.expenseDate).toISOString().substring(0, 10)
          : '';

        this.form.patchValue({
          expenseDate: dateStr,
          category: r.category,
          amount: r.amount,
          description: r.description,
        });
        this.selectedFileName.set(r.receiptFileName || '');
        this.pickedFile = null;
        this.errorMessage.set('');
      } else if (open) {
        const todayStr = new Date().toISOString().substring(0, 10);
        this.form.reset({
          expenseDate: todayStr,
          category: REIMBURSEMENT_CATEGORIES[0],
          amount: '',
          description: '',
        });
        this.selectedFileName.set('');
        this.pickedFile = null;
        this.errorMessage.set('');
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      this.pickedFile = inputEl.files[0];
      this.selectedFileName.set(this.pickedFile.name);
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

    const val = this.form.value;
    const empId = this.employeeId();
    const currentClaim = this.reimbursement();

    if (currentClaim) {
      const dto: UpdateReimbursementDto = {
        expenseDate: val.expenseDate,
        category: val.category,
        amount: Number(val.amount),
        description: val.description.trim(),
      };

      this.reimbursementService
        .updateReimbursement(empId, currentClaim.id, dto)
        .subscribe({
          next: (savedClaim) => {
            if (this.pickedFile) {
              this.uploadAttachedFile(empId, savedClaim.id, savedClaim);
            } else {
              this.submitting.set(false);
              this.saved.emit(savedClaim);
            }
          },
          error: (err) => {
            this.submitting.set(false);
            this.errorMessage.set(
              err.error?.message || 'Failed to update reimbursement claim'
            );
          },
        });
    } else {
      const dto: CreateReimbursementDto = {
        expenseDate: val.expenseDate,
        category: val.category,
        amount: Number(val.amount),
        description: val.description.trim(),
        currency: 'INR',
      };

      this.reimbursementService.createReimbursement(empId, dto).subscribe({
        next: (savedClaim) => {
          if (this.pickedFile) {
            this.uploadAttachedFile(empId, savedClaim.id, savedClaim);
          } else {
            this.submitting.set(false);
            this.saved.emit(savedClaim);
          }
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to create reimbursement claim'
          );
        },
      });
    }
  }

  private uploadAttachedFile(
    empId: string,
    claimId: string,
    fallbackClaim: Reimbursement
  ): void {
    if (!this.pickedFile) {
      this.submitting.set(false);
      this.saved.emit(fallbackClaim);
      return;
    }

    this.reimbursementService
      .uploadReceipt(empId, claimId, this.pickedFile)
      .subscribe({
        next: (updatedClaim) => {
          this.submitting.set(false);
          this.saved.emit(updatedClaim);
        },
        error: () => {
          this.submitting.set(false);
          this.saved.emit(fallbackClaim);
        },
      });
  }
}
