import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { Permission } from '../../../../core/models/permission.model';
import { AuthService } from '../../../../core/services/auth.service';
import { RbacService } from '../../../../core/services/rbac.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { Employee } from '../../../employees/models/employee.model';
import { EmployeeService } from '../../../employees/services/employee.service';
import { MarkPaidModalComponent } from '../../components/mark-paid-modal/mark-paid-modal.component';
import { PayrollRunModalComponent } from '../../components/payroll-run-modal/payroll-run-modal.component';
import { PayslipDetailModalComponent } from '../../components/payslip-detail-modal/payslip-detail-modal.component';
import { PayslipEditModalComponent } from '../../components/payslip-edit-modal/payslip-edit-modal.component';
import { SalaryStructureModalComponent } from '../../components/salary-structure-modal/salary-structure-modal.component';
import {
  PayrollRun,
  PayrollRunStatus,
  PayrollSummary,
  Payslip,
  PayslipStatus,
  SalaryStructure,
} from '../../models/payroll.model';
import { PayrollService } from '../../services/payroll.service';
import { PayslipPdfService } from '../../services/payslip-pdf.service';

@Component({
  selector: 'app-payroll-page',
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    AvatarComponent,
    BadgeComponent,
    SelectComponent,
    HasPermissionDirective,
    PayrollRunModalComponent,
    SalaryStructureModalComponent,
    PayslipDetailModalComponent,
    PayslipEditModalComponent,
    MarkPaidModalComponent,
  ],
  templateUrl: './payroll-page.component.html',
  styleUrl: './payroll-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollPageComponent implements OnInit {
  private readonly payrollService = inject(PayrollService);
  private readonly pdfService = inject(PayslipPdfService);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  readonly rbacService = inject(RbacService);

  readonly Permission = Permission;
  readonly PayrollRunStatus = PayrollRunStatus;
  readonly PayslipStatus = PayslipStatus;

  readonly myEmployeeId = computed<string>(
    () => this.authService.currentUser()?.employeeId || ''
  );

  /**
   * True when the user holds any organization-wide payroll management permission.
   * When false (e.g. Employee / Manager with only PAYROLL_VIEW), the page operates
   * in self-service mode showing only the user's own payslips and salary structure.
   */
  readonly canManageOrgPayroll = computed<boolean>(() =>
    this.rbacService.hasAnyPermission([
      Permission.PAYROLL_SUMMARY_VIEW,
      Permission.PAYROLL_PROCESS,
      Permission.PAYROLL_CREATE,
      Permission.PAYROLL_UPDATE,
      Permission.PAYROLL_APPROVE,
      Permission.PAYROLL_REJECT,
      Permission.PAYROLL_DELETE,
    ])
  );

  // View Mode ('self' = My Payroll, 'org' = Organization Payroll)
  readonly viewMode = signal<'self' | 'org'>('self');

  readonly showViewTabs = computed<boolean>(
    () => !!this.myEmployeeId() && this.canManageOrgPayroll()
  );

  readonly isOrgView = computed<boolean>(
    () => this.canManageOrgPayroll() && (!this.myEmployeeId() || this.viewMode() === 'org')
  );

  readonly hasPersonalProfile = computed<boolean>(() => !!this.myEmployeeId());

  // Active Tab: 'runs' | 'payslips' | 'structures'
  readonly activeTab = signal<'runs' | 'payslips' | 'structures'>('payslips');

  // Data signals
  readonly runs = signal<PayrollRun[]>([]);
  readonly payslips = signal<Payslip[]>([]);
  readonly structures = signal<SalaryStructure[]>([]);
  readonly summary = signal<PayrollSummary | null>(null);
  readonly employeesList = signal<Employee[]>([]);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionMessage = signal<string | null>(null);

  // Computed KPI values (org-wide summary when in org view, personal figures when in self view)
  readonly kpiGrossPay = computed<number>(() => {
    if (this.isOrgView()) {
      return Number(this.summary()?.totalGrossPay || 0);
    }
    const latestSlip = this.payslips()[0];
    if (latestSlip) return Number(latestSlip.grossEarnings || 0);
    const myStruct = this.structures()[0];
    return myStruct ? Number(myStruct.grossSalary || 0) : 0;
  });

  readonly kpiNetPay = computed<number>(() => {
    if (this.isOrgView()) {
      return Number(this.summary()?.totalNetPay || 0);
    }
    const latestSlip = this.payslips()[0];
    if (latestSlip) return Number(latestSlip.netPay || 0);
    const myStruct = this.structures()[0];
    return myStruct ? this.computeStructureNet(myStruct) : 0;
  });

  readonly kpiDeductions = computed<number>(() => {
    if (this.isOrgView()) {
      return Number(this.summary()?.totalDeductions || 0);
    }
    const latestSlip = this.payslips()[0];
    if (latestSlip) return Number(latestSlip.totalDeductions || 0);
    const myStruct = this.structures()[0];
    if (!myStruct) return 0;
    return (
      Number(myStruct.providentFund || 0) +
      Number(myStruct.professionalTax || 0) +
      Number(myStruct.tds || 0)
    );
  });

  readonly kpiRecordCount = computed<number>(() => {
    if (this.isOrgView()) {
      return this.summary()?.totalPayslips || this.payslips().length;
    }
    return this.totalPayslips() || this.payslips().length;
  });

  // Payslip filtering & pagination
  searchQuery = '';
  filterMonth: number | null = null;
  filterYear: number | null = null;
  filterStatus = '';

  readonly currentPayslipPage = signal<number>(1);
  readonly pageSize = 10;
  readonly totalPayslips = signal<number>(0);
  readonly totalPayslipPages = signal<number>(1);

  readonly months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  readonly years = [2025, 2026, 2027];

  readonly monthFilterOptions: SelectOption<number | string>[] = [
    { value: '', label: 'All Months' },
    ...this.months,
  ];

  readonly yearFilterOptions: SelectOption<number | string>[] = [
    { value: '', label: 'All Years' },
    ...this.years.map((y) => ({ value: y, label: String(y) })),
  ];

  readonly statusFilterOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PROCESSED', label: 'Processed' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'PAID', label: 'Paid' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  // Modals state
  readonly isRunModalOpen = signal<boolean>(false);
  readonly isStructureModalOpen = signal<boolean>(false);
  readonly selectedStructure = signal<SalaryStructure | null>(null);

  readonly isPayslipDetailModalOpen = signal<boolean>(false);
  readonly isPayslipEditModalOpen = signal<boolean>(false);
  readonly selectedPayslip = signal<Payslip | null>(null);

  readonly isMarkPaidModalOpen = signal<boolean>(false);
  readonly selectedRunForPayment = signal<PayrollRun | null>(null);
  readonly selectedPayslipForPayment = signal<Payslip | null>(null);

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;

  readonly displayedPayslips = computed(() => {
    let list = [...this.payslips()];
    const query = this.searchQuery.trim().toLowerCase();

    if (query) {
      list = list.filter((p) => {
        const fullName = `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.toLowerCase();
        const code = (p.employee?.employeeCode || '').toLowerCase();
        const dept = (p.employee?.department?.name || '').toLowerCase();
        return fullName.includes(query) || code.includes(query) || dept.includes(query);
      });
    }

    if (this.filterStatus) {
      list = list.filter((p) => p.status === this.filterStatus);
    }

    return list;
  });

  readonly startPayslipIndex = computed(() => {
    if (this.totalPayslips() === 0) return 0;
    return (this.currentPayslipPage() - 1) * this.pageSize + 1;
  });

  readonly endPayslipIndex = computed(() => {
    return Math.min(this.currentPayslipPage() * this.pageSize, this.totalPayslips());
  });

  readonly payslipPaginationPages = computed(() => {
    const total = this.totalPayslipPages();
    const pages: number[] = [];
    for (let i = 1; i <= Math.min(total, 5); i++) {
      pages.push(i);
    }
    return pages;
  });

  getPeriodName(month: number, year: number): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${monthNames[month - 1] || month} ${year}`;
  }

  ngOnInit(): void {
    if (this.canManageOrgPayroll() && !this.myEmployeeId()) {
      this.viewMode.set('org');
    } else {
      this.viewMode.set('self');
    }
    this.activeTab.set(this.isOrgView() ? 'runs' : 'payslips');
    this.loadAllData();
  }

  setViewMode(mode: 'self' | 'org'): void {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    this.searchQuery = '';
    this.currentPayslipPage.set(1);
    this.activeTab.set(mode === 'org' ? 'runs' : 'payslips');
    this.loadAllData();
  }

  switchTab(mode: 'self' | 'org', tab: 'runs' | 'payslips' | 'structures'): void {
    if (this.viewMode() !== mode) {
      this.viewMode.set(mode);
      this.searchQuery = '';
      this.currentPayslipPage.set(1);
      this.activeTab.set(tab);
      this.loadAllData();
    } else {
      this.setActiveTab(tab);
    }
  }

  setActiveTab(tab: 'runs' | 'payslips' | 'structures'): void {
    if (tab === 'runs' && !this.isOrgView()) {
      return;
    }
    this.activeTab.set(tab);
    if (tab === 'runs' && this.runs().length === 0) {
      this.fetchRuns();
    } else if (tab === 'payslips') {
      this.fetchPayslips();
    } else if (tab === 'structures') {
      this.fetchStructures();
    }
  }

  loadAllData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.fetchPayslips();
    this.fetchStructures();

    if (this.isOrgView()) {
      this.fetchSummary();
      this.fetchRuns();
      this.fetchEmployees();
    }
  }

  fetchSummary(): void {
    if (!this.isOrgView()) return;
    this.payrollService.getSummary().subscribe({
      next: (sum) => this.summary.set(sum),
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(err.error?.message || 'Failed to load payroll summary metrics.');
      },
    });
  }

  fetchRuns(): void {
    if (!this.isOrgView()) return;
    this.payrollService.getRuns().subscribe({
      next: (data) => {
        this.runs.set(data);
        this.isLoading.set(false);
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(err.error?.message || 'Failed to load payroll batches.');
        this.isLoading.set(false);
      },
    });
  }

  fetchPayslips(): void {
    this.isLoading.set(true);
    const empFilter = !this.isOrgView() ? this.myEmployeeId() || undefined : undefined;
    this.payrollService
      .getPayslips({
        employeeId: empFilter,
        month: this.filterMonth || undefined,
        year: this.filterYear || undefined,
        status: (this.filterStatus as PayslipStatus) || undefined,
        page: this.currentPayslipPage(),
        limit: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.payslips.set(res.items || []);
          this.totalPayslips.set(res.total || 0);
          this.totalPayslipPages.set(res.totalPages || 1);
          this.isLoading.set(false);
        },
        error: (err: { error?: { message?: string } }) => {
          this.errorMessage.set(err.error?.message || 'Failed to load employee payslips.');
          this.isLoading.set(false);
        },
      });
  }

  fetchStructures(): void {
    if (this.isOrgView()) {
      this.payrollService.getSalaryStructures().subscribe({
        next: (data) => {
          this.structures.set(data);
        },
        error: (err: { error?: { message?: string } }) => {
          this.errorMessage.set(err.error?.message || 'Failed to load salary compensation structures.');
        },
      });
      return;
    }

    const myEmpId = this.myEmployeeId();
    if (!myEmpId) {
      this.structures.set([]);
      return;
    }

    this.payrollService
      .getSalaryStructureByEmployee(myEmpId)
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (struct) => {
          this.structures.set(struct ? [struct] : []);
        },
      });
  }

  fetchEmployees(): void {
    if (!this.canManageOrgPayroll()) return;
    this.employeeService
      .getDirectory()
      .pipe(catchError(() => of([] as Employee[])))
      .subscribe({
        next: (directory) => {
          this.employeesList.set(
            directory.filter((e) => !e.status || e.status === 'ACTIVE')
          );
        },
      });
  }

  computeStructureNet(st: SalaryStructure): number {
    const gross =
      Number(st.basicSalary) +
      Number(st.hra) +
      Number(st.conveyanceAllowance || 0) +
      Number(st.medicalAllowance || 0) +
      Number(st.specialAllowance || 0);

    const deductions =
      Number(st.providentFund || 0) +
      Number(st.professionalTax || 0) +
      Number(st.tds || 0);

    return gross - deductions;
  }

  // Filter actions
  hasPayslipFilters(): boolean {
    return (
      !!this.searchQuery.trim() ||
      this.filterMonth !== null ||
      this.filterYear !== null ||
      !!this.filterStatus
    );
  }

  applyPayslipFilters(): void {
    this.currentPayslipPage.set(1);
    this.fetchPayslips();
  }

  onMonthFilterChange(val: string): void {
    this.filterMonth = val ? Number(val) : null;
    this.applyPayslipFilters();
  }

  onYearFilterChange(val: string): void {
    this.filterYear = val ? Number(val) : null;
    this.applyPayslipFilters();
  }

  onStatusFilterChange(val: string): void {
    this.filterStatus = val;
    this.applyPayslipFilters();
  }

  onPayslipSearchChange(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPayslipPage.set(1);
      this.fetchPayslips();
    }, 300);
  }

  resetPayslipFilters(): void {
    this.searchQuery = '';
    this.filterMonth = null;
    this.filterYear = null;
    this.filterStatus = '';
    this.currentPayslipPage.set(1);
    this.fetchPayslips();
  }

  goToPayslipPage(page: number): void {
    if (page >= 1 && page <= this.totalPayslipPages()) {
      this.currentPayslipPage.set(page);
      this.fetchPayslips();
    }
  }

  viewRunPayslips(run: PayrollRun): void {
    this.filterMonth = run.month;
    this.filterYear = run.year;
    this.filterStatus = '';
    this.currentPayslipPage.set(1);
    this.activeTab.set('payslips');
    this.fetchPayslips();
  }

  // Run lifecycle actions
  openRunPayrollModal(): void {
    this.isRunModalOpen.set(true);
  }

  closeRunModal(): void {
    this.isRunModalOpen.set(false);
  }

  onRunSaved(run: PayrollRun): void {
    this.closeRunModal();
    const period = this.getPeriodName(run.month, run.year);
    this.showActionMessage(`Payroll batch cycle for ${period} generated successfully.`);
    this.loadAllData();
  }

  onApproveRun(run: PayrollRun): void {
    const period = this.getPeriodName(run.month, run.year);
    if (!confirm(`Are you sure you want to approve payroll batch cycle for ${period}?`)) {
      return;
    }

    this.payrollService.approveRun(run.id).subscribe({
      next: (updatedRun) => {
        const updatedPeriod = this.getPeriodName(updatedRun.month, updatedRun.year);
        this.showActionMessage(`Payroll batch for ${updatedPeriod} has been approved.`);
        this.loadAllData();
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(err.error?.message || 'Failed to approve payroll batch.');
      },
    });
  }

  openMarkRunPaid(run: PayrollRun): void {
    this.selectedRunForPayment.set(run);
    this.selectedPayslipForPayment.set(null);
    this.isMarkPaidModalOpen.set(true);
  }

  onDeleteRun(run: PayrollRun): void {
    const period = this.getPeriodName(run.month, run.year);
    if (!confirm(`Are you sure you want to delete the payroll cycle for ${period}? This will remove all generated draft payslips.`)) {
      return;
    }

    this.payrollService.deleteRun(run.id).subscribe({
      next: () => {
        this.showActionMessage(`Payroll batch for ${period} deleted.`);
        this.loadAllData();
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(err.error?.message || 'Failed to delete payroll batch.');
      },
    });
  }

  // Payslip lifecycle actions
  openPayslipDetailModal(slip: Payslip): void {
    this.selectedPayslip.set(slip);
    this.isPayslipDetailModalOpen.set(true);
  }

  closePayslipDetailModal(): void {
    this.isPayslipDetailModalOpen.set(false);
    this.selectedPayslip.set(null);
  }

  downloadPayslipPdf(slip: Payslip): void {
    this.pdfService.printPayslip(slip);
  }

  openEditPayslipModal(slip: Payslip): void {
    this.selectedPayslip.set(slip);
    this.isPayslipEditModalOpen.set(true);
  }

  closePayslipEditModal(): void {
    this.isPayslipEditModalOpen.set(false);
    this.selectedPayslip.set(null);
  }

  onPayslipUpdated(slip: Payslip): void {
    this.closePayslipEditModal();
    this.showActionMessage(`Payslip for ${slip.employee?.firstName} updated successfully.`);
    this.fetchPayslips();
    this.fetchSummary();
  }

  onApprovePayslip(slip: Payslip): void {
    this.payrollService.approvePayslip(slip.id).subscribe({
      next: (res) => {
        this.showActionMessage(`Payslip for ${res.employee?.firstName} approved.`);
        this.fetchPayslips();
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(err.error?.message || 'Failed to approve payslip.');
      },
    });
  }

  onRejectPayslip(slip: Payslip): void {
    const reason = prompt('Please enter reason for rejecting / holding this payslip:');
    if (!reason?.trim()) return;

    this.payrollService.rejectPayslip(slip.id, reason.trim()).subscribe({
      next: (res) => {
        this.showActionMessage(`Payslip for ${res.employee?.firstName} marked as rejected.`);
        this.fetchPayslips();
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage.set(err.error?.message || 'Failed to reject payslip.');
      },
    });
  }

  openMarkSlipPaid(slip: Payslip): void {
    this.selectedPayslipForPayment.set(slip);
    this.selectedRunForPayment.set(null);
    this.isMarkPaidModalOpen.set(true);
  }

  // Structure lifecycle actions
  openAddStructureModal(): void {
    this.selectedStructure.set(null);
    this.isStructureModalOpen.set(true);
  }

  openEditStructureModal(st: SalaryStructure): void {
    this.selectedStructure.set(st);
    this.isStructureModalOpen.set(true);
  }

  closeStructureModal(): void {
    this.isStructureModalOpen.set(false);
    this.selectedStructure.set(null);
  }

  onStructureSaved(): void {
    this.closeStructureModal();
    this.showActionMessage('Salary compensation structure saved successfully.');
    this.fetchStructures();
  }

  // Payment confirmation handler
  closeMarkPaidModal(): void {
    this.isMarkPaidModalOpen.set(false);
    this.selectedRunForPayment.set(null);
    this.selectedPayslipForPayment.set(null);
  }

  onPaymentConfirmed(res: { run?: PayrollRun; payslip?: Payslip }): void {
    this.closeMarkPaidModal();
    if (res.run) {
      this.showActionMessage(`Payroll batch cycle marked as PAID and disbursed.`);
    } else if (res.payslip) {
      this.showActionMessage(`Payslip disbursed and marked as PAID.`);
    }
    this.loadAllData();
  }

  // Badge variants
  getRunStatusVariant(status: PayrollRunStatus): string {
    switch (status) {
      case PayrollRunStatus.PAID:
        return 'success';
      case PayrollRunStatus.APPROVED:
        return 'success';
      case PayrollRunStatus.PROCESSING:
        return 'warning';
      case PayrollRunStatus.COMPLETED:
        return 'info';
      default:
        return 'gray';
    }
  }

  getPayslipStatusVariant(status: PayslipStatus): string {
    switch (status) {
      case PayslipStatus.PAID:
        return 'success';
      case PayslipStatus.APPROVED:
        return 'success';
      case PayslipStatus.PROCESSED:
        return 'info';
      case PayslipStatus.REJECTED:
        return 'error';
      default:
        return 'gray';
    }
  }

  // CSV Export
  exportCurrentViewCsv(): void {
    const tab = this.activeTab();
    let csvContent = '';
    let filename = '';

    if (tab === 'runs') {
      const items = this.runs();
      if (items.length === 0) return;
      const headers = ['Period', 'Month', 'Year', 'Total Employees', 'Gross Pay', 'Deductions', 'Net Pay', 'Status', 'Processed Date'];
      const rows = items.map((r) => [
        `"${this.getPeriodName(r.month, r.year)}"`,
        r.month,
        r.year,
        r.totalEmployees,
        r.totalGrossPay,
        r.totalDeductions,
        r.totalNetPay,
        `"${r.status}"`,
        `"${r.runDate || r.createdAt || ''}"`,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      filename = `payroll_runs_${new Date().toISOString().substring(0, 10)}.csv`;
    } else if (tab === 'payslips') {
      const items = this.displayedPayslips();
      if (items.length === 0) return;
      const headers = ['Employee Code', 'Employee Name', 'Department', 'Period', 'Basic Salary', 'Gross Pay', 'Deductions', 'Net Pay', 'Status'];
      const rows = items.map((p) => [
        `"${p.employee?.employeeCode || ''}"`,
        `"${p.employee?.firstName || ''} ${p.employee?.lastName || ''}"`,
        `"${p.employee?.department?.name || ''}"`,
        `"${this.getPeriodName(p.month, p.year)}"`,
        p.basicSalary,
        p.grossEarnings,
        p.totalDeductions,
        p.netPay,
        `"${p.status}"`,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      filename = `payslips_${new Date().toISOString().substring(0, 10)}.csv`;
    } else {
      const items = this.structures();
      if (items.length === 0) return;
      const headers = ['Employee Code', 'Employee Name', 'Department', 'Annual CTC', 'Basic', 'HRA', 'Conveyance', 'Medical', 'Special', 'PF', 'PT', 'TDS'];
      const rows = items.map((s) => [
        `"${s.employee?.employeeCode || ''}"`,
        `"${s.employee?.firstName || ''} ${s.employee?.lastName || ''}"`,
        `"${s.employee?.department?.name || ''}"`,
        s.ctc,
        s.basicSalary,
        s.hra,
        s.conveyanceAllowance || 0,
        s.medicalAllowance || 0,
        s.specialAllowance || 0,
        s.providentFund || 0,
        s.professionalTax || 0,
        s.tds || 0,
      ]);
      csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      filename = `salary_structures_${new Date().toISOString().substring(0, 10)}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private showActionMessage(msg: string): void {
    this.actionMessage.set(msg);
    setTimeout(() => {
      this.actionMessage.set(null);
    }, 4000);
  }
}
