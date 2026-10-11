import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { RbacService } from '../../../../core/services/rbac.service';
import { Permission } from '../../../../core/models/permission.model';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { BadgeComponent, BadgeVariant } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { PolicyAcknowledgementsModalComponent } from '../../components/policy-acknowledgements-modal/policy-acknowledgements-modal.component';
import { PolicyFormModalComponent } from '../../components/policy-form-modal/policy-form-modal.component';
import { PolicyViewModalComponent } from '../../components/policy-view-modal/policy-view-modal.component';
import {
  Policy,
  PolicyAcknowledgement,
  PolicyStatus,
} from '../../models/policy.model';
import { PolicyService } from '../../services/policy.service';

@Component({
  selector: 'app-policy-list',
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    HasPermissionDirective,
    PolicyFormModalComponent,
    PolicyViewModalComponent,
    PolicyAcknowledgementsModalComponent,
  ],
  templateUrl: './policy-list.component.html',
  styleUrl: './policy-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyListComponent implements OnInit {
  private readonly policyService = inject(PolicyService);
  private readonly authService = inject(AuthService);
  private readonly rbacService = inject(RbacService);

  readonly Permission = Permission;

  readonly policies = signal<Policy[]>([]);
  readonly myAcknowledgements = signal<PolicyAcknowledgement[]>([]);
  readonly loading = signal<boolean>(true);

  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<string>('ALL');
  readonly viewMode = signal<'ALL' | 'MY_PENDING' | 'MY_ACKNOWLEDGED'>('ALL');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ARCHIVED', label: 'Archived' },
  ];

  readonly hasActiveFilters = computed(
    () =>
      this.searchTerm().trim().length > 0 ||
      this.statusFilter() !== 'ALL' ||
      this.viewMode() !== 'ALL'
  );

  // Modals state
  readonly isFormModalOpen = signal<boolean>(false);
  readonly selectedPolicyToEdit = signal<Policy | null>(null);

  readonly isViewModalOpen = signal<boolean>(false);
  readonly selectedPolicyToView = signal<Policy | null>(null);

  readonly isAckModalOpen = signal<boolean>(false);
  readonly selectedPolicyForAudit = signal<Policy | null>(null);

  readonly myEmployeeId = computed(() => {
    return this.authService.currentUser()?.employeeId || '';
  });

  readonly canManagePolicies = computed(() => {
    return this.rbacService.hasAnyPermission([
      Permission.POLICY_CREATE,
      Permission.POLICY_UPDATE,
      Permission.POLICY_DELETE,
      Permission.POLICY_PUBLISH,
      Permission.POLICY_ARCHIVE,
      Permission.POLICY_ACKNOWLEDGEMENT_POLICY_VIEW,
    ]);
  });

  readonly myAcknowledgedIds = computed(() => {
    return new Set(this.myAcknowledgements().map((a) => a.policy.id));
  });

  readonly myAcknowledgedCount = computed(() => {
    return this.myAcknowledgedIds().size;
  });

  readonly totalPolicies = computed(() => this.policies().length);

  readonly publishedCount = computed(() => {
    return this.policies().filter((p) => p.status === PolicyStatus.PUBLISHED)
      .length;
  });

  readonly myPendingCount = computed(() => {
    const ackIds = this.myAcknowledgedIds();
    return this.policies().filter(
      (p) => p.status === PolicyStatus.PUBLISHED && !ackIds.has(p.id)
    ).length;
  });

  readonly archivedCount = computed(() => {
    return this.policies().filter((p) => p.status === PolicyStatus.ARCHIVED)
      .length;
  });

  readonly filteredPolicies = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const status = this.statusFilter();
    const mode = this.viewMode();
    const ackIds = this.myAcknowledgedIds();

    return this.policies().filter((p) => {
      // 1. Text search
      if (term) {
        const matchesTitle = p.title.toLowerCase().includes(term);
        const matchesCode = p.code.toLowerCase().includes(term);
        const matchesContent = p.content.toLowerCase().includes(term);
        if (!matchesTitle && !matchesCode && !matchesContent) {
          return false;
        }
      }

      // 2. Status dropdown
      if (status !== 'ALL' && p.status !== status) {
        return false;
      }

      // 3. Tab view mode
      if (mode === 'MY_PENDING') {
        if (p.status !== PolicyStatus.PUBLISHED || ackIds.has(p.id)) {
          return false;
        }
      } else if (mode === 'MY_ACKNOWLEDGED') {
        if (!ackIds.has(p.id)) {
          return false;
        }
      }

      return true;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPolicies().length / this.pageSize))
  );

  readonly displayedPolicies = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredPolicies().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const empId = this.myEmployeeId();

    forkJoin({
      policies: this.policyService.getPolicies().pipe(catchError(() => of([]))),
      acknowledgements: empId
        ? this.policyService
            .getEmployeeAcknowledgements(empId)
            .pipe(catchError(() => of([])))
        : of([]),
    }).subscribe({
      next: ({ policies, acknowledgements }) => {
        this.policies.set(policies);
        this.myAcknowledgements.set(acknowledgements);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onSearchInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.searchTerm.set(inputEl.value);
    this.currentPage.set(1);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  setViewMode(mode: 'ALL' | 'MY_PENDING' | 'MY_ACKNOWLEDGED'): void {
    this.viewMode.set(mode);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('ALL');
    this.viewMode.set('ALL');
    this.currentPage.set(1);
  }

  isPolicyAcknowledgedByMe(policyId: string): boolean {
    return this.myAcknowledgedIds().has(policyId);
  }

  // --- Modals ---
  openCreateModal(): void {
    this.selectedPolicyToEdit.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditModal(policy: Policy): void {
    this.selectedPolicyToEdit.set(policy);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.selectedPolicyToEdit.set(null);
  }

  onPolicySaved(): void {
    this.closeFormModal();
    this.loadData();
  }

  openViewModal(policy: Policy): void {
    this.selectedPolicyToView.set(policy);
    this.isViewModalOpen.set(true);
  }

  closeViewModal(): void {
    this.isViewModalOpen.set(false);
    this.selectedPolicyToView.set(null);
  }

  onPolicyAcknowledged(ack: PolicyAcknowledgement): void {
    this.myAcknowledgements.update((prev) => [ack, ...prev]);
  }

  openAuditModal(policy: Policy): void {
    this.selectedPolicyForAudit.set(policy);
    this.isAckModalOpen.set(true);
  }

  closeAuditModal(): void {
    this.isAckModalOpen.set(false);
    this.selectedPolicyForAudit.set(null);
  }

  // --- Policy Actions ---
  onPublish(policy: Policy): void {
    const confirmPublish = window.confirm(
      `Publish policy "${policy.title}"? Once published, employees will be required to acknowledge compliance.`
    );
    if (!confirmPublish) return;

    this.policyService.publishPolicy(policy.id).subscribe({
      next: () => {
        this.loadData();
      },
    });
  }

  onArchive(policy: Policy): void {
    const confirmArchive = window.confirm(
      `Archive policy "${policy.title}"? It will no longer appear active for employee acknowledgements.`
    );
    if (!confirmArchive) return;

    this.policyService.archivePolicy(policy.id).subscribe({
      next: () => {
        this.loadData();
      },
    });
  }

  onDelete(policy: Policy): void {
    const confirmDelete = window.confirm(
      `Permanently delete policy "${policy.title}" (${policy.code})? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    this.policyService.deletePolicy(policy.id).subscribe({
      next: () => {
        this.loadData();
      },
    });
  }

  getStatusVariant(status: PolicyStatus): BadgeVariant {
    switch (status) {
      case PolicyStatus.PUBLISHED:
        return 'success';
      case PolicyStatus.ARCHIVED:
        return 'error';
      case PolicyStatus.DRAFT:
      default:
        return 'gray';
    }
  }

  exportCsv(): void {
    const list = this.filteredPolicies();
    if (list.length === 0) return;

    const headers = [
      'Policy Code',
      'Policy Title',
      'Version',
      'Status',
      'Effective Date',
      'Created Date',
      'Content Scope',
    ];

    const rows = list.map((p) => [
      p.code,
      `"${p.title.replace(/"/g, '""')}"`,
      p.version || 'v1.0',
      p.status,
      p.effectiveDate || '',
      p.createdAt || '',
      `"${p.content.substring(0, 150).replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `company_policies_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
