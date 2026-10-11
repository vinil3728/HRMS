import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { Branch } from '../../models/branch.model';

@Component({
  selector: 'app-branch-detail-modal',
  imports: [CommonModule, IconComponent, BadgeComponent],
  templateUrl: './branch-detail-modal.component.html',
  styleUrl: './branch-detail-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchDetailModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly branch = input<Branch | null>(null);

  readonly closeModal = output<void>();

  onClose(): void {
    this.closeModal.emit();
  }
}
