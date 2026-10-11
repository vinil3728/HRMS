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
import { CompanyHoliday, HolidayType } from '../../../../core/models/holiday.model';
import { HolidayService } from '../../../../core/services/holiday.service';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';

@Component({
  selector: 'app-holiday-form-modal',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './holiday-form-modal.component.html',
  styleUrl: './holiday-form-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly holidayService = inject(HolidayService);

  readonly isOpen = input<boolean>(false);
  readonly holiday = input<CompanyHoliday | null>(null);

  readonly closeModal = output<void>();
  readonly saved = output<CompanyHoliday>();

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => !!this.holiday());

  readonly holidayTypeOptions: SelectOption[] = [
    { label: 'Gazetted Holiday (Mandatory)', value: 'GAZETTED' },
    { label: 'Restricted Holiday (Optional)', value: 'RESTRICTED' },
    { label: 'Company Holiday (General)', value: 'COMPANY' },
  ];

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    date: ['', [Validators.required]],
    type: ['GAZETTED', [Validators.required]],
    description: [''],
  });

  constructor() {
    effect(() => {
      const h = this.holiday();
      if (h) {
        this.form.patchValue({
          name: h.name,
          date: h.date,
          type: h.type,
          description: h.description || '',
        });
      } else {
        this.form.reset({
          name: '',
          date: '',
          type: 'GAZETTED',
          description: '',
        });
      }
      this.errorMessage.set('');
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onCancel(): void {
    this.form.reset();
    this.errorMessage.set('');
    this.closeModal.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    const val = this.form.value;
    const currentHoliday = this.holiday();

    if (currentHoliday) {
      this.holidayService
        .updateHoliday(currentHoliday.id, {
          name: val.name,
          date: val.date,
          type: val.type as HolidayType,
          description: val.description || undefined,
        })
        .subscribe({
          next: (res) => {
            this.submitting.set(false);
            this.saved.emit(res);
            this.closeModal.emit();
          },
          error: (err) => {
            this.submitting.set(false);
            this.errorMessage.set(
              err.error?.message || 'Failed to update holiday. Please try again.'
            );
          },
        });
    } else {
      this.holidayService
        .createHoliday({
          name: val.name,
          date: val.date,
          type: val.type as HolidayType,
          description: val.description || undefined,
        })
        .subscribe({
          next: (res) => {
            this.submitting.set(false);
            this.saved.emit(res);
            this.closeModal.emit();
          },
          error: (err) => {
            this.submitting.set(false);
            this.errorMessage.set(
              err.error?.message || 'Failed to create holiday. Please try again.'
            );
          },
        });
    }
  }
}
