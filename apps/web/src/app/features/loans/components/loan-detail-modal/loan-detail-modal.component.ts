import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { CompanyLoan, LoanRepayment, LoanStatus, RepaymentMode } from '../../models/loan.model';
import { LoanService } from '../../services/loan.service';
import { API_CONFIG } from '../../../../core/config/api.config';

@Component({
  selector: 'app-loan-detail-modal',
  imports: [CommonModule, IconComponent],
  templateUrl: './loan-detail-modal.component.html',
  styleUrl: './loan-detail-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanDetailModalComponent {
  private readonly loanService = inject(LoanService);

  readonly isOpen = input<boolean>(false);
  readonly loan = input<CompanyLoan | null>(null);
  readonly isHr = input<boolean>(false);

  readonly closeModal = output<void>();
  readonly openRepaymentConfig = output<CompanyLoan>();
  readonly openRecordPayment = output<{ loan: CompanyLoan; repayment: LoanRepayment }>();
  readonly loanUpdated = output<CompanyLoan>();

  readonly startingRepayment = signal<boolean>(false);
  readonly actionError = signal<string>('');

  readonly principal = computed(() => {
    const l = this.loan();
    if (!l) return 0;
    return Number(l.approvedAmount || l.amount || 0);
  });

  readonly totalRepaid = computed(() => {
    const l = this.loan();
    if (!l) return 0;
    return Number(l.totalRepaid || 0);
  });

  readonly remainingBalance = computed(() => {
    const l = this.loan();
    if (!l) return 0;
    return Number(l.remainingBalance || 0);
  });

  readonly repaymentPercent = computed(() => {
    const p = this.principal();
    if (p <= 0) return 0;
    const r = this.totalRepaid();
    return Math.min(100, Math.round((r / p) * 100));
  });

  onCancel(): void {
    this.actionError.set('');
    this.closeModal.emit();
  }

  onConfigureRepayment(): void {
    const l = this.loan();
    if (l) {
      this.openRepaymentConfig.emit(l);
    }
  }

  onStartRepayment(): void {
    const l = this.loan();
    if (!l) return;

    this.startingRepayment.set(true);
    this.actionError.set('');

    this.loanService.startRepayment(l.id).subscribe({
      next: (updated) => {
        this.startingRepayment.set(false);
        this.loanUpdated.emit(updated);
      },
      error: (err) => {
        this.startingRepayment.set(false);
        const msg = err?.error?.message || 'Failed to start repayment schedule.';
        this.actionError.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  onPayInstallment(repayment: LoanRepayment): void {
    const l = this.loan();
    if (l) {
      this.openRecordPayment.emit({ loan: l, repayment });
    }
  }

  getReceiptFullUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_CONFIG.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
