import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

export type DatePickerMode = 'single' | 'range';

export interface DateRangeValue {
  fromDate: string;
  toDate: string;
}

export interface CalendarDay {
  date: Date;
  dateStr: string; // 'YYYY-MM-DD'
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  isHovered: boolean;
  isDisabled: boolean;
}

export interface DatePreset {
  label: string;
  getFromTo: () => { fromDate: string; toDate: string };
}

function toLocalIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIso(str: string): Date | null {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

function formatDisplay(isoStr: string | null | undefined): string {
  if (!isoStr) return '';
  const d = parseIso(isoStr);
  if (!d) return isoStr;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

@Component({
  selector: 'app-date-picker',
  imports: [CommonModule, IconComponent],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
  ],
})
export class DatePickerComponent implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  // ── Inputs ────────────────────────────────────────────────────────────────
  readonly mode = input<DatePickerMode>('single');
  readonly placeholder = input<string>('');
  readonly minDate = input<string | undefined>(undefined);
  readonly maxDate = input<string | undefined>(undefined);
  readonly disabled = input<boolean>(false);
  readonly minWidth = input<string>('240px');
  readonly fullWidth = input<boolean>(false);
  readonly allowClear = input<boolean>(true);

  // Single mode direct bindings
  readonly value = input<string | undefined>(undefined);

  // Range mode direct bindings
  readonly fromDate = input<string | undefined>(undefined);
  readonly toDate = input<string | undefined>(undefined);

  // ── Outputs ───────────────────────────────────────────────────────────────
  readonly valueChange = output<string>();
  readonly rangeChange = output<DateRangeValue>();
  readonly fromDateChange = output<string>();
  readonly toDateChange = output<string>();
  readonly clear = output<void>();

  // ── Internal Reactive State ───────────────────────────────────────────────
  readonly isOpen = signal<boolean>(false);
  readonly openUpward = signal<boolean>(false);
  private readonly cvaDisabled = signal<boolean>(false);

  // Internal single value ('YYYY-MM-DD')
  private readonly internalSingle = signal<string>('');

  // Internal range values
  readonly selectedFrom = signal<string>('');
  readonly selectedTo = signal<string>('');

  // Hovered day for range preview
  readonly hoveredDate = signal<string | null>(null);

  // Calendar View month & year
  readonly viewDate = signal<Date>(new Date());

  readonly weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  readonly presets: DatePreset[] = [
    {
      label: 'Today',
      getFromTo: () => {
        const today = toLocalIso(new Date());
        return { fromDate: today, toDate: today };
      },
    },
    {
      label: 'Yesterday',
      getFromTo: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const y = toLocalIso(d);
        return { fromDate: y, toDate: y };
      },
    },
    {
      label: 'Last 7 Days',
      getFromTo: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return { fromDate: toLocalIso(start), toDate: toLocalIso(end) };
      },
    },
    {
      label: 'This Month',
      getFromTo: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { fromDate: toLocalIso(start), toDate: toLocalIso(end) };
      },
    },
    {
      label: 'Last Month',
      getFromTo: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { fromDate: toLocalIso(start), toDate: toLocalIso(end) };
      },
    },
  ];

  private onChangeFn: (val: any) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;

  constructor() {
    // Sync single value input
    effect(() => {
      const v = this.value();
      if (v !== undefined) {
        this.internalSingle.set(v);
        if (v && this.mode() === 'single') {
          const d = parseIso(v);
          if (d) this.viewDate.set(new Date(d.getFullYear(), d.getMonth(), 1));
        }
      }
    });

    // Sync range fromDate
    effect(() => {
      const f = this.fromDate();
      if (f !== undefined) {
        this.selectedFrom.set(f);
        if (f && this.mode() === 'range') {
          const d = parseIso(f);
          if (d) this.viewDate.set(new Date(d.getFullYear(), d.getMonth(), 1));
        }
      }
    });

    // Sync range toDate
    effect(() => {
      const t = this.toDate();
      if (t !== undefined) {
        this.selectedTo.set(t);
      }
    });
  }

  // ── Computed Properties ───────────────────────────────────────────────────
  readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());

  readonly currentSingle = computed(() => {
    const inp = this.value();
    return inp !== undefined ? inp : this.internalSingle();
  });

  readonly displayLabel = computed(() => {
    if (this.mode() === 'single') {
      const val = this.currentSingle();
      if (val) return formatDisplay(val);
      return this.placeholder() || 'Select date';
    } else {
      const from = this.selectedFrom();
      const to = this.selectedTo();
      if (from && to) {
        return `${formatDisplay(from)}  to  ${formatDisplay(to)}`;
      } else if (from) {
        return `${formatDisplay(from)}  to  Select end date`;
      }
      return this.placeholder() || 'dd/mm/yyyy  to  dd/mm/yyyy';
    }
  });

  readonly hasValue = computed(() => {
    if (this.mode() === 'single') {
      return Boolean(this.currentSingle());
    }
    return Boolean(this.selectedFrom() || this.selectedTo());
  });

  readonly currentMonthYearLabel = computed(() => {
    const vd = this.viewDate();
    return vd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const vd = this.viewDate();
    const year = vd.getFullYear();
    const month = vd.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = toLocalIso(new Date());
    const minD = this.minDate();
    const maxD = this.maxDate();

    const isSingle = this.mode() === 'single';
    const singleVal = this.currentSingle();
    const fromVal = this.selectedFrom();
    const toVal = this.selectedTo();
    const hoverVal = this.hoveredDate();

    // Determine range start & end (previewing hover if only start is picked)
    let rangeStart = fromVal;
    let rangeEnd = toVal;
    if (!isSingle && fromVal && !toVal && hoverVal) {
      if (hoverVal >= fromVal) {
        rangeEnd = hoverVal;
      } else {
        rangeStart = hoverVal;
        rangeEnd = fromVal;
      }
    }

    const days: CalendarDay[] = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const dStr = toLocalIso(d);
      days.push(this.createCalendarDay(d, dStr, false, todayStr, isSingle, singleVal, rangeStart, rangeEnd, minD, maxD));
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = toLocalIso(d);
      days.push(this.createCalendarDay(d, dStr, true, todayStr, isSingle, singleVal, rangeStart, rangeEnd, minD, maxD));
    }

    // Next month padding to fill grid (up to 42 cells = 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = toLocalIso(d);
      days.push(this.createCalendarDay(d, dStr, false, todayStr, isSingle, singleVal, rangeStart, rangeEnd, minD, maxD));
    }

    return days;
  });

  private createCalendarDay(
    d: Date,
    dStr: string,
    isCurrentMonth: boolean,
    todayStr: string,
    isSingle: boolean,
    singleVal: string,
    rangeStart: string,
    rangeEnd: string,
    minD?: string,
    maxD?: string
  ): CalendarDay {
    const isToday = dStr === todayStr;
    const isStart = !isSingle && Boolean(rangeStart && dStr === rangeStart);
    const isEnd = !isSingle && Boolean(rangeEnd && dStr === rangeEnd);
    const isInRange =
      !isSingle &&
      Boolean(rangeStart && rangeEnd && dStr > rangeStart && dStr < rangeEnd);
    const isSelected = isSingle ? dStr === singleVal : isStart || isEnd;

    let isDisabled = false;
    if (minD && dStr < minD) isDisabled = true;
    if (maxD && dStr > maxD) isDisabled = true;

    return {
      date: d,
      dateStr: dStr,
      dayNumber: d.getDate(),
      isCurrentMonth,
      isToday,
      isSelected,
      isRangeStart: isStart,
      isRangeEnd: isEnd,
      isInRange,
      isHovered: false,
      isDisabled,
    };
  }

  // ── ControlValueAccessor ──────────────────────────────────────────────────
  writeValue(obj: any): void {
    if (this.mode() === 'single') {
      this.internalSingle.set(typeof obj === 'string' ? obj : '');
    } else {
      if (obj && typeof obj === 'object') {
        this.selectedFrom.set(obj.fromDate || obj.from || '');
        this.selectedTo.set(obj.toDate || obj.to || '');
      } else {
        this.selectedFrom.set('');
        this.selectedTo.set('');
      }
    }
  }

  registerOnChange(fn: (val: any) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  // ── Dropdown Toggle & Position ────────────────────────────────────────────
  toggleDropdown(): void {
    if (this.isDisabled()) return;
    const nextState = !this.isOpen();
    if (nextState) {
      this.computePosition();
      // Ensure view shows selected date
      const activeStr = this.mode() === 'single' ? this.currentSingle() : this.selectedFrom();
      if (activeStr) {
        const d = parseIso(activeStr);
        if (d) this.viewDate.set(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
    this.isOpen.set(nextState);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.hoveredDate.set(null);
    this.onTouchedFn();
  }

  private computePosition(): void {
    const el = this.elementRef.nativeElement;
    const rect = el.getBoundingClientRect();
    const dropdownHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    this.openUpward.set(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const clickedInside = this.elementRef.nativeElement.contains(event.target as Node);
    if (!clickedInside) {
      this.closeDropdown();
    }
  }

  // ── Month & Year Navigation ───────────────────────────────────────────────
  prevMonth(): void {
    const vd = this.viewDate();
    this.viewDate.set(new Date(vd.getFullYear(), vd.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const vd = this.viewDate();
    this.viewDate.set(new Date(vd.getFullYear(), vd.getMonth() + 1, 1));
  }

  goToToday(): void {
    const now = new Date();
    this.viewDate.set(new Date(now.getFullYear(), now.getMonth(), 1));
    if (this.mode() === 'single') {
      this.selectSingleDate(toLocalIso(now));
    }
  }

  // ── Day Click Handlers ────────────────────────────────────────────────────
  onDayClick(day: CalendarDay): void {
    if (day.isDisabled) return;

    if (this.mode() === 'single') {
      this.selectSingleDate(day.dateStr);
    } else {
      this.handleRangeDayClick(day.dateStr);
    }
  }

  private selectSingleDate(dateStr: string): void {
    this.internalSingle.set(dateStr);
    this.valueChange.emit(dateStr);
    this.onChangeFn(dateStr);
    this.closeDropdown();
  }

  private handleRangeDayClick(dateStr: string): void {
    const from = this.selectedFrom();
    const to = this.selectedTo();

    if (!from || (from && to)) {
      // First click: start new range
      this.selectedFrom.set(dateStr);
      this.selectedTo.set('');
      this.hoveredDate.set(null);
    } else if (from && !to) {
      // Second click: finish range
      let finalFrom = from;
      let finalTo = dateStr;
      if (dateStr < from) {
        finalFrom = dateStr;
        finalTo = from;
      }
      this.selectedFrom.set(finalFrom);
      this.selectedTo.set(finalTo);
      this.hoveredDate.set(null);
      this.emitRangeChange(finalFrom, finalTo);
      this.closeDropdown();
    }
  }

  onDayHover(day: CalendarDay): void {
    if (this.mode() === 'range' && this.selectedFrom() && !this.selectedTo()) {
      this.hoveredDate.set(day.dateStr);
    }
  }

  // ── Preset Selection ──────────────────────────────────────────────────────
  applyPreset(preset: DatePreset): void {
    const { fromDate, toDate } = preset.getFromTo();
    this.selectedFrom.set(fromDate);
    this.selectedTo.set(toDate);
    this.emitRangeChange(fromDate, toDate);
    const d = parseIso(fromDate);
    if (d) this.viewDate.set(new Date(d.getFullYear(), d.getMonth(), 1));
    this.closeDropdown();
  }

  private emitRangeChange(fromDate: string, toDate: string): void {
    const range: DateRangeValue = { fromDate, toDate };
    this.rangeChange.emit(range);
    this.fromDateChange.emit(fromDate);
    this.toDateChange.emit(toDate);
    this.onChangeFn(range);
  }

  // ── Clear Selection ───────────────────────────────────────────────────────
  onClear(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (this.mode() === 'single') {
      this.internalSingle.set('');
      this.valueChange.emit('');
      this.onChangeFn('');
    } else {
      this.selectedFrom.set('');
      this.selectedTo.set('');
      this.rangeChange.emit({ fromDate: '', toDate: '' });
      this.fromDateChange.emit('');
      this.toDateChange.emit('');
      this.onChangeFn({ fromDate: '', toDate: '' });
    }
    this.clear.emit();
  }
}
