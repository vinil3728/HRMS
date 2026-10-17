import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SystemModule, CreatePermissionDto } from '../../models/settings.model';
import { SettingsService } from '../../services/settings.service';

export interface BulkPermissionRow {
  id: string;
  code: string;
  name: string;
  moduleId: string;
  scopes: string;
  description: string;
}

@Component({
  selector: 'app-permission-bulk-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './permission-bulk-modal.component.html',
  styleUrl: './permission-bulk-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionBulkModalComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);

  readonly isOpen = input<boolean>(false);
  readonly modules = input<SystemModule[]>([]);

  readonly closeModal = output<void>();
  readonly saved = output<number>();

  readonly defaultModuleId = signal<string>('');
  readonly rows = signal<BulkPermissionRow[]>([]);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly scopeOptions = [
    { value: 'SELF', label: 'SELF' },
    { value: 'TEAM', label: 'TEAM' },
    { value: 'ORG', label: 'ORG' },
  ];

  readonly validRowsCount = computed(() => {
    return this.rows().filter(
      (r) => r.code.trim() && r.name.trim() && r.moduleId
    ).length;
  });

  ngOnInit(): void {
    if (this.modules().length > 0) {
      this.defaultModuleId.set(this.modules()[0].id);
    }
    this.initDefaultRows();
  }

  initDefaultRows(): void {
    const modId = this.defaultModuleId() || (this.modules()[0]?.id ?? '');
    this.rows.set([
      this.createRow('', '', modId, 'SELF', ''),
      this.createRow('', '', modId, 'TEAM', ''),
      this.createRow('', '', modId, 'ORG', ''),
    ]);
  }

  createRow(
    code = '',
    name = '',
    moduleId = '',
    scopes = 'SELF',
    description = ''
  ): BulkPermissionRow {
    return {
      id: Math.random().toString(36).substring(2, 9),
      code,
      name,
      moduleId: moduleId || this.defaultModuleId() || (this.modules()[0]?.id ?? ''),
      scopes,
      description,
    };
  }

  onDefaultModuleChange(newModuleId: string): void {
    this.defaultModuleId.set(newModuleId);
    // Update any rows that don't have a module set
    this.rows.update((list) =>
      list.map((r) => (!r.moduleId ? { ...r, moduleId: newModuleId } : r))
    );
  }

  onCodeChange(row: BulkPermissionRow, rawValue: string): void {
    row.code = rawValue.toUpperCase().replace(/\s+/g, '_');
    this.rows.set([...this.rows()]);
  }

  addRow(): void {
    const modId = this.defaultModuleId() || (this.modules()[0]?.id ?? '');
    this.rows.update((list) => [...list, this.createRow('', '', modId, 'SELF', '')]);
  }

  removeRow(index: number): void {
    this.rows.update((list) => list.filter((_, i) => i !== index));
  }

  clearAllRows(): void {
    this.rows.set([]);
  }

  generateCrudTemplate(): void {
    const modId = this.defaultModuleId() || (this.modules()[0]?.id ?? '');
    const foundModule = this.modules().find((m) => m.id === modId);
    const modName = foundModule ? foundModule.name : 'RESOURCE';
    const prefix = modName.toUpperCase().replace(/\s+/g, '_');

    const templateRows: BulkPermissionRow[] = [
      this.createRow(
        `${prefix}_VIEW`,
        `View ${modName}`,
        modId,
        'SELF',
        `Access and view ${modName.toLowerCase()} details`
      ),
      this.createRow(
        `${prefix}_CREATE`,
        `Create ${modName}`,
        modId,
        'ORG',
        `Create new ${modName.toLowerCase()} entries`
      ),
      this.createRow(
        `${prefix}_EDIT`,
        `Edit ${modName}`,
        modId,
        'ORG',
        `Update existing ${modName.toLowerCase()} entries`
      ),
      this.createRow(
        `${prefix}_DELETE`,
        `Delete ${modName}`,
        modId,
        'ORG',
        `Remove or archive ${modName.toLowerCase()} entries`
      ),
      this.createRow(
        `${prefix}_EXPORT`,
        `Export ${modName}`,
        modId,
        'ORG',
        `Export ${modName.toLowerCase()} data to CSV or Excel`
      ),
    ];
    this.rows.set(templateRows);
    this.errorMessage.set(null);
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    const rowsToSubmit = this.rows().filter(
      (r) => r.code.trim() && r.name.trim()
    );

    if (rowsToSubmit.length === 0) {
      this.errorMessage.set(
        'Please enter at least one valid permission with Code, Name, and Module.'
      );
      return;
    }

    // Validate codes and modules
    const codeRegex = /^[A-Z0-9_]{2,100}$/;
    for (const r of rowsToSubmit) {
      const code = r.code.trim().toUpperCase();
      if (!codeRegex.test(code)) {
        this.errorMessage.set(
          `Invalid code format "${r.code}". Code must contain only uppercase letters, numbers, and underscores (2-100 characters).`
        );
        return;
      }
      if (!r.name.trim()) {
        this.errorMessage.set(`Permission name is required for code "${r.code}".`);
        return;
      }
      if (!r.moduleId) {
        this.errorMessage.set(`Please select a module for "${r.name}".`);
        return;
      }
    }

    // Check for duplicates within the current submission
    const codes = rowsToSubmit.map((r) => r.code.trim().toUpperCase());
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== codes.length) {
      this.errorMessage.set('Duplicate permission codes found in this batch.');
      return;
    }

    this.submitting.set(true);

    const dtos: CreatePermissionDto[] = rowsToSubmit.map((r) => ({
      code: r.code.trim().toUpperCase(),
      name: r.name.trim(),
      moduleId: r.moduleId,
      scopes: r.scopes || 'SELF',
      allowedScopes:
        r.scopes === 'ORG'
          ? ['ORG']
          : r.scopes === 'TEAM'
          ? ['SELF', 'TEAM']
          : ['SELF'],
      description: r.description?.trim() || undefined,
    }));

    this.settingsService.bulkCreatePermissions(dtos).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.saved.emit(res.length);
        this.closeModal.emit();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err?.error?.message ||
            'Failed to bulk create permissions. Please check for duplicate codes or missing fields.'
        );
      },
    });
  }
}
