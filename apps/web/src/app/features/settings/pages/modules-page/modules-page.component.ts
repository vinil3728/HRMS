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
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { ModuleFormModalComponent } from '../../components/module-form-modal/module-form-modal.component';
import { SystemModule } from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';
import { RbacService } from '../../../../core/services/rbac.service';

@Component({
  selector: 'app-modules-page',
  imports: [
    CommonModule,
    IconComponent,
    BadgeComponent,
    SelectComponent,
    HasPermissionDirective,
    ModuleFormModalComponent,
  ],
  templateUrl: './modules-page.component.html',
  styleUrl: './modules-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesPageComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly rbacService = inject(RbacService);

  readonly Permission = Permission;

  readonly modules = signal<SystemModule[]>([]);
  readonly loading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE' | 'DELETED'>('ALL');
  readonly sortField = signal<'code' | 'name' | 'permissionCount' | 'isActive' | 'isDeleted'>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly currentPage = signal<number>(1);
  readonly pageSize = 10;

  readonly isModuleModalOpen = signal<boolean>(false);
  readonly selectedModuleToEdit = signal<SystemModule | null>(null);

  readonly statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'DELETED', label: 'Deleted' },
  ];

  readonly hasAnyActionPermissions = computed(() => {
    return (
      this.rbacService.hasPermission(Permission.MODULE_EDIT) ||
      this.rbacService.hasPermission(Permission.MODULE_DELETE) ||
      this.rbacService.hasPermission(Permission.MODULE_ACTIVATE) ||
      this.rbacService.hasPermission(Permission.MODULE_DEACTIVATE)
    );
  });

  readonly hasActiveFilters = computed(
    () =>
      this.searchQuery().trim().length > 0 ||
      this.statusFilter() !== 'ALL'
  );

  readonly filteredModules = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const field = this.sortField();
    const dir = this.sortDirection();

    const list = this.modules().filter((m) => {
      if (status === 'ACTIVE' && (!m.isActive || m.isDeleted)) return false;
      if (status === 'INACTIVE' && (m.isActive || m.isDeleted)) return false;
      if (status === 'DELETED' && !m.isDeleted) return false;

      if (q) {
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesCode = m.code.toLowerCase().includes(q);
        const matchesDesc = !!(
          m.description && m.description.toLowerCase().includes(q)
        );
        return matchesName || matchesCode || matchesDesc;
      }
      return true;
    });

    list.sort((a, b) => {
      let valA: any = a[field as keyof SystemModule];
      let valB: any = b[field as keyof SystemModule];

      if (field === 'permissionCount') {
        valA = a.permissionCount ?? 0;
        valB = b.permissionCount ?? 0;
        return (valA < valB ? -1 : valA > valB ? 1 : 0) * (dir === 'asc' ? 1 : -1);
      }

      if (field === 'isDeleted') {
        valA = a.isDeleted ? 1 : 0;
        valB = b.isDeleted ? 1 : 0;
        return (valA < valB ? -1 : valA > valB ? 1 : 0) * (dir === 'asc' ? 1 : -1);
      }

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
    Math.max(1, Math.ceil(this.filteredModules().length / this.pageSize))
  );

  readonly displayedModules = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredModules().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadModules();
  }

  loadModules(): void {
    this.loading.set(true);
    this.settingsService.getModules().subscribe({
      next: (list) => {
        this.modules.set(list);
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

  onStatusChange(value: string): void {
    this.statusFilter.set((value || 'ALL') as 'ALL' | 'ACTIVE' | 'INACTIVE' | 'DELETED');
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

  setSort(field: 'code' | 'name' | 'permissionCount' | 'isActive' | 'isDeleted'): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  openCreateModuleModal(): void {
    this.selectedModuleToEdit.set(null);
    this.isModuleModalOpen.set(true);
  }

  openEditModuleModal(module: SystemModule): void {
    this.selectedModuleToEdit.set(module);
    this.isModuleModalOpen.set(true);
  }

  closeModuleModal(): void {
    this.isModuleModalOpen.set(false);
    this.selectedModuleToEdit.set(null);
  }

  onModuleSaved(): void {
    this.closeModuleModal();
    this.loadModules();
  }

  toggleModuleActive(mod: SystemModule): void {
    if (mod.isDeleted) {
      const confirmActivate = window.confirm(
        `Are you sure you want to activate module "${mod.name}" (${mod.code})? It will be restored from deleted state and all its associated permissions will be automatically activated.`
      );
      if (!confirmActivate) return;

      this.settingsService.activateModule(mod.id).subscribe({
        next: () => this.loadModules(),
        error: (err) => {
          window.alert(err?.error?.message || 'Failed to activate module');
        },
      });
      return;
    }

    if (mod.isActive) {
      const confirmDeactivate = window.confirm(
        `Are you sure you want to deactivate module "${mod.name}" (${mod.code})? All its associated permissions will be automatically deactivated.`
      );
      if (!confirmDeactivate) return;

      this.settingsService.deactivateModule(mod.id).subscribe({
        next: () => this.loadModules(),
        error: (err) => {
          window.alert(err?.error?.message || 'Failed to deactivate module');
        },
      });
    } else {
      const confirmActivate = window.confirm(
        `Are you sure you want to activate module "${mod.name}" (${mod.code})? All its associated permissions will be automatically activated.`
      );
      if (!confirmActivate) return;

      this.settingsService.activateModule(mod.id).subscribe({
        next: () => this.loadModules(),
        error: (err) => {
          window.alert(err?.error?.message || 'Failed to activate module');
        },
      });
    }
  }

  deleteModule(mod: SystemModule): void {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete module "${mod.name}" (${mod.code})? The module will be marked as deleted (True) and all its associated permissions will be automatically deactivated.`
    );
    if (!confirmDelete) return;

    this.settingsService.deleteModule(mod.id).subscribe({
      next: () => this.loadModules(),
      error: (err) => {
        window.alert(err?.error?.message || 'Failed to delete module');
      },
    });
  }
}
