import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeVariant = 'success' | 'warning' | 'info' | 'gray' | 'error';

@Component({
  selector: 'app-badge',
  imports: [CommonModule],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly variant = input<BadgeVariant | string>('gray');
  readonly showDot = input<boolean>(false);

  readonly variantClass = computed(() => {
    const v = this.variant()?.toLowerCase();
    switch (v) {
      case 'active':
      case 'success':
      case 'approved':
      case 'published':
        return 'success';
      case 'on leave':
      case 'on_leave':
      case 'warning':
      case 'pending':
        return 'warning';
      case 'probation':
      case 'info':
      case 'draft':
        return 'info';
      case 'rejected':
      case 'error':
        return 'error';
      case 'inactive':
      default:
        return 'gray';
    }
  });
}
