import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { Payslip, PayslipStatus } from '../../models/payroll.model';
import { PayslipPdfService } from '../../services/payslip-pdf.service';

@Component({
  selector: 'app-payslip-detail-modal',
  imports: [CommonModule, DatePipe, DecimalPipe, IconComponent, BadgeComponent],
  templateUrl: './payslip-detail-modal.component.html',
  styleUrl: './payslip-detail-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayslipDetailModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly payslip = input<Payslip | null>(null);

  readonly closeModal = output<void>();
  readonly editAdjustments = output<Payslip>();
  readonly approve = output<Payslip>();
  readonly markPaid = output<Payslip>();

  private readonly pdfService = inject(PayslipPdfService);

  private readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  getMonthName(monthNum: number): string {
    return this.monthNames[monthNum - 1] || `Month ${monthNum}`;
  }

  formatAccountNumber(accNum?: string): string {
    if (!accNum) return 'XXXX-XXXX-1234';
    if (accNum.length <= 4) return accNum;
    return '•••• •••• ' + accNum.slice(-4);
  }

  getStatusVariant(status: PayslipStatus): 'active' | 'inactive' | 'pending' {
    switch (status) {
      case PayslipStatus.PAID:
        return 'active';
      case PayslipStatus.APPROVED:
        return 'pending';
      case PayslipStatus.REJECTED:
        return 'inactive';
      default:
        return 'pending';
    }
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onPrint(): void {
    const s = this.payslip();
    if (s) {
      this.pdfService.printPayslip(s);
    }
  }

  onEditAdjustments(): void {
    const s = this.payslip();
    if (s) this.editAdjustments.emit(s);
  }

  onApprove(): void {
    const s = this.payslip();
    if (s) this.approve.emit(s);
  }

  onMarkPaid(): void {
    const s = this.payslip();
    if (s) this.markPaid.emit(s);
  }
}
