import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { Permission } from '../../../../core/models/permission.model';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import { DepartmentFormModalComponent } from '../../components/department-form-modal/department-form-modal.component';
import { Department } from '../../models/department.model';
import { DepartmentService } from '../../services/department.service';
import { BranchService } from '../../../branches/services/branch.service';
import { Branch } from '../../../branches/models/branch.model';

@Component({
  selector: 'app-department-list',
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    HasPermissionDirective,
    DepartmentFormModalComponent,
  ],
  templateUrl: './department-list.component.html',
  styleUrl: './department-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentListComponent implements OnInit {
  private readonly departmentService = inject(DepartmentService);
  private readonly branchService = inject(BranchService);

  readonly Permission = Permission;

  readonly departments = signal<Department[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly loading = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  readonly branchFilter = signal<string>('ALL');
  readonly sortField = signal<keyof Department>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly isModalOpen = signal<boolean>(false);
  readonly selectedDepartment = signal<Department | null>(null);

  readonly statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  readonly branchOptions = computed<SelectOption[]>(() => [
    { label: 'All Branches', value: 'ALL' },
    ...this.branches().map((b) => ({
      label: `${b.name} (${b.code})`,
      value: b.id,
    })),
  ]);

  readonly hasActiveFilters = computed(
    () =>
      this.searchQuery().trim().length > 0 ||
      this.statusFilter() !== 'ALL' ||
      this.branchFilter() !== 'ALL'
  );

  readonly filteredDepartments = computed(() => {
    let list = [...this.departments()];
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const branchId = this.branchFilter();
    const field = this.sortField();
    const dir = this.sortDirection();

    if (query) {
      list = list.filter(
        (dept) =>
          dept.name.toLowerCase().includes(query) ||
          dept.code.toLowerCase().includes(query) ||
          (dept.branch?.name && dept.branch.name.toLowerCase().includes(query)) ||
          (dept.branch?.city && dept.branch.city.toLowerCase().includes(query))
      );
    }

    if (status !== 'ALL') {
      const activeWanted = status === 'ACTIVE';
      list = list.filter((dept) => dept.isActive === activeWanted);
    }

    if (branchId !== 'ALL') {
      list = list.filter(
        (dept) => dept.branchId === branchId || dept.branch?.id === branchId
      );
    }

    list.sort((a, b) => {
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
    Math.max(1, Math.ceil(this.filteredDepartments().length / this.pageSize))
  );

  readonly displayedDepartments = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredDepartments().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadDepartments();
    this.loadBranches();
  }

  loadDepartments(): void {
    this.loading.set(true);
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadBranches(): void {
    this.branchService.getBranches().subscribe({
      next: (data) => {
        this.branches.set(data.filter((b) => b.isActive));
      },
      error: () => {
        this.branches.set([]);
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

  onBranchFilterChange(value: string): void {
    this.branchFilter.set(value || 'ALL');
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.branchFilter.set('ALL');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  setSort(field: keyof Department): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  openAddModal(): void {
    this.selectedDepartment.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(dept: Department): void {
    this.selectedDepartment.set(dept);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedDepartment.set(null);
  }

  onDepartmentSaved(savedDept: Department): void {
    const current = this.departments();
    const index = current.findIndex((d) => d.id === savedDept.id);

    if (index >= 0) {
      const updated = [...current];
      updated[index] = savedDept;
      this.departments.set(updated);
    } else {
      this.departments.set([savedDept, ...current]);
    }

    this.closeModal();
  }

  toggleStatus(dept: Department): void {
    this.departmentService
      .toggleStatus(dept.id, dept.isActive)
      .subscribe({
        next: (updatedDept) => {
          const current = this.departments();
          const index = current.findIndex((d) => d.id === updatedDept.id);
          if (index >= 0) {
            const updated = [...current];
            updated[index] = updatedDept;
            this.departments.set(updated);
          }
        },
      });
  }

  exportCsv(): void {
    const data = this.filteredDepartments();
    if (data.length === 0) return;

    const headers = ['ID', 'Department Name', 'Code', 'Branch', 'Status', 'Created Date'];
    const rows = data.map((d) => [
      d.id,
      `"${d.name.replace(/"/g, '""')}"`,
      d.code,
      d.branch ? `"${d.branch.name.replace(/"/g, '""')}"` : 'All Branches',
      d.isActive ? 'Active' : 'Inactive',
      d.createdAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `departments_export_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
