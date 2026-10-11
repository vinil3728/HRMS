import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { AuthService } from '../../../../core/services/auth.service';
import { LoanService } from '../../services/loan.service';
import {
  CompanyLoan,
  LoanMetrics,
  LoanRepayment,
  LoanStatus,
} from '../../models/loan.model';

import { LoanApplyModalComponent } from '../../components/loan-apply-modal/loan-apply-modal.component';
import { LoanApproveModalComponent } from '../../components/loan-approve-modal/loan-approve-modal.component';
import { LoanRejectModalComponent } from '../../components/loan-reject-modal/loan-reject-modal.component';
import { LoanDisburseModalComponent } from '../../components/loan-disburse-modal/loan-disburse-modal.component';
import { LoanRepaymentConfigModalComponent } from '../../components/loan-repayment-config-modal/loan-repayment-config-modal.component';
import { LoanRecordPaymentModalComponent } from '../../components/loan-record-payment-modal/loan-record-payment-modal.component';
import { LoanDetailModalComponent } from '../../components/loan-detail-modal/loan-detail-modal.component';

import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';

@Component({
  selector: 'app-loan-list',
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    SelectComponent,
    HasPermissionDirective,
    LoanApplyModalComponent,
    LoanApproveModalComponent,
    LoanRejectModalComponent,
    LoanDisburseModalComponent,
    LoanRepaymentConfigModalComponent,
    LoanRecordPaymentModalComponent,
    LoanDetailModalComponent,
  ],
  templateUrl: './loan-list.component.html',
  styleUrl: './loan-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanListComponent implements OnInit {
  private readonly loanService = inject(LoanService);
  private readonly authService = inject(AuthService);

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'DISBURSED', label: 'Disbursed' },
    { value: 'REPAYMENT_INITIATED', label: 'Repayment Initiated' },
    { value: 'ACTIVE', label: 'Repayment Active' },
    { value: 'FULLY_REPAID', label: 'Fully Repaid' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  readonly activeTab = signal<'my-loans' | 'all-loans'>('my-loans');
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.statusFilter() !== 'ALL'
  );

  readonly loading = signal<boolean>(false);
  readonly myLoans = signal<CompanyLoan[]>([]);
  readonly allLoans = signal<CompanyLoan[]>([]);
  readonly metrics = signal<LoanMetrics | null>(null);

  // Modal control signals
  readonly showApplyModal = signal<boolean>(false);
  readonly showApproveModal = signal<boolean>(false);
  readonly showRejectModal = signal<boolean>(false);
  readonly showDisburseModal = signal<boolean>(false);
  readonly showRepayConfigModal = signal<boolean>(false);
  readonly showRecordPaymentModal = signal<boolean>(false);
  readonly showDetailModal = signal<boolean>(false);

  readonly selectedLoan = signal<CompanyLoan | null>(null);
  readonly selectedRepayment = signal<LoanRepayment | null>(null);

  readonly isHrUser = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'ADMIN' || role === 'HR';
  });

  readonly filteredLoans = computed(() => {
    const list = this.activeTab() === 'my-loans' ? this.myLoans() : this.allLoans();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return list.filter((loan) => {
      const matchesStatus = status === 'ALL' || loan.status === status;
      if (!matchesStatus) return false;

      if (!query) return true;

      const empName = `${loan.employee?.firstName || ''} ${loan.employee?.lastName || ''}`.toLowerCase();
      const empCode = (loan.employee?.employeeCode || '').toLowerCase();
      const purpose = (loan.purpose || '').toLowerCase();
      const type = (loan.loanType || '').toLowerCase();

      return (
        empName.includes(query) ||
        empCode.includes(query) ||
        purpose.includes(query) ||
        type.includes(query)
      );
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredLoans().length / this.pageSize))
  );

  readonly displayedLoans = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredLoans().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    if (this.isHrUser()) {
      this.activeTab.set('all-loans');
    }
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.loanService.getMyLoans().subscribe({
      next: (loans) => this.myLoans.set(loans),
      error: () => this.myLoans.set([]),
    });

    if (this.isHrUser()) {
      this.loanService.getAllLoans().subscribe({
        next: (res) => this.allLoans.set(res.data),
        error: () => this.allLoans.set([]),
      });

      this.loanService.getMetrics().subscribe({
        next: (m) => this.metrics.set(m),
        error: () => this.metrics.set(null),
      });
    }

    this.loading.set(false);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  switchTab(tab: 'my-loans' | 'all-loans'): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.currentPage.set(1);
  }

  openApplyModal(): void {
    this.showApplyModal.set(true);
  }

  openDetailModal(loan: CompanyLoan): void {
    this.selectedLoan.set(loan);
    this.showDetailModal.set(true);
  }

  openApproveModal(loan: CompanyLoan): void {
    this.selectedLoan.set(loan);
    this.showApproveModal.set(true);
  }

  openRejectModal(loan: CompanyLoan): void {
    this.selectedLoan.set(loan);
    this.showRejectModal.set(true);
  }

  openDisburseModal(loan: CompanyLoan): void {
    this.selectedLoan.set(loan);
    this.showDisburseModal.set(true);
  }

  openRepaymentConfigModal(loan: CompanyLoan): void {
    this.selectedLoan.set(loan);
    this.showRepayConfigModal.set(true);
  }

  openRecordPaymentModal(event: { loan: CompanyLoan; repayment: LoanRepayment }): void {
    this.selectedLoan.set(event.loan);
    this.selectedRepayment.set(event.repayment);
    this.showRecordPaymentModal.set(true);
  }

  onLoanActionSuccess(updatedLoan: CompanyLoan): void {
    this.selectedLoan.set(updatedLoan);
    this.loadData();
  }

  startRepayment(loan: CompanyLoan): void {
    this.loanService.startRepayment(loan.id).subscribe({
      next: (res) => {
        this.onLoanActionSuccess(res);
      },
    });
  }
}
