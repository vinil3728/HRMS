import { CommonModule, DatePipe } from '@angular/common';
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
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  Policy,
  PolicyAcknowledgement,
} from '../../models/policy.model';
import { PolicyService } from '../../services/policy.service';

@Component({
  selector: 'app-policy-acknowledgements-modal',
  imports: [CommonModule, DatePipe, IconComponent, AvatarComponent],
  templateUrl: './policy-acknowledgements-modal.component.html',
  styleUrl: './policy-acknowledgements-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolicyAcknowledgementsModalComponent {
  private readonly policyService = inject(PolicyService);

  readonly isOpen = input<boolean>(false);
  readonly policy = input<Policy | null>(null);

  readonly closeModal = output<void>();

  readonly acknowledgements = signal<PolicyAcknowledgement[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly searchTerm = signal<string>('');

  readonly filteredAcknowledgements = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.acknowledgements();
    if (!term) return list;

    return list.filter((ack) => {
      const fullName = `${ack.employee.firstName} ${ack.employee.lastName}`.toLowerCase();
      const code = (ack.employee.employeeCode || '').toLowerCase();
      const dept = (ack.employee.department?.name || '').toLowerCase();
      return (
        fullName.includes(term) ||
        code.includes(term) ||
        dept.includes(term)
      );
    });
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const p = this.policy();

      if (open && p) {
        this.searchTerm.set('');
        this.errorMessage.set('');
        this.loadAcknowledgements(p.id);
      } else {
        this.acknowledgements.set([]);
      }
    });
  }

  loadAcknowledgements(policyId: string): void {
    this.loading.set(true);
    this.policyService.getPolicyAcknowledgements(policyId).subscribe({
      next: (list) => {
        this.acknowledgements.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Failed to load policy acknowledgements'
        );
      },
    });
  }

  onSearchInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.searchTerm.set(inputEl.value);
  }

  onCancel(): void {
    this.closeModal.emit();
  }

  exportCsv(): void {
    const list = this.filteredAcknowledgements();
    if (list.length === 0) return;

    const p = this.policy();
    const code = p ? p.code : 'policy';

    const headers = [
      'Employee Name',
      'Employee Code',
      'Email',
      'Department',
      'Designation',
      'Acknowledged At',
    ];

    const rows = list.map((a) => [
      `"${a.employee.firstName} ${a.employee.lastName}"`,
      a.employee.employeeCode,
      a.employee.email,
      `"${a.employee.department?.name || ''}"`,
      `"${a.employee.designation?.name || ''}"`,
      a.acknowledgedAt,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `acknowledgements_${code}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
