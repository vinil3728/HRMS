import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { Department } from '../../models/department.model';

@Component({
  selector: 'app-department-detail-modal',
  imports: [CommonModule, DatePipe, IconComponent, BadgeComponent],
  templateUrl: './department-detail-modal.component.html',
  styleUrl: './department-detail-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentDetailModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly department = input<Department | null>(null);

  readonly closeModal = output<void>();

  onClose(): void {
    this.closeModal.emit();
  }
}
