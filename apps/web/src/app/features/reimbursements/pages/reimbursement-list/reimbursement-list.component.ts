import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { RbacService } from '../../../../core/services/rbac.service';
import { Permission } from '../../../../core/models/permission.model';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { BadgeComponent, BadgeVariant } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { Employee } from '../../../employees/models/employee.model';
import { EmployeeService } from '../../../employees/services/employee.service';
import { ReimbursementFormModalComponent } from '../../components/reimbursement-form-modal/reimbursement-form-modal.component';
import { ReimbursementActionModalComponent } from '../../components/reimbursement-action-modal/reimbursement-action-modal.component';
import {
  REIMBURSEMENT_CATEGORIES,
  Reimbursement,
  ReimbursementStatus,
} from '../../models/reimbursement.model';
import { ReimbursementService } from '../../services/reimbursement.service';

@Component({
  selector: 'app-reimbursement-list',
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    HasPermissionDirective,
    ReimbursementFormModalComponent,
    ReimbursementActionModalComponent,
  ],
  templateUrl: './reimbursement-list.component.html',
  styleUrl: './reimbursement-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementListComponent implements OnInit {
  private readonly reimbursementService = inject(ReimbursementService);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  private readonly rbacService = inject(RbacService);

  readonly Permission = Permission;
  readonly categories = REIMBURSEMENT_CATEGORIES;

  readonly employees = signal<Employee[]>([]);
  readonly selectedEmployeeId = signal<string>('');
  readonly viewMode = signal<'self' | 'org'>('self');

  readonly myEmployeeId = computed<string>(
    () => this.authService.currentUser()?.employeeId || ''
  );

  /**
   * True when the user holds org-wide employee/reimbursement settlement permissions.
   */
  readonly canManageAllClaims = computed<boolean>(() =>
    this.rbacService.hasAnyPermission([
      Permission.REIMBURSEMENT_PAY,
      Permission.EMPLOYEE_VIEWS,
      Permission.EMPLOYEE_UPDATE,
    ])
  );

  /**
   * True when the user holds any permission to review, approve, reject, or settle other employees' claims.
   */
  readonly canInspectOtherClaims = computed<boolean>(() =>
    this.rbacService.hasAnyPermission([
      Permission.REIMBURSEMENT_APPROVE,
      Permission.REIMBURSEMENT_REJECT,
      Permission.REIMBURSEMENT_PAY,
      Permission.EMPLOYEE_VIEWS,
      Permission.EMPLOYEE_UPDATE,
    ])
  );

  /**
   * Employees available in the Organization / Team Claims view:
   * - All other employees if user has org-wide permissions
   * - Direct reports (emp.manager?.id === myEmployeeId) otherwise
   */
  readonly manageableEmployees = computed<Employee[]>(() => {
    const all = this.employees();
    const myId = this.myEmployeeId();
    if (this.canManageAllClaims()) {
      return myId ? all.filter((emp) => emp.id !== myId) : all;
    }
    if (!myId) {
      return [];
    }
    return all.filter((emp) => emp.manager?.id === myId && emp.id !== myId);
  });

  readonly canViewOrgTab = computed<boolean>(
    () => this.canInspectOtherClaims() && this.manageableEmployees().length > 0
  );

  readonly showViewTabs = computed<boolean>(
    () => !!this.myEmployeeId() && this.canViewOrgTab()
  );

  readonly orgTabLabel = computed<string>(() =>
    this.canManageAllClaims() ? 'Organization Claims' : 'Team Claims'
  );

  readonly isOrgView = computed<boolean>(
    () => this.canViewOrgTab() && (!this.myEmployeeId() || this.viewMode() === 'org')
  );

  readonly activeTargetEmployeeId = computed<string>(() =>
    this.isOrgView() ? this.selectedEmployeeId() : this.myEmployeeId()
  );

  readonly claims = signal<Reimbursement[]>([]);
  readonly loading = signal<boolean>(true);
  readonly statusFilter = signal<string>('ALL');
  readonly categoryFilter = signal<string>('ALL');
  readonly currentPage = signal<number>(1);
  readonly totalRecords = signal<number>(0);
  readonly totalPages = signal<number>(1);

  readonly isFormModalOpen = signal<boolean>(false);
  readonly isActionModalOpen = signal<boolean>(false);
  readonly actionType = signal<'REJECT' | 'UPLOAD_RECEIPT'>('REJECT');
  readonly selectedClaim = signal<Reimbursement | null>(null);

  readonly hasActiveFilters = computed<boolean>(() => {
    return this.statusFilter() !== 'ALL' || this.categoryFilter() !== 'ALL';
  });

  readonly employeeOptions = computed<SelectOption[]>(() =>
    this.manageableEmployees().map((emp) => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`,
    }))
  );

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SUBMITTED', label: 'Submitted (Pending Review)' },
    { value: 'APPROVED', label: 'Approved (Awaiting Payout)' },
    { value: 'PAID', label: 'Paid (Settled)' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  readonly categoryOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Categories' },
    ...REIMBURSEMENT_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
  ];

  readonly selectedEmployee = computed(() => {
    const id = this.activeTargetEmployeeId();
    return this.employees().find((e) => e.id === id) || null;
  });

  readonly isViewingOwnClaims = computed(() => {
    const myEmpId = this.myEmployeeId();
    return !!myEmpId && this.activeTargetEmployeeId() === myEmpId;
  });

  readonly canReviewSelectedClaims = computed(() => {
    return this.isOrgView() && !this.isViewingOwnClaims();
  });

  readonly totalClaimsCount = computed(() => this.claims().length);

  readonly pendingAmount = computed(() => {
    return this.claims()
      .filter((c) => c.status === ReimbursementStatus.SUBMITTED)
      .reduce((sum, c) => sum + Number(c.amount), 0);
  });

  readonly approvedAmount = computed(() => {
    return this.claims()
      .filter((c) => c.status === ReimbursementStatus.APPROVED)
      .reduce((sum, c) => c.amount ? sum + Number(c.amount) : sum, 0);
  });

  readonly paidAmount = computed(() => {
    return this.claims()
      .filter((c) => c.status === ReimbursementStatus.PAID)
      .reduce((sum, c) => sum + Number(c.amount), 0);
  });

  ngOnInit(): void {
    this.initializeData();
  }

  private initializeData(): void {
    const currentUser = this.authService.currentUser();
    const myEmpId = currentUser?.employeeId;
    const sessionEmployee = currentUser?.employee as Employee | undefined;

    if (this.canInspectOtherClaims()) {
      this.employeeService.getDirectory().subscribe({
        next: (directory) => {
          const list = [...directory];
          if (myEmpId && !list.some((e) => e.id === myEmpId) && sessionEmployee) {
            list.unshift(sessionEmployee);
          }
          this.employees.set(list);

          const firstOther = this.manageableEmployees()[0]?.id || '';
          this.selectedEmployeeId.set(firstOther);

          if (!myEmpId && firstOther) {
            this.viewMode.set('org');
          } else {
            this.viewMode.set('self');
          }

          const targetId = this.activeTargetEmployeeId();
          if (targetId) {
            this.loadClaims(targetId);
          } else {
            this.loading.set(false);
          }
        },
        error: () => {
          if (myEmpId) {
            if (sessionEmployee) {
              this.employees.set([sessionEmployee]);
            }
            this.viewMode.set('self');
            this.loadClaims(myEmpId);
          } else {
            this.loading.set(false);
          }
        },
      });
    } else if (myEmpId) {
      this.viewMode.set('self');
      if (sessionEmployee) {
        this.employees.set([sessionEmployee]);
        this.loadClaims(myEmpId);
      } else {
        this.employeeService.getMyProfile().subscribe({
          next: (emp) => {
            this.employees.set([emp]);
            this.loadClaims(myEmpId);
          },
          error: () => {
            this.loadClaims(myEmpId);
          },
        });
      }
    } else {
      this.loading.set(false);
    }
  }

  setViewMode(mode: 'self' | 'org'): void {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    this.currentPage.set(1);

    if (mode === 'org' && !this.selectedEmployeeId()) {
      const firstOther = this.manageableEmployees()[0]?.id || '';
      this.selectedEmployeeId.set(firstOther);
    }

    const targetId = this.activeTargetEmployeeId();
    if (targetId) {
      this.loadClaims(targetId);
    } else {
      this.claims.set([]);
      this.totalRecords.set(0);
    }
  }

  loadClaims(employeeId: string): void {
    if (!employeeId) return;

    this.loading.set(true);
    const params = {
      page: this.currentPage(),
      limit: 15,
      status:
        this.statusFilter() !== 'ALL'
          ? (this.statusFilter() as ReimbursementStatus)
          : undefined,
      category:
        this.categoryFilter() !== 'ALL' ? this.categoryFilter() : undefined,
    };

    this.reimbursementService.getReimbursements(employeeId, params).subscribe({
      next: (res) => {
        this.claims.set(res.data);
        this.totalRecords.set(res.total);
        this.totalPages.set(res.totalPages || 1);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onEmployeeChange(newId: string): void {
    this.selectedEmployeeId.set(newId);
    this.currentPage.set(1);
    this.loadClaims(newId);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadClaims(empId);
    }
  }

  onCategoryFilterChange(value: string): void {
    this.categoryFilter.set(value);
    this.currentPage.set(1);
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadClaims(empId);
    }
  }

  resetFilters(): void {
    this.statusFilter.set('ALL');
    this.categoryFilter.set('ALL');
    this.currentPage.set(1);
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadClaims(empId);
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    const empId = this.activeTargetEmployeeId();
    if (empId) {
      this.loadClaims(empId);
    }
  }

  openCreateModal(): void {
    this.selectedClaim.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditModal(claim: Reimbursement): void {
    this.selectedClaim.set(claim);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.selectedClaim.set(null);
  }

  onClaimSaved(): void {
    const empId = this.activeTargetEmployeeId();
    this.closeFormModal();
    if (empId) {
      this.loadClaims(empId);
    }
  }

  openRejectModal(claim: Reimbursement): void {
    this.selectedClaim.set(claim);
    this.actionType.set('REJECT');
    this.isActionModalOpen.set(true);
  }

  openUploadReceiptModal(claim: Reimbursement): void {
    this.selectedClaim.set(claim);
    this.actionType.set('UPLOAD_RECEIPT');
    this.isActionModalOpen.set(true);
  }

  closeActionModal(): void {
    this.isActionModalOpen.set(false);
    this.selectedClaim.set(null);
  }

  onActionCompleted(): void {
    const empId = this.activeTargetEmployeeId();
    this.closeActionModal();
    if (empId) {
      this.loadClaims(empId);
    }
  }

  onSubmitClaim(claim: Reimbursement): void {
    const confirmSubmit = window.confirm(
      `Submit expense claim for ₹${claim.amount} (${claim.category}) for review?`
    );
    if (!confirmSubmit) return;

    const empId = this.activeTargetEmployeeId();
    this.reimbursementService.submitReimbursement(empId, claim.id).subscribe({
      next: () => {
        if (empId) {
          this.loadClaims(empId);
        }
      },
    });
  }

  onApproveClaim(claim: Reimbursement): void {
    const confirmApprove = window.confirm(
      `Approve reimbursement claim for ₹${claim.amount}?`
    );
    if (!confirmApprove) return;

    const empId = this.activeTargetEmployeeId();
    this.reimbursementService.approveReimbursement(empId, claim.id).subscribe({
      next: () => {
        if (empId) {
          this.loadClaims(empId);
        }
      },
    });
  }

  onPayClaim(claim: Reimbursement): void {
    const confirmPay = window.confirm(
      `Mark claim for ₹${claim.amount} as paid/settled?`
    );
    if (!confirmPay) return;

    const empId = this.activeTargetEmployeeId();
    this.reimbursementService.markAsPaid(empId, claim.id).subscribe({
      next: () => {
        if (empId) {
          this.loadClaims(empId);
        }
      },
    });
  }

  onDeleteClaim(claim: Reimbursement): void {
    const confirmDel = window.confirm(
      'Are you sure you want to delete this draft claim?'
    );
    if (!confirmDel) return;

    const empId = this.activeTargetEmployeeId();
    this.reimbursementService.deleteReimbursement(empId, claim.id).subscribe({
      next: () => {
        if (empId) {
          this.loadClaims(empId);
        }
      },
    });
  }

  downloadReceipt(claim: Reimbursement): void {
    const empId = this.activeTargetEmployeeId();
    if (!empId || !claim.receiptFileName) return;

    this.reimbursementService.downloadReceipt(empId, claim.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = claim.receiptFileName || `receipt_${claim.id}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
    });
  }

  formatCurrency(val: number): string {
    return Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  getStatusVariant(status: ReimbursementStatus): BadgeVariant {
    switch (status) {
      case ReimbursementStatus.PAID:
        return 'success';
      case ReimbursementStatus.APPROVED:
        return 'info';
      case ReimbursementStatus.SUBMITTED:
        return 'warning';
      case ReimbursementStatus.REJECTED:
        return 'error';
      case ReimbursementStatus.DRAFT:
      case ReimbursementStatus.CANCELLED:
      default:
        return 'gray';
    }
  }

  formatStatusLabel(status: ReimbursementStatus): string {
    switch (status) {
      case ReimbursementStatus.DRAFT:
        return 'Draft';
      case ReimbursementStatus.SUBMITTED:
        return 'Pending Review';
      case ReimbursementStatus.APPROVED:
        return 'Approved (Unpaid)';
      case ReimbursementStatus.PAID:
        return 'Paid';
      case ReimbursementStatus.REJECTED:
        return 'Rejected';
      case ReimbursementStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  }

  exportCsv(): void {
    const list = this.claims();
    if (list.length === 0) return;

    const emp = this.selectedEmployee();
    const empName = emp ? `${emp.firstName}_${emp.lastName}` : 'employee';

    const headers = [
      'Expense Date',
      'Category',
      'Amount',
      'Currency',
      'Status',
      'Description',
      'Receipt File',
      'Rejection Reason',
      'Paid At',
    ];

    const rows = list.map((c) => [
      c.expenseDate,
      `"${c.category}"`,
      c.amount,
      c.currency,
      c.status,
      `"${(c.description || '').replace(/"/g, '""')}"`,
      c.receiptFileName || '',
      `"${(c.rejectionReason || '').replace(/"/g, '""')}"`,
      c.paidAt || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `reimbursements_${empName}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
