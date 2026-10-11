import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
import { Reimbursement } from '../../models/reimbursement.model';
import { ReimbursementService } from '../../services/reimbursement.service';

@Component({
  selector: 'app-reimbursement-action-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './reimbursement-action-modal.component.html',
  styleUrl: './reimbursement-action-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementActionModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly reimbursementService = inject(ReimbursementService);

  readonly isOpen = input<boolean>(false);
  readonly actionType = input<'REJECT' | 'UPLOAD_RECEIPT'>('REJECT');
  readonly reimbursement = input<Reimbursement | null>(null);
  readonly employeeId = input.required<string>();

  readonly closeModal = output<void>();
  readonly actionCompleted = output<void>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly selectedFileName = signal<string>('');

  selectedFile: File | null = null;

  readonly rejectForm: FormGroup = this.fb.group({
    rejectionReason: ['', [Validators.required, Validators.minLength(5)]],
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.errorMessage.set('');
        this.selectedFileName.set('');
        this.selectedFile = null;
        this.rejectForm.reset({ rejectionReason: '' });
      }
    });
  }

  isRejectInvalid(field: string): boolean {
    const c = this.rejectForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files.length > 0) {
      this.selectedFile = inputEl.files[0];
      this.selectedFileName.set(this.selectedFile.name);
    }
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onRejectSubmit(): void {
    if (this.rejectForm.invalid || this.submitting()) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    const claim = this.reimbursement();
    const empId = this.employeeId();
    if (!claim || !empId) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const reason = this.rejectForm.value.rejectionReason.trim();
    this.reimbursementService
      .rejectReimbursement(empId, claim.id, reason)
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.actionCompleted.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to reject reimbursement claim'
          );
        },
      });
  }

  onUploadSubmit(): void {
    if (!this.selectedFile || this.submitting()) return;

    const claim = this.reimbursement();
    const empId = this.employeeId();
    if (!claim || !empId) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    this.reimbursementService
      .uploadReceipt(empId, claim.id, this.selectedFile)
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.actionCompleted.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err.error?.message || 'Failed to upload receipt document'
          );
        },
      });
  }
}
