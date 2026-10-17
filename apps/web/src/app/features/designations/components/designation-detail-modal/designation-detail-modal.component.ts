import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { Designation } from '../../models/designation.model';

@Component({
  selector: 'app-designation-detail-modal',
  imports: [CommonModule, DatePipe, IconComponent, BadgeComponent],
  templateUrl: './designation-detail-modal.component.html',
  styleUrl: './designation-detail-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignationDetailModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly designation = input<Designation | null>(null);

  readonly closeModal = output<void>();

  onClose(): void {
    this.closeModal.emit();
  }
}
