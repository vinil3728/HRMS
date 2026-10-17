import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SystemModule, SystemPermission } from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-module-permissions-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './module-permissions-modal.component.html',
  styleUrl: './module-permissions-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulePermissionsModalComponent {
  private readonly settingsService = inject(SettingsService);

  readonly isOpen = input<boolean>(false);
  readonly module = input<SystemModule | null>(null);

  readonly closeModal = output<void>();

  readonly loading = signal<boolean>(false);
  readonly permissions = signal<SystemPermission[]>([]);
  readonly searchQuery = signal<string>('');

  constructor() {
    effect(
      () => {
        const mod = this.module();
        const open = this.isOpen();
        if (open && mod) {
          this.loadModulePermissions(mod.id);
        } else {
          this.permissions.set([]);
          this.searchQuery.set('');
        }
      },
      { allowSignalWrites: true }
    );
  }

  loadModulePermissions(moduleId: string): void {
    this.loading.set(true);
    this.settingsService.getModule(moduleId).subscribe({
      next: (fullModule) => {
        this.permissions.set(fullModule.permissions || []);
        this.loading.set(false);
      },
      error: () => {
        this.permissions.set([]);
        this.loading.set(false);
      },
    });
  }

  readonly filteredPermissions = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.permissions();
    if (!q) return list;

    return list.filter((p) => {
      const matchCode = p.code.toLowerCase().includes(q);
      const matchName = p.name.toLowerCase().includes(q);
      const matchScope = (p.scopes ? String(p.scopes) : '').toLowerCase().includes(q);
      const matchDesc = p.description ? p.description.toLowerCase().includes(q) : false;
      return matchCode || matchName || matchScope || matchDesc;
    });
  });

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onClose(): void {
    this.closeModal.emit();
  }
}
