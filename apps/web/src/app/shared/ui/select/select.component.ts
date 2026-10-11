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

export interface SelectOption<T = string | number> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-select',
  imports: [CommonModule, IconComponent],
  templateUrl: './select.component.html',
  styleUrl: './select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly options = input.required<SelectOption<string | number>[]>();
  readonly value = input<string | number | undefined>(undefined);
  readonly placeholder = input<string>('Select...');
  readonly minWidth = input<string>('175px');
  readonly fullWidth = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly valueChange = output<string>();

  readonly isOpen = signal<boolean>(false);
  readonly openUpward = signal<boolean>(false);
  readonly menuMaxHeight = signal<number>(250);
  private readonly internalValue = signal<string | number>('');
  private readonly cvaDisabled = signal<boolean>(false);

  private onChangeFn: (val: string | number) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;

  constructor() {
    effect(() => {
      const inputVal = this.value();
      if (inputVal !== undefined) {
        this.internalValue.set(inputVal);
      }
    });
  }

  readonly currentValue = computed(() => {
    const inputVal = this.value();
    return inputVal !== undefined ? inputVal : this.internalValue();
  });

  readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());

  readonly selectedLabel = computed(() => {
    const current = this.currentValue();
    const match = this.options().find(
      (opt) => String(opt.value) === String(current ?? '')
    );
    return match ? match.label : this.placeholder();
  });

  writeValue(val: string | number | null | undefined): void {
    this.internalValue.set(val ?? '');
  }

  registerOnChange(fn: (val: string | number) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  toggleDropdown(): void {
    if (this.isDisabled()) return;
    const nextState = !this.isOpen();
    if (nextState) {
      this.updateDropdownDirection();
    }
    this.isOpen.set(nextState);
  }

  private updateDropdownDirection(): void {
    const hostEl = this.elementRef.nativeElement;
    const triggerEl =
      hostEl.querySelector('.custom-select-trigger') ?? hostEl;
    const triggerRect = triggerEl.getBoundingClientRect();

    let topBoundary = 0;
    let bottomBoundary = window.innerHeight;

    let parent = hostEl.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const overflow = style.overflow;
      if (
        overflowY === 'hidden' ||
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'clip' ||
        overflow === 'hidden' ||
        overflow === 'auto' ||
        overflow === 'scroll' ||
        overflow === 'clip'
      ) {
        const parentRect = parent.getBoundingClientRect();
        topBoundary = Math.max(topBoundary, parentRect.top);
        bottomBoundary = Math.min(bottomBoundary, parentRect.bottom);
      }
      parent = parent.parentElement;
    }

    const spaceBelow = bottomBoundary - triggerRect.bottom;
    const spaceAbove = triggerRect.top - topBoundary;
    const estimatedMenuHeight = Math.min(250, this.options().length * 38 + 12);

    const shouldOpenUp =
      spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
    this.openUpward.set(shouldOpenUp);

    const availableSpace = shouldOpenUp ? spaceAbove : spaceBelow;
    this.menuMaxHeight.set(
      Math.min(250, Math.max(120, Math.floor(availableSpace - 14)))
    );
  }

  isSelected(optValue: string | number): boolean {
    return String(optValue) === String(this.currentValue() ?? '');
  }

  selectOption(val: string | number): void {
    this.isOpen.set(false);
    this.internalValue.set(val);
    this.onChangeFn(val);
    this.onTouchedFn();
    this.valueChange.emit(String(val));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.isOpen.set(false);
      this.onTouchedFn();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.onTouchedFn();
    }
  }
}
