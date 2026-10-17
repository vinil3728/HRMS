import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { Role } from '../../models/settings.model';

@Component({
  selector: 'app-role-detail-modal',
  imports: [CommonModule, DatePipe, IconComponent, BadgeComponent],
  templateUrl: './role-detail-modal.component.html',
  styleUrl: './role-detail-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleDetailModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly role = input<Role | null>(null);

  readonly closeModal = output<void>();

  readonly searchQuery = signal<string>('');

  readonly filteredPermissions = computed(() => {
    const list = this.role()?.rolePermissions || [];
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return list;

    return list.filter((rp) => {
      const permName = (rp.permission?.name || '').toLowerCase();
      const permCode = (rp.permission?.code || '').toLowerCase();
      const moduleName = typeof rp.permission?.module === 'object' && rp.permission.module?.name
        ? rp.permission.module.name.toLowerCase()
        : '';
      const scopes = (rp.scopes || []).join(' ').toLowerCase();

      return (
        permName.includes(query) ||
        permCode.includes(query) ||
        moduleName.includes(query) ||
        scopes.includes(query)
      );
    });
  });

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  getModuleName(permission: any): string {
    if (!permission?.module) return '';
    if (typeof permission.module === 'string') return permission.module;
    return permission.module.name || permission.module.code || '';
  }

  onClose(): void {
    this.searchQuery.set('');
    this.closeModal.emit();
  }
}
