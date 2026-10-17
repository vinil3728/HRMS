import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  numberAttribute,
} from '@angular/core';

export type IconName =
  | 'home'
  | 'dashboard'
  | 'users'
  | 'building'
  | 'id-card'
  | 'calendar'
  | 'clock'
  | 'dollar'
  | 'receipt'
  | 'trending-up'
  | 'file-text'
  | 'bar-chart'
  | 'settings'
  | 'search'
  | 'bell'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'logout'
  | 'log-out'
  | 'log-in'
  | 'arrow-right'
  | 'menu'
  | 'close'
  | 'check'
  | 'plus'
  | 'export'
  | 'eye'
  | 'edit'
  | 'more'
  | 'filter'
  | 'shield'
  | 'arrow-up-down'
  | 'x'
  | 'target'
  | 'alert-circle'
  | 'check-circle'
  | 'award'
  | 'info'
  | 'send'
  | 'pie-chart'
  | 'activity'
  | 'trash'
  | 'download'
  | 'archive'
  | 'grid'
  | 'mail'
  | 'phone'
  | 'list'
  | 'copy'
  | 'map-pin'
  | 'briefcase'
  | 'power'
  | 'slash'
  | 'x-circle'
  | 'toggle-left'
  | 'toggle-right';

@Component({
  selector: 'app-icon',
  imports: [CommonModule],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number, number | string>(18, {
    transform: numberAttribute,
  });
  readonly strokeWidth = input<number, number | string>(2, {
    transform: numberAttribute,
  });
  readonly customClass = input<string>('');
}
