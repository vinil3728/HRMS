import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import { CoworkerProfileModalComponent } from '../../components/coworker-profile-modal/coworker-profile-modal.component';
import { Department, Designation, Employee } from '../../models/employee.model';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-employee-directory',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    SelectComponent,
    CoworkerProfileModalComponent,
  ],
  templateUrl: './employee-directory.component.html',
  styleUrl: './employee-directory.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDirectoryComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);

  readonly loading = signal<boolean>(true);
  readonly coworkers = signal<Employee[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly designations = signal<Designation[]>([]);

  // Filters & layout state
  readonly searchQuery = signal<string>('');
  readonly selectedDepartmentId = signal<string>('ALL');
  readonly selectedDesignationId = signal<string>('ALL');
  readonly viewMode = signal<'table'>('table');

  // Pagination state
  readonly currentPage = signal<number>(1);
  readonly pageSize = 12;

  // Quick Profile Modal
  readonly selectedCoworker = signal<Employee | null>(null);

  // Department & Designation Select Options
  readonly departmentOptions = computed<SelectOption[]>(() => [
    { label: 'All Departments', value: 'ALL' },
    ...this.departments().map((d) => ({ label: d.name, value: d.id })),
  ]);

  readonly designationOptions = computed<SelectOption[]>(() => [
    { label: 'All Designations', value: 'ALL' },
    ...this.designations().map((d) => ({ label: d.name, value: d.id })),
  ]);

  // Client-side instant filtered results
  readonly filteredCoworkers = computed<Employee[]>(() => {
    const list = this.coworkers();
    const query = this.searchQuery().trim().toLowerCase();
    const deptId = this.selectedDepartmentId();
    const desigId = this.selectedDesignationId();

    return list.filter((emp) => {
      // Department filter
      if (deptId !== 'ALL' && emp.department?.id !== deptId) {
        return false;
      }

      // Designation filter
      if (desigId !== 'ALL' && emp.designation?.id !== desigId) {
        return false;
      }

      // Text search
      if (query) {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const email = (emp.email || '').toLowerCase();
        const code = (emp.employeeCode || '').toLowerCase();
        const deptName = (emp.department?.name || '').toLowerCase();
        const desigTitle = (emp.designation?.name || '').toLowerCase();

        return (
          fullName.includes(query) ||
          email.includes(query) ||
          code.includes(query) ||
          deptName.includes(query) ||
          desigTitle.includes(query)
        );
      }

      return true;
    });
  });

  readonly totalPages = computed<number>(() => {
    return Math.max(1, Math.ceil(this.filteredCoworkers().length / this.pageSize));
  });

  readonly displayedCoworkers = computed<Employee[]>(() => {
    const list = this.filteredCoworkers();
    const start = (this.currentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  readonly hasActiveFilters = computed<boolean>(() => {
    return (
      Boolean(this.searchQuery().trim()) ||
      this.selectedDepartmentId() !== 'ALL' ||
      this.selectedDesignationId() !== 'ALL'
    );
  });

  // Metrics
  readonly totalCoworkersCount = computed<number>(
    () => this.coworkers().length
  );
  readonly uniqueDepartmentsCount = computed<number>(() => {
    const depts = new Set(
      this.coworkers()
        .map((e) => e.department?.name)
        .filter(Boolean)
    );
    return depts.size;
  });

  ngOnInit(): void {
    this.loadDirectory();
    this.loadFilterMetadata();
  }

  loadDirectory(): void {
    this.loading.set(true);
    this.employeeService.getDirectory().subscribe({
      next: (list) => {
        this.coworkers.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.coworkers.set([]);
        this.loading.set(false);
      },
    });
  }

  private loadFilterMetadata(): void {
    this.employeeService.getDepartments().subscribe({
      next: (depts) => this.departments.set(depts),
    });

    this.employeeService.getDesignations().subscribe({
      next: (desigs) => this.designations.set(desigs),
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1);
  }

  onDepartmentChange(value: string): void {
    this.selectedDepartmentId.set(value);
    this.currentPage.set(1);
  }

  onDesignationChange(value: string): void {
    this.selectedDesignationId.set(value);
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedDepartmentId.set('ALL');
    this.selectedDesignationId.set('ALL');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  setViewMode(mode: 'table'): void {
    this.viewMode.set(mode);
  }

  openProfile(coworker: Employee): void {
    this.selectedCoworker.set(coworker);
  }

  closeProfile(): void {
    this.selectedCoworker.set(null);
  }
}
