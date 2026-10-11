import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update((val) => !val);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((val) => !val);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
