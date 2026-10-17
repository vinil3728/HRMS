import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Permission } from '../../core/models/permission.model';
import { HolidayService } from '../../core/services/holiday.service';
import { RbacService } from '../../core/services/rbac.service';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import {
  SelectComponent,
  SelectOption,
} from '../../shared/ui/select/select.component';
import { CompanyHoliday } from '../../core/models/holiday.model';
import { HolidayFormModalComponent } from './components/holiday-form-modal/holiday-form-modal.component';
import { HolidayBulkModalComponent } from './components/holiday-bulk-modal/holiday-bulk-modal.component';

@Component({
  selector: 'app-holiday-calendar',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    SelectComponent,
    HolidayFormModalComponent,
    HolidayBulkModalComponent,
  ],
  templateUrl: './holiday-calendar.component.html',
  styleUrl: './holiday-calendar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayCalendarComponent implements OnInit {
  private readonly holidayService = inject(HolidayService);
  private readonly authService = inject(AuthService);
  private readonly rbacService = inject(RbacService);

  readonly currentYear = new Date().getFullYear();
  readonly todayDateStr = new Date().toISOString().substring(0, 10);

  // State
  readonly holidays = signal<CompanyHoliday[]>([]);
  readonly holidayTypeFilter = signal<string>('ALL');
  readonly holidayYear = signal<number>(new Date().getFullYear());
  readonly loading = signal<boolean>(false);
  readonly isModalOpen = signal<boolean>(false);
  readonly isBulkModalOpen = signal<boolean>(false);
  readonly selectedHoliday = signal<CompanyHoliday | null>(null);

  readonly currentUser = this.authService.currentUser;
 
  // ── Permission Signals (Replacing directive) ─────────────────────────────
  readonly canCreateHoliday = computed(() =>
    this.rbacService.hasPermission(Permission.HLD_CREATE)
  );

  readonly canEditHoliday = computed(() =>
    this.rbacService.hasPermission(Permission.HLD_UPDATE)
  );

  readonly canDeleteHoliday = computed(() =>
    this.rbacService.hasPermission(Permission.HLD_DELETE)
  );

  readonly hasRowActionPermissions = computed(() =>
    this.canEditHoliday() || this.canDeleteHoliday()
  );

  readonly holidayTypeOptions: SelectOption[] = [
    { label: 'All Holiday Types', value: 'ALL' },
    { label: 'Gazetted Holiday', value: 'GAZETTED' },
    { label: 'Restricted Holiday', value: 'RESTRICTED' },
    { label: 'Company Holiday', value: 'COMPANY' },
  ];

  readonly holidayYearOptions: SelectOption[] = [
    { label: `${this.currentYear - 1}`, value: `${this.currentYear - 1}` },
    { label: `${this.currentYear}`, value: `${this.currentYear}` },
    { label: `${this.currentYear + 1}`, value: `${this.currentYear + 1}` },
  ];

  readonly filteredHolidays = computed(() => {
    const list = this.holidays();
    const type = this.holidayTypeFilter();
    if (type === 'ALL') return list;
    return list.filter((h) => h.type === type);
  });

  readonly gazettedHolidaysCount = computed(
    () => this.holidays().filter((h) => h.type === 'GAZETTED').length
  );
  readonly restrictedHolidaysCount = computed(
    () => this.holidays().filter((h) => h.type === 'RESTRICTED').length
  );
  readonly upcomingHolidaysCount = computed(
    () => this.holidays().filter((h) => h.date >= this.todayDateStr).length
  );

  getCategoryLabel(type: string): string {
    switch (type) {
      case 'GAZETTED':
        return 'Gazetted';
      case 'RESTRICTED':
        return 'Restricted';
      case 'COMPANY':
        return 'Company';
      default:
        return type;
    }
  }

  ngOnInit(): void {
    this.loadHolidays();
  }

  loadHolidays(): void {
    this.loading.set(true);
    this.holidayService.getHolidays(this.holidayYear()).subscribe({
      next: (data) => {
        this.holidays.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.holidays.set([]);
        this.loading.set(false);
      },
    });
  }

  readonly hasActiveFilters = computed(
    () =>
      this.holidayTypeFilter() !== 'ALL' ||
      this.holidayYear() !== this.currentYear
  );

  onTypeChange(type: string): void {
    this.holidayTypeFilter.set(type);
  }

  onYearChange(year: string): void {
    const y = Number(year) || this.currentYear;
    this.holidayYear.set(y);
    this.loadHolidays();
  }

  resetFilters(): void {
    this.holidayTypeFilter.set('ALL');
    this.holidayYear.set(this.currentYear);
    this.loadHolidays();
  }

  openAddModal(): void {
    this.selectedHoliday.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(holiday: CompanyHoliday): void {
    this.selectedHoliday.set(holiday);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedHoliday.set(null);
  }

  openBulkAddModal(): void {
    this.isBulkModalOpen.set(true);
  }

  closeBulkModal(): void {
    this.isBulkModalOpen.set(false);
  }

  onBulkSaved(result: { year: number; count: number }): void {
    this.closeBulkModal();
    this.holidayYear.set(result.year);
    this.loadHolidays();
  }

  onSaved(_saved: CompanyHoliday): void {
    this.closeModal();
    this.loadHolidays();
  }

  onDelete(holiday: CompanyHoliday): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${holiday.name}" (${holiday.date}) from the company calendar?`
    );
    if (!confirmed) return;

    this.holidayService.deleteHoliday(holiday.id).subscribe({
      next: () => {
        this.loadHolidays();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to delete holiday.');
      },
    });
  }
}
