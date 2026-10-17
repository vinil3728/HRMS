import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Permission } from '../../../../core/models/permission.model';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import { BranchFormModalComponent } from '../../components/branch-form-modal/branch-form-modal.component';
import { BranchDetailModalComponent } from '../../components/branch-detail-modal/branch-detail-modal.component';
import { Branch } from '../../models/branch.model';
import { BranchService } from '../../services/branch.service';
import { RbacService } from '../../../../core/services/rbac.service';

@Component({
  selector: 'app-branch-list',
  imports: [
    CommonModule,
    IconComponent,
    SelectComponent,
    BranchFormModalComponent,
    BranchDetailModalComponent,
  ],
  templateUrl: './branch-list.component.html',
  styleUrl: './branch-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchListComponent implements OnInit {
  private readonly branchService = inject(BranchService);
  private readonly rbacService = inject(RbacService);

  readonly Permission = Permission;

  readonly branches = signal<Branch[]>([]);
  readonly loading = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  readonly sortField = signal<keyof Branch>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly isFormModalOpen = signal<boolean>(false);
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly selectedBranch = signal<Branch | null>(null);

  readonly statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  // ── Permission Signals (Replacing directive) ─────────────────────────────
  readonly canCreateBranch = computed(() =>
    this.rbacService.hasPermission(Permission.BRN_CREATE)
  );

  readonly canViewBranch = computed(() =>
    this.rbacService.hasPermission(Permission.BRN_VIEW)
  );

  readonly canEditBranch = computed(() =>
    this.rbacService.hasPermission(Permission.BRN_UPDATE)
  );

  readonly canDeleteBranch = computed(() =>
    this.rbacService.hasPermission(Permission.BRN_DELETE)
  );

  readonly canActivateBranch = computed(() =>
    this.rbacService.hasPermission(Permission.BRN_ACTIVATE)
  );

  readonly canDeactivateBranch = computed(() =>
    this.rbacService.hasPermission(Permission.BRN_DEACTIVATE)
  );

  readonly hasRowActionPermissions = computed(() => {
    return (
      this.canViewBranch() ||
      this.canEditBranch() ||
      this.canActivateBranch() ||
      this.canDeactivateBranch()
    );
  });

  // ── Metrics Computed Signals ─────────────────────────────────────────────
  readonly totalBranchesCount = computed(() => this.branches().length);
  readonly activeBranchesCount = computed(
    () => this.branches().filter((b) => b.isActive).length
  );
  readonly inactiveBranchesCount = computed(
    () => this.branches().filter((b) => !b.isActive).length
  );
  readonly totalDepartmentsCount = computed(() =>
    this.branches().reduce((acc, b) => acc + (b.departments?.length || 0), 0)
  );

  readonly hasActiveFilters = computed(
    () => this.searchQuery().trim().length > 0 || this.statusFilter() !== 'ALL'
  );

  readonly filteredBranches = computed(() => {
    let list = [...this.branches()];
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const field = this.sortField();
    const dir = this.sortDirection();

    if (query) {
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.code.toLowerCase().includes(query) ||
          (b.city && b.city.toLowerCase().includes(query)) ||
          (b.state && b.state.toLowerCase().includes(query))
      );
    }

    if (status !== 'ALL') {
      const activeWanted = status === 'ACTIVE';
      list = list.filter((b) => b.isActive === activeWanted);
    }

    list.sort((a, b) => {
      if (field === 'departments') {
        const countA = a.departments?.length || 0;
        const countB = b.departments?.length || 0;
        return (countA < countB ? -1 : countA > countB ? 1 : 0) * (dir === 'asc' ? 1 : -1);
      }

      const valA = a[field];
      const valB = b[field];

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
        return dir === 'asc' ? cmp : -cmp;
      }

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      return (valA < valB ? -1 : 1) * (dir === 'asc' ? 1 : -1);
    });

    return list;
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredBranches().length / this.pageSize))
  );

  readonly displayedBranches = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredBranches().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.loading.set(true);
    this.branchService.getBranches().subscribe({
      next: (data) => {
        this.branches.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set((value || 'ALL') as 'ALL' | 'ACTIVE' | 'INACTIVE');
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  setSort(field: keyof Branch): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  openAddModal(): void {
    this.selectedBranch.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditModal(branch: Branch): void {
    this.selectedBranch.set(branch);
    this.isFormModalOpen.set(true);
  }

  openDeleteModal(branch: Branch): void {
    this.selectedBranch.set(branch);
    this.isFormModalOpen.set(true);
  }

  openDetailModal(branch: Branch): void {
    this.selectedBranch.set(branch);
    this.isDetailModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.selectedBranch.set(null);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedBranch.set(null);
  }

  onBranchSaved(savedBranch: Branch): void {
    const current = this.branches();
    const index = current.findIndex((b) => b.id === savedBranch.id);

    if (index >= 0) {
      const updated = [...current];
      // preserve departments array if payload didn't load them
      updated[index] = {
        ...current[index],
        ...savedBranch,
        departments: savedBranch.departments || current[index].departments,
      };
      this.branches.set(updated);
    } else {
      this.branches.set([savedBranch, ...current]);
    }

    this.closeFormModal();
  }

  toggleStatus(branch: Branch): void {
    const isDeactivating = branch.isActive;
    const confirmMsg = isDeactivating
      ? `Are you sure you want to deactivate branch "${branch.name}"?\n\nThis will automatically deactivate all associated departments, designations, and active employees under this branch.`
      : `Are you sure you want to activate branch "${branch.name}"?\n\nThis will also activate all associated departments and designations under it.`;

    if (!window.confirm(confirmMsg)) return;

    this.branchService
      .toggleStatus(branch.id, branch.isActive)
      .subscribe({
        next: () => {
          this.loadBranches();
        },
        error: (err: any) => {
          alert(err?.error?.message || err.message || 'Failed to toggle branch status');
        },
      });
  }

  exportCsv(): void {
    const data = this.filteredBranches();
    if (data.length === 0) return;

    const headers = [
      'ID',
      'Branch Name',
      'Code',
      'City',
      'State',
      'Country',
      'Departments Count',
      'Status',
      'Created Date',
    ];

    const rows = data.map((b) => [
      b.id,
      `"${b.name.replace(/"/g, '""')}"`,
      b.code,
      b.city || '',
      b.state || '',
      b.country,
      b.departments?.length || 0,
      b.isActive ? 'Active' : 'Inactive',
      b.createdAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `branches_export_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
