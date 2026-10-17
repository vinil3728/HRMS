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
import { Permission } from '../../../../core/models/permission.model';
import { RbacService } from '../../../../core/services/rbac.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import { EmployeeDetailModalComponent } from '../../components/employee-detail-modal/employee-detail-modal.component';
import { EmployeeFormModalComponent } from '../../components/employee-form-modal/employee-form-modal.component';
import {
  CreateEmployeeRequest,
  Department,
  Designation,
  Employee,
  EmployeeStatus,
  UpdateEmployeeRequest,
} from '../../models/employee.model';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-employee-list',
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    HasPermissionDirective,
    EmployeeFormModalComponent,
    EmployeeDetailModalComponent,
  ],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeListComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  readonly rbacService = inject(RbacService);

  readonly Permission = Permission;
  readonly EmployeeStatus = EmployeeStatus;

  readonly employees = signal<Employee[]>([]);
  readonly allEmployeesList = signal<Employee[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly designations = signal<Designation[]>([]);

  readonly departmentOptions = computed<SelectOption[]>(() => [
    { label: 'All Departments', value: '' },
    ...this.departments().map((d) => ({ label: d.name, value: d.id })),
  ]);

  readonly designationOptions = computed<SelectOption[]>(() => [
    { label: 'All Designations', value: '' },
    ...this.designations().map((d) => ({ label: d.name, value: d.id })),
  ]);

  readonly statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Resigned', value: 'RESIGNED' },
    { label: 'Terminated', value: 'TERMINATED' },
  ];

  readonly totalEmployees = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly totalPages = signal<number>(1);
  pageSize = 10;

  searchQuery = '';
  selectedDepartment = '';
  selectedDesignation = '';
  selectedStatus = 'ALL';

  sortColumn = signal<'code' | 'name' | null>(null);
  sortDirection = signal<'asc' | 'desc'>('asc');
  private readonly filterTrigger = signal<number>(0);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionMessage = signal<string | null>(null);

  // Modals state
  readonly isFormModalOpen = signal<boolean>(false);
  readonly isDetailModalOpen = signal<boolean>(false);
  readonly selectedEmployee = signal<Employee | null>(null);

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;

  readonly startIndex = computed(() => {
    if (this.totalEmployees() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  readonly endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize, this.totalEmployees());
  });

  readonly displayedEmployees = computed(() => {
    this.filterTrigger();
    let list = [...this.employees()];

    // Client-side departmental or designation filter if selected
    if (this.selectedDepartment) {
      list = list.filter((e) => e.department?.id === this.selectedDepartment);
    }
    if (this.selectedDesignation) {
      list = list.filter((e) => e.designation?.id === this.selectedDesignation);
    }

    const col = this.sortColumn();
    const dir = this.sortDirection();

    if (col === 'code') {
      list.sort((a, b) => {
        const valA = a.employeeCode || '';
        const valB = b.employeeCode || '';
        return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    } else if (col === 'name') {
      list.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`;
        const nameB = `${b.firstName} ${b.lastName}`;
        return dir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
    }

    return list;
  });

  readonly paginationPages = computed(() => {
    const total = this.totalPages();
    const pages: number[] = [];
    for (let i = 1; i <= Math.min(total, 5); i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit(): void {
    this.loadMetadata();
    this.fetchEmployees();
  }

  loadMetadata(): void {
    this.employeeService.getDepartments().subscribe({
      next: (data) => this.departments.set(data),
      error: (err: Error) => {
        this.errorMessage.set(err.message || 'Failed to load departments');
      },
    });
    this.employeeService.getDesignations().subscribe({
      next: (data) => this.designations.set(data),
      error: (err: Error) => {
        this.errorMessage.set(err.message || 'Failed to load designations');
      },
    });
    this.employeeService.getEmployees({ limit: 100 }).subscribe({
      next: (res) => this.allEmployeesList.set(res.data),
      error: (err: Error) => {
        this.errorMessage.set(err.message || 'Failed to load managers');
      },
    });
  }

  fetchEmployees(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.employeeService
      .getEmployees({
        search: this.searchQuery,
        status: this.selectedStatus,
        page: this.currentPage(),
        limit: this.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.employees.set(response.data);
          this.totalEmployees.set(response.total);
          this.totalPages.set(response.totalPages || 1);
          this.isLoading.set(false);
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message || 'Failed to load employees');
          this.isLoading.set(false);
        },
      });
  }

  hasActiveFilters(): boolean {
    return (
      !!this.searchQuery.trim() ||
      !!this.selectedDepartment ||
      !!this.selectedDesignation ||
      this.selectedStatus !== 'ALL'
    );
  }

  onSearchChange(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage.set(1);
      this.fetchEmployees();
    }, 300);
  }

  onFilterChange(): void {
    this.filterTrigger.update((v) => v + 1);
    this.currentPage.set(1);
    this.fetchEmployees();
  }

  onDepartmentChange(value: string): void {
    this.selectedDepartment = value;
    this.onFilterChange();
  }

  onDesignationChange(value: string): void {
    this.selectedDesignation = value;
    this.onFilterChange();
  }

  onStatusChange(value: string): void {
    this.selectedStatus = value;
    this.onFilterChange();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedDepartment = '';
    this.selectedDesignation = '';
    this.selectedStatus = 'ALL';
    this.filterTrigger.update((v) => v + 1);
    this.currentPage.set(1);
    this.fetchEmployees();
  }

  toggleSort(column: 'code' | 'name'): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  formatStatus(status: EmployeeStatus): string {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return 'Active';
      case EmployeeStatus.INACTIVE:
        return 'Inactive';
      case EmployeeStatus.RESIGNED:
        return 'Resigned';
      case EmployeeStatus.TERMINATED:
        return 'Terminated';
      default:
        return status;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.fetchEmployees();
    }
  }

  onPageSizeChange(): void {
    this.currentPage.set(1);
    this.fetchEmployees();
  }

  openAddModal(): void {
    this.selectedEmployee.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditModal(employee: Employee): void {
    this.selectedEmployee.set(employee);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.selectedEmployee.set(null);
  }

  openDetailModal(employee: Employee): void {
    this.selectedEmployee.set(employee);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedEmployee.set(null);
  }

  handleSaveEmployee(payload: CreateEmployeeRequest | UpdateEmployeeRequest): void {
    const existing = this.selectedEmployee();

    if (existing?.id) {
      // Update
      this.employeeService.updateEmployee(existing.id, payload).subscribe({
        next: () => {
          this.closeFormModal();
          this.showActionMessage('Employee updated successfully');
          this.fetchEmployees();
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message || 'Failed to update employee');
        },
      });
    } else {
      // Create
      this.employeeService.createEmployee(payload as CreateEmployeeRequest).subscribe({
        next: () => {
          this.closeFormModal();
          this.showActionMessage('Employee created successfully');
          this.fetchEmployees();
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message || 'Failed to create employee');
        },
      });
    }
  }

  toggleStatus(employee: Employee): void {
    if (employee.status === EmployeeStatus.RESIGNED || employee.status === EmployeeStatus.TERMINATED) {
      alert(`Cannot toggle status for ${employee.status.toLowerCase()} employee. Status updates for resigned or terminated employees must be handled through explicit profile management.`);
      return;
    }

    const newStatus =
      employee.status === EmployeeStatus.ACTIVE
        ? EmployeeStatus.INACTIVE
        : EmployeeStatus.ACTIVE;

    this.employeeService.updateEmployeeStatus(employee.id, newStatus).subscribe({
      next: () => {
        this.showActionMessage(`Employee status updated to ${newStatus}`);
        this.fetchEmployees();
      },
      error: (err: any) => {
        this.errorMessage.set(err?.error?.message || err.message || 'Failed to update status');
      },
    });
  }

  exportCsv(): void {
    const items = this.displayedEmployees();
    if (items.length === 0) return;

    const headers = [
      'Employee Code',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Department',
      'Designation',
      'Manager',
      'Date of Joining',
      'Status',
    ];

    const rows = items.map((e) => [
      `"${e.employeeCode || ''}"`,
      `"${e.firstName || ''}"`,
      `"${e.lastName || ''}"`,
      `"${e.email || ''}"`,
      `"${e.phone || ''}"`,
      `"${e.department?.name || ''}"`,
      `"${e.designation?.name || ''}"`,
      `"${e.manager ? e.manager.firstName + ' ' + e.manager.lastName : ''}"`,
      `"${e.dateOfJoining || ''}"`,
      `"${e.status || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `employees_${new Date().toISOString().substring(0, 10)}.csv`);
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
