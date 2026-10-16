import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { HolidayService } from '../../../../core/services/holiday.service';
import { CreateHolidayDto, HolidayType } from '../../../../core/models/holiday.model';

export interface BulkHolidayRow {
  id: string;
  name: string;
  date: string;
  dayOfWeek: string;
  type: HolidayType;
  description: string;
}

@Component({
  selector: 'app-holiday-bulk-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './holiday-bulk-modal.component.html',
  styleUrl: './holiday-bulk-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayBulkModalComponent {
  private readonly holidayService = inject(HolidayService);

  readonly isOpen = input<boolean>(false);
  readonly initialYear = input<number>(new Date().getFullYear());

  readonly closeModal = output<void>();
  readonly saved = output<{ year: number; count: number }>();

  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly rows = signal<BulkHolidayRow[]>([]);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly yearOptions = computed(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1, current + 2];
  });

  readonly validRowsCount = computed(() => {
    return this.rows().filter((r) => r.name.trim() && r.date).length;
  });

  constructor() {
    // Initial setup with 3 blank rows
    this.initDefaultRows();
  }

  ngOnInit(): void {
    if (this.initialYear()) {
      this.selectedYear.set(this.initialYear());
    }
  }

  initDefaultRows(): void {
    const yr = this.selectedYear();
    this.rows.set([
      this.createRow(`${yr}-01-01`, "New Year's Day", 'COMPANY', 'New Calendar Year'),
      this.createRow(`${yr}-01-26`, 'Republic Day', 'GAZETTED', 'Republic Day Celebration'),
      this.createRow(`${yr}-05-01`, 'May Day', 'COMPANY', 'International Workers Day'),
    ]);
  }

  createRow(date: string = '', name: string = '', type: HolidayType = 'GAZETTED', description: string = ''): BulkHolidayRow {
    return {
      id: Math.random().toString(36).substring(2, 9),
      date,
      name,
      dayOfWeek: date ? this.computeDayOfWeek(date) : '',
      type,
      description,
    };
  }

  onYearChange(newYear: number): void {
    this.selectedYear.set(Number(newYear));
    // Update dates of existing rows to match the new year if they have a date
    const updated = this.rows().map((r) => {
      if (r.date && r.date.length >= 10) {
        const monthDay = r.date.substring(4);
        const newDate = `${newYear}${monthDay}`;
        return {
          ...r,
          date: newDate,
          dayOfWeek: this.computeDayOfWeek(newDate),
        };
      }
      return r;
    });
    this.rows.set(updated);
  }

  onDateChange(row: BulkHolidayRow, newDate: string): void {
    row.date = newDate;
    row.dayOfWeek = newDate ? this.computeDayOfWeek(newDate) : '';
    this.rows.set([...this.rows()]);
  }

  addRow(): void {
    const yr = this.selectedYear();
    this.rows.update((list) => [...list, this.createRow(`${yr}-`, '', 'GAZETTED', '')]);
  }

  removeRow(index: number): void {
    this.rows.update((list) => list.filter((_, i) => i !== index));
  }

  clearAllRows(): void {
    this.rows.set([]);
  }

  prefillStandardHolidays(): void {
    const yr = this.selectedYear();
    const defaults: BulkHolidayRow[] = [
      this.createRow(`${yr}-01-01`, "New Year's Day", 'COMPANY', 'New Calendar Year Celebration'),
      this.createRow(`${yr}-01-26`, 'Republic Day', 'GAZETTED', 'Republic Day National Holiday'),
      this.createRow(`${yr}-03-03`, 'Holi', 'GAZETTED', 'Spring Festival of Colors'),
      this.createRow(`${yr}-04-03`, 'Good Friday', 'GAZETTED', 'Christian Observance'),
      this.createRow(`${yr}-05-01`, 'May Day / Labour Day', 'COMPANY', 'International Workers Day'),
      this.createRow(`${yr}-08-15`, 'Independence Day', 'GAZETTED', 'Independence Day National Holiday'),
      this.createRow(`${yr}-10-02`, 'Mahatma Gandhi Jayanti', 'GAZETTED', 'National Holiday'),
      this.createRow(`${yr}-10-20`, 'Dussehra / Vijayadashami', 'GAZETTED', 'Vijayadashami Festival'),
      this.createRow(`${yr}-11-01`, 'Diwali / Deepavali', 'GAZETTED', 'Festival of Lights'),
      this.createRow(`${yr}-12-25`, 'Christmas Day', 'GAZETTED', 'Christmas Celebration'),
    ];
    this.rows.set(defaults);
    this.errorMessage.set(null);
  }

  computeDayOfWeek(dateStr: string): string {
    if (!dateStr || dateStr.length < 10) return '';
    try {
      const date = new Date(`${dateStr}T12:00:00Z`);
      return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    } catch {
      return '';
    }
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    const validRows = this.rows().filter((r) => r.name.trim() && r.date);

    if (validRows.length === 0) {
      this.errorMessage.set('Please provide at least one holiday with a valid name and date.');
      return;
    }

    // Verify all rows have valid YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const r of validRows) {
      if (!dateRegex.test(r.date)) {
        this.errorMessage.set(`Invalid date format for "${r.name}". Expected YYYY-MM-DD.`);
        return;
      }
    }

    this.submitting.set(true);

    const dtos: CreateHolidayDto[] = validRows.map((r) => ({
      name: r.name.trim(),
      date: r.date,
      type: r.type,
      description: r.description.trim() || undefined,
    }));

    this.holidayService.bulkCreateHolidays(dtos).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.saved.emit({ year: this.selectedYear(), count: created.length });
        this.closeModal.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to bulk create holidays. Please check your inputs.'
        );
      },
    });
  }
}
