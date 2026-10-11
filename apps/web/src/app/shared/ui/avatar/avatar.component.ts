import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  imports: [CommonModule],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  readonly name = input<string>('');
  readonly initials = input<string>('');
  readonly size = input<number>(36);
  readonly color = input<string>('');

  private readonly colors = [
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#059669', // Emerald
    '#d97706', // Amber
    '#dc2626', // Red
    '#4f46e5', // Indigo
    '#0891b2', // Cyan
    '#475467', // Slate
  ];

  readonly displayInitials = computed(() => {
    if (this.initials()) return this.initials().toUpperCase();
    const raw = this.name()?.trim();
    if (!raw) return 'U';
    const parts = raw.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return raw.substring(0, 2).toUpperCase();
  });

  readonly fontSize = computed(() => Math.round(this.size() * 0.4));

  readonly bgColor = computed(() => {
    if (this.color()) return this.color();
    const key = this.name() || this.initials() || 'user';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.colors.length;
    return this.colors[index];
  });
}
