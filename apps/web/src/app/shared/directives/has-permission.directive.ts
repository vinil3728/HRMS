import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { Permission } from '../../core/models/permission.model';
import { RbacService } from '../../core/services/rbac.service';

@Directive({
  selector: '[appHasPermission]',
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly rbacService = inject(RbacService);

  readonly appHasPermission = input.required<Permission | string | (Permission | string)[]>();
  readonly requireAll = input<boolean>(false);

  private hasView = false;

  constructor() {
    effect(() => {
      const perms = this.appHasPermission();
      const permsArray = Array.isArray(perms) ? perms : [perms];
      const all = this.requireAll();

      const isAllowed = all
        ? this.rbacService.hasAllPermissions(permsArray)
        : this.rbacService.hasAnyPermission(permsArray);

      if (isAllowed && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!isAllowed && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
}
