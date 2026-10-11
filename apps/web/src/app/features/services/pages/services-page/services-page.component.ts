import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ALL_SERVICES } from '../../../../core/config/navigation.config';
import { RbacService } from '../../../../core/services/rbac.service';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-services-page',
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './services-page.component.html',
  styleUrl: './services-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesPageComponent {
  private readonly rbacService = inject(RbacService);

  readonly searchQuery = signal<string>('');

  readonly filteredServices = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const accessible = ALL_SERVICES.filter((service) => {
      if (!service.permission) return true;
      return this.rbacService.hasPermission(service.permission);
    });

    if (!query) return accessible;
    return accessible.filter(
      (service) =>
        service.label.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query)
    );
  });

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }
}
