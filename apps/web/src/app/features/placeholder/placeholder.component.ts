import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BadgeComponent } from '../../shared/ui/badge/badge.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-placeholder',
  imports: [CommonModule, IconComponent, BadgeComponent],
  templateUrl: './placeholder.component.html',
  styleUrl: './placeholder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  get pageTitle(): string {
    return (this.route.snapshot.data['title'] as string) || 'Feature Module';
  }
}
