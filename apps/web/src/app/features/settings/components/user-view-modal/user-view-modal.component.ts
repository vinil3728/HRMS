import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SystemUser } from '../../models/settings.model';

@Component({
  selector: 'app-user-view-modal',
  imports: [CommonModule, DatePipe, IconComponent, BadgeComponent, AvatarComponent],
  templateUrl: './user-view-modal.component.html',
  styleUrl: './user-view-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserViewModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly user = input<SystemUser | null>(null);

  readonly closeModal = output<void>();
  readonly editUser = output<SystemUser>();
  readonly toggleStatus = output<SystemUser>();

  onClose(): void {
    this.closeModal.emit();
  }

  onEdit(): void {
    const u = this.user();
    if (u) {
      this.editUser.emit(u);
    }
  }

  onToggleStatus(): void {
    const u = this.user();
    if (u) {
      this.toggleStatus.emit(u);
    }
  }
}
