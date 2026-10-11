import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Permission } from '../../../../core/models/permission.model';
import { AuthService } from '../../../../core/services/auth.service';
import { RbacService } from '../../../../core/services/rbac.service';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { AvatarComponent } from '../../../../shared/ui/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import {
  SelectComponent,
  SelectOption,
} from '../../../../shared/ui/select/select.component';
import {
  Employee,
  EmployeeBankDetails,
  EmployeeDocument,
  EmployeeIdentityDetails,
  EmployeeProfileDetails,
} from '../../models/employee.model';
import { EmployeeService } from '../../services/employee.service';

export type MyProfileTab =
  | 'overview'
  | 'profile'
  | 'identity'
  | 'bank'
  | 'documents'
  | 'security';

@Component({
  selector: 'app-my-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HasPermissionDirective,
    IconComponent,
    AvatarComponent,
    BadgeComponent,
    SelectComponent,
  ],
  templateUrl: './my-profile-page.component.html',
  styleUrl: './my-profile-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyProfilePageComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  readonly rbacService = inject(RbacService);
  private readonly route = inject(ActivatedRoute);

  readonly Permission = Permission;

  readonly activeTab = signal<MyProfileTab>('overview');
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly employee = signal<Employee | null>(null);
  readonly profile = signal<EmployeeProfileDetails | null>(null);
  readonly identity = signal<EmployeeIdentityDetails | null>(null);
  readonly bankDetails = signal<EmployeeBankDetails | null>(null);
  readonly documents = signal<EmployeeDocument[]>([]);

  // Edit mode toggles
  readonly isEditingProfile = signal<boolean>(false);
  readonly isEditingIdentity = signal<boolean>(false);
  readonly isEditingBank = signal<boolean>(false);
  readonly showSensitiveIdentity = signal<boolean>(false);

  // Profile form state
  profileForm: Partial<EmployeeProfileDetails> = {};

  // Identity form state
  identityForm: { panNumber: string; aadhaarNumber: string } = {
    panNumber: '',
    aadhaarNumber: '',
  };

  // Bank form state
  bankForm: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
  } = {
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
  };

  // Document upload state
  selectedDocType = 'RESUME';
  selectedFile: File | null = null;
  readonly isUploadingDoc = signal<boolean>(false);

  // Password change state
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  readonly genderOptions: SelectOption[] = [
    { value: '', label: 'Select Gender' },
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'NON_BINARY', label: 'Non-Binary' },
    { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
  ];

  readonly maritalStatusOptions: SelectOption[] = [
    { value: '', label: 'Select Marital Status' },
    { value: 'SINGLE', label: 'Single' },
    { value: 'MARRIED', label: 'Married' },
    { value: 'DIVORCED', label: 'Divorced' },
    { value: 'WIDOWED', label: 'Widowed' },
  ];

  readonly bloodGroupOptions: SelectOption[] = [
    { value: '', label: 'Select Blood Group' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
  ];

  readonly documentTypeOptions: SelectOption[] = [
    { value: 'AADHAAR', label: 'Aadhaar Card' },
    { value: 'PAN', label: 'PAN Card' },
    { value: 'PASSPORT', label: 'Passport' },
    { value: 'RESUME', label: 'Resume / CV' },
    { value: 'OFFER_LETTER', label: 'Offer Letter' },
    { value: 'JOINING_LETTER', label: 'Joining Letter' },
    { value: 'EXPERIENCE_LETTER', label: 'Experience Letter' },
    { value: 'EDUCATIONAL_CERTIFICATE', label: 'Educational Certificate' },
    { value: 'OTHER', label: 'Other Document' },
  ];

  readonly canEditProfile = computed(() => {
    const hasExisting = !!this.profile()?.id;
    return hasExisting
      ? this.rbacService.hasPermission(Permission.EMPLOYEE_PROFILE_UPDATE)
      : this.rbacService.hasPermission(Permission.EMPLOYEE_PROFILE_CREATE);
  });

  readonly canEditIdentity = computed(() => {
    const hasExisting = !!this.identity()?.id;
    return hasExisting
      ? this.rbacService.hasPermission(Permission.EMPLOYEE_IDENTITY_UPDATE)
      : this.rbacService.hasPermission(Permission.EMPLOYEE_IDENTITY_CREATE);
  });

  readonly canEditBank = computed(() => {
    const hasExisting = !!this.bankDetails()?.id;
    return hasExisting
      ? this.rbacService.hasPermission(Permission.EMPLOYEE_BANK_UPDATE)
      : this.rbacService.hasPermission(Permission.EMPLOYEE_BANK_CREATE);
  });

  readonly fullName = computed(() => {
    const emp = this.employee();
    if (!emp) return this.authService.currentUser()?.username || 'Employee';
    return `${emp.firstName} ${emp.lastName}`.trim();
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab') as MyProfileTab | null;
      if (
        tab &&
        ['overview', 'profile', 'identity', 'bank', 'documents', 'security'].includes(tab)
      ) {
        this.activeTab.set(tab);
      }
    });

    this.loadMyProfileData();
  }

  setTab(tab: MyProfileTab): void {
    this.clearAlerts();
    this.activeTab.set(tab);
  }

  loadMyProfileData(): void {
    this.isLoading.set(true);
    this.employeeService.getMyProfile().subscribe({
      next: (emp) => {
        this.employee.set(emp);
        this.isLoading.set(false);
        if (emp?.id) {
          this.loadSubResources(emp.id);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message || 'Unable to load your employee profile.'
        );
      },
    });
  }

  private loadSubResources(employeeId: string): void {
    if (this.rbacService.hasPermission(Permission.EMPLOYEE_PROFILE_VIEW)) {
      this.employeeService.getProfile(employeeId).subscribe((p) => {
        this.profile.set(p);
      });
    }

    if (this.rbacService.hasPermission(Permission.EMPLOYEE_IDENTITY_VIEW)) {
      this.employeeService.getIdentity(employeeId).subscribe((i) => {
        this.identity.set(i);
      });
    }

    if (this.rbacService.hasPermission(Permission.EMPLOYEE_BANK_VIEW)) {
      this.employeeService.getBankDetails(employeeId).subscribe((b) => {
        this.bankDetails.set(b);
      });
    }

    if (this.rbacService.hasPermission(Permission.EMPLOYEE_DOCUMENT_VIEW)) {
      this.employeeService.getDocuments(employeeId).subscribe((docs) => {
        this.documents.set(docs || []);
      });
    }
  }

  // ---- Personal Profile Form ----
  startEditProfile(): void {
    this.clearAlerts();
    const current = this.profile();
    const dob = current?.dateOfBirth
      ? String(current.dateOfBirth).slice(0, 10)
      : '';
    this.profileForm = {
      dateOfBirth: dob,
      gender: current?.gender || '',
      maritalStatus: current?.maritalStatus || '',
      bloodGroup: current?.bloodGroup || '',
      nationality: current?.nationality || '',
      personalEmail: current?.personalEmail || '',
      alternatePhone: current?.alternatePhone || '',
      addressLine1: current?.addressLine1 || '',
      addressLine2: current?.addressLine2 || '',
      city: current?.city || '',
      state: current?.state || '',
      country: current?.country || '',
      postalCode: current?.postalCode || '',
      emergencyContactName: current?.emergencyContactName || '',
      emergencyContactRelationship:
        current?.emergencyContactRelationship || '',
      emergencyContactPhone: current?.emergencyContactPhone || '',
    };
    this.isEditingProfile.set(true);
  }

  cancelEditProfile(): void {
    this.isEditingProfile.set(false);
    this.clearAlerts();
  }

  saveProfile(): void {
    const empId = this.employee()?.id;
    if (!empId) return;

    this.clearAlerts();
    this.isSaving.set(true);

    const payload: Partial<EmployeeProfileDetails> = {
      dateOfBirth: this.profileForm.dateOfBirth?.trim() || undefined,
      gender: this.profileForm.gender?.trim() || undefined,
      maritalStatus: this.profileForm.maritalStatus?.trim() || undefined,
      bloodGroup: this.profileForm.bloodGroup?.trim() || undefined,
      nationality: this.profileForm.nationality?.trim() || undefined,
      personalEmail: this.profileForm.personalEmail?.trim() || undefined,
      alternatePhone: this.profileForm.alternatePhone?.trim() || undefined,
      addressLine1: this.profileForm.addressLine1?.trim() || undefined,
      addressLine2: this.profileForm.addressLine2?.trim() || undefined,
      city: this.profileForm.city?.trim() || undefined,
      state: this.profileForm.state?.trim() || undefined,
      country: this.profileForm.country?.trim() || undefined,
      postalCode: this.profileForm.postalCode?.trim() || undefined,
      emergencyContactName:
        this.profileForm.emergencyContactName?.trim() || undefined,
      emergencyContactRelationship:
        this.profileForm.emergencyContactRelationship?.trim() || undefined,
      emergencyContactPhone:
        this.profileForm.emergencyContactPhone?.trim() || undefined,
    };

    const req$ = this.profile()?.id
      ? this.employeeService.updateProfile(empId, payload)
      : this.employeeService.createProfile(empId, payload);

    req$.subscribe({
      next: (saved) => {
        this.profile.set(saved);
        this.isEditingProfile.set(false);
        this.isSaving.set(false);
        this.showSuccess('Personal and emergency details saved successfully.');
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = Array.isArray(err?.error?.message)
          ? err.error.message.join(', ')
          : err?.error?.message || 'Failed to save personal profile details.';
        this.errorMessage.set(msg);
      },
    });
  }

  // ---- Identity Form ----
  startEditIdentity(): void {
    this.clearAlerts();
    const current = this.identity();
    this.identityForm = {
      panNumber: current?.panNumber || '',
      aadhaarNumber: current?.aadhaarNumber || '',
    };
    this.isEditingIdentity.set(true);
  }

  cancelEditIdentity(): void {
    this.isEditingIdentity.set(false);
    this.clearAlerts();
  }

  saveIdentity(): void {
    const empId = this.employee()?.id;
    if (!empId) return;

    this.clearAlerts();
    this.isSaving.set(true);

    const payload: Partial<EmployeeIdentityDetails> = {
      panNumber: this.identityForm.panNumber.trim()
        ? this.identityForm.panNumber.trim().toUpperCase()
        : undefined,
      aadhaarNumber: this.identityForm.aadhaarNumber.trim() || undefined,
    };

    const req$ = this.identity()?.id
      ? this.employeeService.updateIdentity(empId, payload)
      : this.employeeService.createIdentity(empId, payload);

    req$.subscribe({
      next: (saved) => {
        this.identity.set(saved);
        this.isEditingIdentity.set(false);
        this.isSaving.set(false);
        this.showSuccess('Identity verification details saved successfully.');
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = Array.isArray(err?.error?.message)
          ? err.error.message.join(', ')
          : err?.error?.message || 'Failed to save identity details.';
        this.errorMessage.set(msg);
      },
    });
  }

  maskValue(value?: string | null, visibleTail = 4): string {
    if (!value) return '—';
    if (this.showSensitiveIdentity()) return value;
    if (value.length <= visibleTail) return value;
    return '•'.repeat(value.length - visibleTail) + value.slice(-visibleTail);
  }

  // ---- Bank Details Form ----
  startEditBank(): void {
    this.clearAlerts();
    const current = this.bankDetails();
    this.bankForm = {
      accountHolderName: current?.accountHolderName || this.fullName(),
      bankName: current?.bankName || '',
      accountNumber: current?.accountNumber || '',
      ifscCode: current?.ifscCode || '',
      branchName: current?.branchName || '',
    };
    this.isEditingBank.set(true);
  }

  cancelEditBank(): void {
    this.isEditingBank.set(false);
    this.clearAlerts();
  }

  saveBankDetails(): void {
    const empId = this.employee()?.id;
    if (!empId) return;

    this.clearAlerts();
    this.isSaving.set(true);

    const payload: Partial<EmployeeBankDetails> = {
      accountHolderName: this.bankForm.accountHolderName.trim(),
      bankName: this.bankForm.bankName.trim(),
      accountNumber: this.bankForm.accountNumber.trim(),
      ifscCode: this.bankForm.ifscCode.trim().toUpperCase(),
      branchName: this.bankForm.branchName.trim(),
    };

    const req$ = this.bankDetails()?.id
      ? this.employeeService.updateBankDetails(empId, payload)
      : this.employeeService.createBankDetails(empId, payload);

    req$.subscribe({
      next: (saved) => {
        this.bankDetails.set(saved);
        this.isEditingBank.set(false);
        this.isSaving.set(false);
        this.showSuccess('Bank account details saved successfully.');
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = Array.isArray(err?.error?.message)
          ? err.error.message.join(', ')
          : err?.error?.message || 'Failed to save bank details.';
        this.errorMessage.set(msg);
      },
    });
  }

  // ---- Documents Vault ----
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  uploadDocument(fileInput: HTMLInputElement): void {
    const empId = this.employee()?.id;
    if (!empId || !this.selectedFile) return;

    this.clearAlerts();
    this.isUploadingDoc.set(true);

    this.employeeService
      .uploadDocument(empId, this.selectedFile, this.selectedDocType)
      .subscribe({
        next: (doc) => {
          this.documents.update((list) => [doc, ...list]);
          this.selectedFile = null;
          fileInput.value = '';
          this.isUploadingDoc.set(false);
          this.showSuccess('Document uploaded successfully.');
        },
        error: (err) => {
          this.isUploadingDoc.set(false);
          const msg = Array.isArray(err?.error?.message)
            ? err.error.message.join(', ')
            : err?.error?.message || 'Failed to upload document.';
          this.errorMessage.set(msg);
        },
      });
  }

  downloadDocument(doc: EmployeeDocument): void {
    const empId = this.employee()?.id;
    if (!empId) return;

    this.employeeService.downloadDocument(empId, doc.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.fileName || doc.originalFileName || 'document';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage.set('Unable to download document file.');
      },
    });
  }

  deleteDocument(doc: EmployeeDocument): void {
    const empId = this.employee()?.id;
    if (!empId) return;

    this.clearAlerts();
    this.employeeService.deleteDocument(empId, doc.id).subscribe({
      next: () => {
        this.documents.update((list) => list.filter((d) => d.id !== doc.id));
        this.showSuccess('Document removed from your vault.');
      },
      error: (err) => {
        this.errorMessage.set(
          err?.error?.message || 'Failed to delete document.'
        );
      },
    });
  }

  formatDocumentType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  // ---- Change Password ----
  submitPasswordChange(): void {
    this.clearAlerts();
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm;

    if (!currentPassword || !newPassword) {
      this.errorMessage.set('Please fill in both current and new password fields.');
      return;
    }

    if (newPassword.length < 8) {
      this.errorMessage.set('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.errorMessage.set('New password and confirmation do not match.');
      return;
    }

    this.isSaving.set(true);
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        };
        this.showSuccess(res.message || 'Password updated successfully.');
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = Array.isArray(err?.error?.message)
          ? err.error.message.join(', ')
          : err?.error?.message || 'Failed to update password.';
        this.errorMessage.set(msg);
      },
    });
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      if (this.successMessage() === message) {
        this.successMessage.set(null);
      }
    }, 4500);
  }

  private clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
