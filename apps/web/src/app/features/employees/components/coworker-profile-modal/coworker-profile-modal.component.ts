import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { Employee } from '../../models/employee.model';

@Component({
  selector: 'app-coworker-profile-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, AvatarComponent, BadgeComponent],
  templateUrl: './coworker-profile-modal.component.html',
  styleUrl: './coworker-profile-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoworkerProfileModalComponent {
  readonly employee = input.required<Employee>();
  readonly closeModal = output<void>();

  readonly copiedField = signal<string | null>(null);

  get fullName(): string {
    const emp = this.employee();
    return `${emp.firstName} ${emp.lastName}`.trim();
  }

  copyToClipboard(text: string, field: string): void {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      this.copiedField.set(field);
      setTimeout(() => this.copiedField.set(null), 2000);
    });
  }
}
