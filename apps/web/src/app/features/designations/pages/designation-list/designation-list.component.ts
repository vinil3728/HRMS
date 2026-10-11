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
import { DesignationFormModalComponent } from '../../components/designation-form-modal/designation-form-modal.component';
import { Designation } from '../../models/designation.model';
import { DesignationService } from '../../services/designation.service';
import { DepartmentService } from '../../../departments/services/department.service';
import { Department } from '../../../departments/models/department.model';

@Component({
  selector: 'app-designation-list',
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    HasPermissionDirective,
    DesignationFormModalComponent,
  ],
  templateUrl: './designation-list.component.html',
  styleUrl: './designation-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignationListComponent implements OnInit {
  private readonly designationService = inject(DesignationService);
  private readonly departmentService = inject(DepartmentService);

  readonly Permission = Permission;

  readonly designations = signal<Designation[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  readonly departmentFilter = signal<string>('ALL');
  readonly sortField = signal<keyof Designation>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly isModalOpen = signal<boolean>(false);
  readonly selectedDesignation = signal<Designation | null>(null);

  readonly statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  readonly departmentOptions = computed<SelectOption[]>(() => [
    { label: 'All Departments', value: 'ALL' },
    ...this.departments().map((d) => ({
      label: d.name,
      value: d.id,
    })),
  ]);

  readonly hasActiveFilters = computed(
    () =>
      this.searchQuery().trim().length > 0 ||
      this.statusFilter() !== 'ALL' ||
      this.departmentFilter() !== 'ALL'
  );

  readonly filteredDesignations = computed(() => {
    let list = [...this.designations()];
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const deptId = this.departmentFilter();
    const field = this.sortField();
    const dir = this.sortDirection();

    if (query) {
      list = list.filter(
        (desig) =>
          desig.name.toLowerCase().includes(query) ||
          desig.code.toLowerCase().includes(query) ||
          (desig.department?.name && desig.department.name.toLowerCase().includes(query))
      );
    }

    if (status !== 'ALL') {
      const activeWanted = status === 'ACTIVE';
      list = list.filter((desig) => desig.isActive === activeWanted);
    }

    if (deptId !== 'ALL') {
      list = list.filter(
        (desig) => desig.departmentId === deptId || desig.department?.id === deptId
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
    Math.max(1, Math.ceil(this.filteredDesignations().length / this.pageSize))
  );

  readonly displayedDesignations = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredDesignations().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadDesignations();
    this.loadDepartments();
  }

  loadDesignations(): void {
    this.loading.set(true);
    this.designationService.getDesignations().subscribe({
      next: (data) => {
        this.designations.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments.set(data.filter((d) => d.isActive));
      },
      error: () => {
        this.departments.set([]);
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

  onDepartmentFilterChange(value: string): void {
    this.departmentFilter.set(value || 'ALL');
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.departmentFilter.set('ALL');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  setSort(field: keyof Designation): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  openAddModal(): void {
    this.selectedDesignation.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(desig: Designation): void {
    this.selectedDesignation.set(desig);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedDesignation.set(null);
  }

  onDesignationSaved(savedDesig: Designation): void {
    const current = this.designations();
    const index = current.findIndex((d) => d.id === savedDesig.id);

    if (index >= 0) {
      const updated = [...current];
      updated[index] = savedDesig;
      this.designations.set(updated);
    } else {
      this.designations.set([savedDesig, ...current]);
    }

    this.closeModal();
  }

  toggleStatus(desig: Designation): void {
    this.designationService
      .toggleStatus(desig.id, desig.isActive)
      .subscribe({
        next: (updatedDesig) => {
          const current = this.designations();
          const index = current.findIndex((d) => d.id === updatedDesig.id);
          if (index >= 0) {
            const updated = [...current];
            updated[index] = updatedDesig;
            this.designations.set(updated);
          }
        },
      });
  }

  exportCsv(): void {
    const data = this.filteredDesignations();
    if (data.length === 0) return;

    const headers = ['ID', 'Designation Title', 'Code', 'Department', 'Status', 'Created Date'];
    const rows = data.map((d) => [
      d.id,
      `"${d.name.replace(/"/g, '""')}"`,
      d.code,
      d.department ? `"${d.department.name.replace(/"/g, '""')}"` : 'All Departments',
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
      `designations_export_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
