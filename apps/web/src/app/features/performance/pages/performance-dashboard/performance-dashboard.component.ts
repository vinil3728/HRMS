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
import { Employee } from '../../../employees/models/employee.model';
import { EmployeeService } from '../../../employees/services/employee.service';
import { CycleFormModalComponent } from '../../components/cycle-form-modal/cycle-form-modal.component';
import { GoalFormModalComponent } from '../../components/goal-form-modal/goal-form-modal.component';
import { EvaluationModalComponent } from '../../components/evaluation-modal/evaluation-modal.component';
import { SummaryModalComponent } from '../../components/summary-modal/summary-modal.component';
import {
  PerformanceCycle,
  PerformanceCycleStatus,
  PerformanceEvaluation,
  PerformanceEvaluationType,
  PerformanceGoal,
  PerformanceGoalStatus,
  PerformanceSummary,
} from '../../models/performance.model';
import { PerformanceService } from '../../services/performance.service';

@Component({
  selector: 'app-performance-dashboard',
  imports: [
    CommonModule,
    DatePipe,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    HasPermissionDirective,
    CycleFormModalComponent,
    GoalFormModalComponent,
    EvaluationModalComponent,
    SummaryModalComponent,
  ],
  templateUrl: './performance-dashboard.component.html',
  styleUrl: './performance-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceDashboardComponent implements OnInit {
  private readonly performanceService = inject(PerformanceService);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  private readonly rbacService = inject(RbacService);

  readonly Permission = Permission;

  readonly cycles = signal<PerformanceCycle[]>([]);
  readonly selectedCycleId = signal<string>('');
  readonly employees = signal<Employee[]>([]);
  readonly selectedEmployeeId = signal<string>('');

  readonly goals = signal<PerformanceGoal[]>([]);
  readonly summary = signal<PerformanceSummary | null>(null);
  readonly loading = signal<boolean>(true);
  readonly statusFilter = signal<string>('ALL');

  readonly viewMode = signal<'self' | 'org'>('self');

  readonly myEmployeeId = computed<string>(
    () => this.authService.currentUser()?.employeeId || ''
  );

  /**
   * Permissions to manage/finalize appraisals organization-wide
   */
  readonly canManageAllPerformance = computed<boolean>(() =>
    this.rbacService.hasAnyPermission([
      Permission.PERFORMANCE_SUMMARY_FINALIZE,
      Permission.PERFORMANCE_CYCLE_CREATE,
      Permission.PERFORMANCE_CYCLE_UPDATE,
      Permission.EMPLOYEE_VIEWS,
      Permission.EMPLOYEE_UPDATE,
    ])
  );

  /**
   * Permissions to evaluate direct reports or org employees
   */
  readonly canInspectOtherPerformance = computed<boolean>(() =>
    this.rbacService.hasAnyPermission([
      Permission.PERFORMANCE_EVALUATION_CREATE,
      Permission.PERFORMANCE_SUMMARY_FINALIZE,
      Permission.PERFORMANCE_CYCLE_CREATE,
      Permission.PERFORMANCE_CYCLE_UPDATE,
      Permission.EMPLOYEE_VIEWS,
      Permission.EMPLOYEE_UPDATE,
    ])
  );

  /**
   * Employees available in the Organization / Team Performance tab:
   * - All other employees if user has org-wide management permissions
   * - Direct reports (emp.manager?.id === myEmployeeId) otherwise
   */
  readonly manageableEmployees = computed<Employee[]>(() => {
    const all = this.employees();
    const myId = this.myEmployeeId();
    if (this.canManageAllPerformance()) {
      return myId ? all.filter((emp) => emp.id !== myId) : all;
    }
    if (!myId) {
      return [];
    }
    return all.filter((emp) => emp.manager?.id === myId && emp.id !== myId);
  });

  readonly canViewOrgTab = computed<boolean>(
    () => this.canInspectOtherPerformance() && this.manageableEmployees().length > 0
  );

  readonly showViewTabs = computed<boolean>(
    () => !!this.myEmployeeId() && this.canViewOrgTab()
  );

  readonly orgTabLabel = computed<string>(() =>
    this.canManageAllPerformance() ? 'Organization Performance' : 'Team Appraisals'
  );

  readonly isOrgView = computed<boolean>(
    () => this.canViewOrgTab() && (!this.myEmployeeId() || this.viewMode() === 'org')
  );

  readonly activeTargetEmployeeId = computed<string>(() =>
    this.isOrgView() ? this.selectedEmployeeId() : this.myEmployeeId()
  );

  readonly isCurrentUserSelf = computed<boolean>(
    () => !this.isOrgView() || this.activeTargetEmployeeId() === this.myEmployeeId()
  );

  readonly activeTargetEmployee = computed<Employee | null>(() => {
    const id = this.activeTargetEmployeeId();
    return this.employees().find((e) => e.id === id) || null;
  });

  readonly cycleOptions = computed<SelectOption[]>(() =>
    this.cycles().map((c) => {
      const start = c.startDate
        ? new Date(c.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '';
      const end = c.endDate
        ? new Date(c.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '';
      return {
        value: c.id,
        label: `${c.name} (${start} - ${end}) - ${c.status}`,
      };
    })
  );

  readonly employeeOptions = computed<SelectOption[]>(() =>
    this.manageableEmployees().map((emp) => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode}) - ${emp.designation?.name || 'Team Member'}`,
    }))
  );

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'NOT_STARTED', label: 'Not Started' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  // Modals state
  readonly isCycleModalOpen = signal<boolean>(false);
  readonly selectedCycleToEdit = signal<PerformanceCycle | null>(null);

  readonly isGoalModalOpen = signal<boolean>(false);
  readonly selectedGoalToEdit = signal<PerformanceGoal | null>(null);

  readonly isEvalModalOpen = signal<boolean>(false);
  readonly selectedGoalForEval = signal<PerformanceGoal | null>(null);

  readonly isSummaryModalOpen = signal<boolean>(false);

  readonly selectedCycle = computed(() => {
    const id = this.selectedCycleId();
    return this.cycles().find((c) => c.id === id) || null;
  });

  readonly selectedEmployee = computed(() => {
    const id = this.selectedEmployeeId();
    return this.employees().find((e) => e.id === id) || null;
  });

  readonly hasFinalizePermission = computed(() =>
    this.rbacService.hasPermission(Permission.PERFORMANCE_SUMMARY_FINALIZE)
  );

  readonly canFinalize = computed(() => {
    const c = this.selectedCycle();
    return (
      this.hasFinalizePermission() &&
      c?.status === PerformanceCycleStatus.CLOSED
    );
  });

  readonly totalGoals = computed(() => this.goals().length);

  readonly totalWeight = computed(() => {
    return this.goals().reduce(
      (sum, g) => sum + (Number(g.weight) || 0),
      0
    );
  });

  readonly isWeightValid = computed(() => {
    return Math.abs(this.totalWeight() - 100) < 0.01;
  });

  readonly avgProgress = computed(() => {
    const list = this.goals();
    if (!list.length) return 0;
    return Math.round(
      list.reduce((sum, g) => sum + (Number(g.progress) || 0), 0) / list.length
    );
  });

  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly filteredGoals = computed(() => {
    const filter = this.statusFilter();
    const list = this.goals();
    if (filter === 'ALL') return list;
    return list.filter((g) => g.status === filter);
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredGoals().length / this.pageSize))
  );

  readonly displayedGoals = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredGoals().slice(start, start + this.pageSize);
  });

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  setViewMode(mode: 'self' | 'org'): void {
    this.viewMode.set(mode);
    const cycleId = this.selectedCycleId();
    if (mode === 'self') {
      const myId = this.myEmployeeId();
      if (myId && cycleId) {
        this.loadScorecardData(myId, cycleId);
      }
    } else {
      const manageable = this.manageableEmployees();
      if (manageable.length > 0) {
        const currentSelected = this.selectedEmployeeId();
        const nextId = manageable.some((e) => e.id === currentSelected)
          ? currentSelected
          : manageable[0].id;
        this.selectedEmployeeId.set(nextId);
        if (cycleId) {
          this.loadScorecardData(nextId, cycleId);
        }
      }
    }
  }

  ngOnInit(): void {
    this.initializeData();
  }

  private initializeData(): void {
    this.loading.set(true);

    forkJoin({
      cycles: this.performanceService.getCycles().pipe(catchError(() => of([]))),
      employees: this.canInspectOtherPerformance()
        ? this.employeeService.getDirectory().pipe(
            catchError(() => of([] as Employee[]))
          )
        : of(null),
    }).subscribe({
      next: ({ cycles, employees }) => {
        this.cycles.set(cycles);

        if (cycles.length > 0) {
          // Select OPEN cycle first if available, else first cycle
          const openCycle = cycles.find(
            (c) => c.status === PerformanceCycleStatus.OPEN
          );
          this.selectedCycleId.set(openCycle ? openCycle.id : cycles[0].id);
        }

        const currentUser = this.authService.currentUser();
        const myEmpId = currentUser?.employeeId;
        const sessionEmployee = currentUser?.employee as Employee | undefined;

        if (employees && employees.length > 0) {
          const list = [...employees];
          if (myEmpId && !list.some((e) => e.id === myEmpId) && sessionEmployee) {
            list.unshift(sessionEmployee);
          }
          this.employees.set(list);

          if (myEmpId) {
            this.viewMode.set('self');
            const otherEmp = list.find((e) => e.id !== myEmpId);
            if (otherEmp) {
              this.selectedEmployeeId.set(otherEmp.id);
            }
          } else {
            this.viewMode.set('org');
            this.selectedEmployeeId.set(list[0].id);
          }
        } else if (myEmpId) {
          this.viewMode.set('self');
          this.selectedEmployeeId.set(myEmpId);
          if (sessionEmployee) {
            this.employees.set([sessionEmployee]);
          } else {
            this.employeeService.getMyProfile().subscribe({
              next: (emp) => {
                this.employees.set([emp]);
              },
            });
          }
        }

        const empId = this.activeTargetEmployeeId();
        const cycId = this.selectedCycleId();

        if (empId && cycId) {
          this.loadScorecardData(empId, cycId);
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadScorecardData(employeeId: string, cycleId: string): void {
    if (!employeeId || !cycleId) {
      this.goals.set([]);
      this.summary.set(null);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    this.performanceService.getGoals(employeeId, cycleId).subscribe({
      next: (goalsList) => {
        if (goalsList.length === 0) {
          this.goals.set([]);
          this.loadSummary(employeeId, cycleId);
          return;
        }

        // Fetch evaluations for each goal in parallel
        const evalRequests = goalsList.map((goal) =>
          this.performanceService
            .getEvaluations(employeeId, cycleId, goal.id)
            .pipe(catchError(() => of([] as PerformanceEvaluation[])))
        );

        forkJoin(evalRequests).subscribe({
          next: (evalResults) => {
            const goalsWithEvals = goalsList.map((goal, idx) => ({
              ...goal,
              evaluations: evalResults[idx] || [],
            }));
            this.goals.set(goalsWithEvals);
            this.loadSummary(employeeId, cycleId);
          },
          error: () => {
            this.goals.set(goalsList);
            this.loadSummary(employeeId, cycleId);
          },
        });
      },
      error: () => {
        this.goals.set([]);
        this.loadSummary(employeeId, cycleId);
      },
    });
  }

  private loadSummary(employeeId: string, cycleId: string): void {
    this.performanceService
      .getSummary(employeeId, cycleId)
      .pipe(catchError(() => of(null)))
      .subscribe({
        next: (summaryRes) => {
          this.summary.set(summaryRes);
          this.loading.set(false);
        },
      });
  }

  onCycleChange(cycleId: string): void {
    this.selectedCycleId.set(cycleId);
    this.loadScorecardData(this.activeTargetEmployeeId(), cycleId);
  }

  onEmployeeChange(employeeId: string): void {
    this.selectedEmployeeId.set(employeeId);
    this.loadScorecardData(employeeId, this.selectedCycleId());
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
  }

  // --- Cycle Modal ---
  openCreateCycleModal(): void {
    this.selectedCycleToEdit.set(null);
    this.isCycleModalOpen.set(true);
  }

  openEditCycleModal(): void {
    this.selectedCycleToEdit.set(this.selectedCycle());
    this.isCycleModalOpen.set(true);
  }

  closeCycleModal(): void {
    this.isCycleModalOpen.set(false);
    this.selectedCycleToEdit.set(null);
  }

  onCycleSaved(cycle: PerformanceCycle): void {
    this.closeCycleModal();
    this.performanceService.getCycles().subscribe({
      next: (list) => {
        this.cycles.set(list);
        this.selectedCycleId.set(cycle.id);
        this.loadScorecardData(this.activeTargetEmployeeId(), cycle.id);
      },
    });
  }

  onDeleteCycle(): void {
    const c = this.selectedCycle();
    if (!c) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete appraisal cycle "${c.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    this.performanceService.deleteCycle(c.id).subscribe({
      next: () => {
        this.performanceService.getCycles().subscribe({
          next: (list) => {
            this.cycles.set(list);
            this.selectedCycleId.set(list[0]?.id || '');
            if (list.length > 0) {
              this.loadScorecardData(this.activeTargetEmployeeId(), list[0].id);
            } else {
              this.goals.set([]);
              this.summary.set(null);
            }
          },
        });
      },
    });
  }

  // --- Goal Modal ---
  openCreateGoalModal(): void {
    this.selectedGoalToEdit.set(null);
    this.isGoalModalOpen.set(true);
  }

  openEditGoalModal(goal: PerformanceGoal): void {
    this.selectedGoalToEdit.set(goal);
    this.isGoalModalOpen.set(true);
  }

  closeGoalModal(): void {
    this.isGoalModalOpen.set(false);
    this.selectedGoalToEdit.set(null);
  }

  onGoalSaved(): void {
    this.closeGoalModal();
    this.loadScorecardData(this.activeTargetEmployeeId(), this.selectedCycleId());
  }

  onDeleteGoal(goal: PerformanceGoal): void {
    const confirmed = window.confirm(
      `Delete goal "${goal.title}"?`
    );
    if (!confirmed) return;

    this.performanceService
      .deleteGoal(this.activeTargetEmployeeId(), this.selectedCycleId(), goal.id)
      .subscribe({
        next: () => {
          this.loadScorecardData(
            this.activeTargetEmployeeId(),
            this.selectedCycleId()
          );
        },
      });
  }

  // --- Evaluation Modal ---
  openEvaluationModal(goal: PerformanceGoal): void {
    this.selectedGoalForEval.set(goal);
    this.isEvalModalOpen.set(true);
  }

  closeEvaluationModal(): void {
    this.isEvalModalOpen.set(false);
    this.selectedGoalForEval.set(null);
  }

  onEvaluationUpdated(): void {
    this.loadScorecardData(this.activeTargetEmployeeId(), this.selectedCycleId());
  }

  // --- Summary Modal ---
  openSummaryModal(): void {
    this.isSummaryModalOpen.set(true);
  }

  closeSummaryModal(): void {
    this.isSummaryModalOpen.set(false);
  }

  onSummaryFinalized(summaryRes: PerformanceSummary): void {
    this.summary.set(summaryRes);
    this.closeSummaryModal();
  }

  // --- Helpers ---
  getSelfEval(goal: PerformanceGoal): PerformanceEvaluation | null {
    return (
      goal.evaluations?.find(
        (e) => e.evaluationType === PerformanceEvaluationType.SELF
      ) || null
    );
  }

  getManagerEval(goal: PerformanceGoal): PerformanceEvaluation | null {
    return (
      goal.evaluations?.find(
        (e) => e.evaluationType === PerformanceEvaluationType.MANAGER
      ) || null
    );
  }

  formatGoalStatus(status: PerformanceGoalStatus): string {
    switch (status) {
      case PerformanceGoalStatus.NOT_STARTED:
        return 'Not Started';
      case PerformanceGoalStatus.IN_PROGRESS:
        return 'In Progress';
      case PerformanceGoalStatus.COMPLETED:
        return 'Completed';
      case PerformanceGoalStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  }

  getGoalStatusVariant(status: PerformanceGoalStatus): BadgeVariant {
    switch (status) {
      case PerformanceGoalStatus.COMPLETED:
        return 'success';
      case PerformanceGoalStatus.IN_PROGRESS:
        return 'info';
      case PerformanceGoalStatus.CANCELLED:
        return 'error';
      case PerformanceGoalStatus.NOT_STARTED:
      default:
        return 'gray';
    }
  }

  exportCsv(): void {
    const list = this.goals();
    if (list.length === 0) return;

    const emp = this.activeTargetEmployee();
    const cycle = this.selectedCycle();
    const empName = emp ? `${emp.firstName}_${emp.lastName}` : 'employee';
    const cycleName = cycle ? cycle.name.replace(/\s+/g, '_') : 'cycle';

    const headers = [
      'Goal Title',
      'Target KPI',
      'Weight (%)',
      'Progress (%)',
      'Status',
      'Start Date',
      'End Date',
      'Self Rating',
      'Self Review Status',
      'Manager Rating',
      'Manager Review Status',
    ];

    const rows = list.map((g) => {
      const se = this.getSelfEval(g);
      const me = this.getManagerEval(g);
      return [
        `"${g.title.replace(/"/g, '""')}"`,
        `"${(g.target || '').replace(/"/g, '""')}"`,
        g.weight,
        g.progress,
        g.status,
        g.startDate,
        g.endDate,
        se?.rating ?? '',
        se?.status ?? 'PENDING',
        me?.rating ?? '',
        me?.status ?? 'PENDING',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `scorecard_${cycleName}_${empName}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
