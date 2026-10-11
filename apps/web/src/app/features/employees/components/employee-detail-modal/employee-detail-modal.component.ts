import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  Employee,
  EmployeeBankDetails,
  EmployeeDocument,
  EmployeeIdentityDetails,
  EmployeeProfileDetails,
} from '../../models/employee.model';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-employee-detail-modal',
  imports: [CommonModule, IconComponent, AvatarComponent, BadgeComponent],
  templateUrl: './employee-detail-modal.component.html',
  styleUrl: './employee-detail-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDetailModalComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);

  readonly employee = input.required<Employee>();
  readonly closeModal = output<void>();

  readonly activeTab = signal<'overview' | 'profile' | 'identity' | 'bank' | 'documents'>('overview');
  readonly isLoadingSub = signal<boolean>(false);

  readonly profile = signal<EmployeeProfileDetails | null>(null);
  readonly identity = signal<EmployeeIdentityDetails | null>(null);
  readonly bankDetails = signal<EmployeeBankDetails | null>(null);
  readonly documents = signal<EmployeeDocument[]>([]);

  ngOnInit(): void {
    this.loadSubResources();
  }

  private loadSubResources(): void {
    const id = this.employee().id;
    this.isLoadingSub.set(true);

    this.employeeService.getProfile(id).subscribe((p) => this.profile.set(p));
    this.employeeService.getIdentity(id).subscribe((i) => this.identity.set(i));
    this.employeeService.getBankDetails(id).subscribe((b) => this.bankDetails.set(b));
    this.employeeService.getDocuments(id).subscribe((docs) => {
      this.documents.set(docs);
      this.isLoadingSub.set(false);
    });
  }

  onClose(): void {
    this.closeModal.emit();
  }
}
