import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { Timesheet, TimesheetStatus } from '../../models/timesheet.model';

@Component({
  selector: 'app-timesheet-detail-modal',
  imports: [CommonModule, IconComponent, BadgeComponent],
  templateUrl: './timesheet-detail-modal.component.html',
  styleUrl: './timesheet-detail-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimesheetDetailModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly timesheet = input<Timesheet | null>(null);

  readonly closeModal = output<void>();

  onClose(): void {
    this.closeModal.emit();
  }

  getStatusVariant(status: TimesheetStatus): string {
    switch (status) {
      case TimesheetStatus.APPROVED:
        return 'success';
      case TimesheetStatus.SUBMITTED:
        return 'warning';
      case TimesheetStatus.REJECTED:
        return 'error';
      default:
        return 'gray';
    }
  }
}
