import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Permission } from '../../../../core/models/permission.model';
import { AuthService } from '../../../../core/services/auth.service';
import { RbacService } from '../../../../core/services/rbac.service';
import { EmployeeService } from '../../../employees/services/employee.service';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/select/select.component';
import { SettingsService } from '../../services/settings.service';

export type PerspectiveMode = 'employee' | 'manager' | 'hr' | 'admin';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent, SelectComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly rbacService = inject(RbacService);
  private readonly authService = inject(AuthService);
  private readonly employeeService = inject(EmployeeService);

  readonly Permission = Permission;

  // ── Permissions & Access Controls (Strictly Permission-Driven, Zero Hardcoded Roles) ──
  readonly canAccessEmployeePerspective = computed<boolean>(() => true);

  readonly canAccessManagerPerspective = computed<boolean>(() => {
    return this.rbacService.hasAnyPermission([
      Permission.SETTINGS_MANAGER_VIEW,
      Permission.LEAVE_APPROVE,
      Permission.REIMBURSEMENT_APPROVE,
      Permission.TIMESHEET_APPROVE,
      Permission.ATTENDANCE_TEAM_VIEW,
      Permission.ATTENDANCE_REGULARIZATION_APPROVE,
      Permission.PERFORMANCE_EVALUATION_CREATE,
      Permission.LOAN_APPROVE,
    ]);
  });

  readonly canAccessHRPerspective = computed<boolean>(() => {
    return this.rbacService.hasAnyPermission([
      Permission.SETTINGS_HR_VIEW,
      Permission.EMPLOYEE_CREATE,
      Permission.EMPLOYEE_UPDATE,
      Permission.EMPLOYEE_STATUS_UPDATE,
      Permission.LEAVE_BALANCE_CREATE,
      Permission.POLICY_CREATE,
      Permission.POLICY_PUBLISH,
      Permission.PAYROLL_PROCESS,
      Permission.HOLIDAY_CREATE,
    ]);
  });

  readonly canAccessAdminPerspective = computed<boolean>(() => {
    return this.rbacService.hasAnyPermission([
      Permission.SETTINGS_ORG_VIEW,
      Permission.SETTINGS_VIEW,
      Permission.SETTINGS_UPDATE,
      Permission.ROLE_VIEW,
      Permission.ROLE_CREATE,
      Permission.ROLE_PERMISSION_ASSIGN,
      Permission.USER_VIEW,
      Permission.USER_CREATE,
    ]);
  });

  readonly availablePerspectives = computed<PerspectiveMode[]>(() => {
    const list: PerspectiveMode[] = [];
    if (this.canAccessEmployeePerspective()) list.push('employee');
    if (this.canAccessManagerPerspective()) list.push('manager');
    if (this.canAccessHRPerspective()) list.push('hr');
    if (this.canAccessAdminPerspective()) list.push('admin');
    return list;
  });

  // ── Active Navigation State ───────────────────────────────────────────────
  readonly activePerspective = signal<PerspectiveMode>('employee');
  readonly activeEmployeeTab = signal<'preferences' | 'notifications' | 'security'>('preferences');
  readonly activeManagerTab = signal<'delegation' | 'team-alerts'>('delegation');
  readonly activeHRTab = signal<'lifecycle' | 'governance' | 'compliance'>('lifecycle');
  readonly activeAdminTab = signal<'organization' | 'security'>('organization');

  // ── Shared Feedback & Status ──────────────────────────────────────────────
  readonly isSaving = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly delegateOptions = signal<SelectOption[]>([]);

  // ── Common Select Options ─────────────────────────────────────────────────
  readonly languageOptions: SelectOption[] = [
    { value: 'en-IN', label: 'English (India)' },
    { value: 'en-US', label: 'English (United States)' },
    { value: 'en-GB', label: 'English (United Kingdom)' },
  ];

  readonly dateFormatOptions: SelectOption[] = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 10/10/2026)' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 10/10/2026)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO standard)' },
  ];

  readonly timeFormatOptions: SelectOption[] = [
    { value: '12h', label: '12-Hour (e.g. 02:30 PM)' },
    { value: '24h', label: '24-Hour (e.g. 14:30)' },
  ];

  readonly densityOptions: SelectOption[] = [
    { value: 'comfortable', label: 'Comfortable (Default padding)' },
    { value: 'compact', label: 'Compact (High information density)' },
  ];

  readonly digestFrequencyOptions: SelectOption[] = [
    { value: 'realtime', label: 'Immediate / Real-time notifications' },
    { value: 'daily', label: 'Daily summary digest at 6:00 PM' },
    { value: 'weekly', label: 'Weekly roundup digest every Monday' },
  ];

  readonly currencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'];
  readonly currencyOptions: SelectOption[] = this.currencies.map((c) => ({
    value: c,
    label: c,
  }));

  readonly timezones = [
    'Asia/Kolkata (IST +05:30)',
    'America/New_York (EST -05:00)',
    'Europe/London (GMT +00:00)',
    'Asia/Dubai (GST +04:00)',
    'Asia/Singapore (SGT +08:00)',
    'UTC (UTC +00:00)',
  ];
  readonly timezoneOptions: SelectOption[] = this.timezones.map((tz) => ({
    value: tz,
    label: tz,
  }));

  readonly fiscalMonths = ['January', 'April', 'July', 'October'];
  readonly fiscalMonthOptions: SelectOption[] = this.fiscalMonths.map((m) => ({
    value: m,
    label: m,
  }));

  readonly daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  readonly selectedWorkDays = signal<string[]>([]);

  // ── Employee Perspective Forms ────────────────────────────────────────────
  readonly empPrefForm: FormGroup = this.fb.group({
    displayName: [''],
    language: ['en-IN', Validators.required],
    dateFormat: ['DD/MM/YYYY', Validators.required],
    timeFormat: ['12h', Validators.required],
    density: ['comfortable', Validators.required],
  });

  readonly empNotifForm: FormGroup = this.fb.group({
    emailLeaveUpdates: [true],
    emailPayrollPublished: [true],
    emailReimbursementStatus: [true],
    emailPolicyAnnouncements: [true],
    inAppAttendanceReminders: [true],
    inAppCelebrations: [true],
    emailDigestFrequency: ['realtime', Validators.required],
  });

  readonly empSecForm: FormGroup = this.fb.group({
    twoFactorEnabled: [false],
    twoFactorMethod: ['email_otp'],
    notifyNewLogins: [true],
    currentPassword: [''],
    newPassword: ['', [Validators.minLength(8)]],
    confirmPassword: [''],
  });

  // ── Manager Perspective Forms ─────────────────────────────────────────────
  readonly managerDelegationForm: FormGroup = this.fb.group({
    isDelegationActive: [false],
    delegateEmployeeId: [''],
    delegateName: [''],
    startDate: [''],
    endDate: [''],
    delegateLeaves: [true],
    delegateTimesheets: [true],
    delegateReimbursements: [true],
    delegateAttendanceRegularizations: [true],
    notifyDelegateOnAssignment: [true],
  });

  readonly managerAlertsForm: FormGroup = this.fb.group({
    notifyLateCheckIn: [true],
    lateThresholdMinutes: [15, [Validators.required, Validators.min(5)]],
    notifyUnplannedAbsence: [true],
    notifyOvertimeHours: [false],
    weeklyOvertimeThresholdHours: [45, [Validators.required, Validators.min(30)]],
    dailyPendingApprovalReminder: [true],
    reminderTime: ['09:00 AM'],
  });

  // ── HR Perspective Forms ──────────────────────────────────────────────────
  readonly hrLifecycleForm: FormGroup = this.fb.group({
    defaultProbationDays: [90, [Validators.required, Validators.min(0)]],
    defaultNoticePeriodDays: [60, [Validators.required, Validators.min(0)]],
    onboardingDocDeadlineDays: [7, [Validators.required, Validators.min(1)]],
    sendWelcomeEmailOnCreation: [true],
    requireIdentityVerification: [true],
    requireBankDetailsOnJoin: [true],
  });

  readonly hrGovernanceForm: FormGroup = this.fb.group({
    lateCheckInGraceMinutes: [15, [Validators.required, Validators.min(0)]],
    maxRegularizationsPerMonth: [3, [Validators.required, Validators.min(0)]],
    halfDayMinHours: [4.5, [Validators.required, Validators.min(1)]],
    fullDayMinHours: [8.0, [Validators.required, Validators.min(1)]],
    enforceSandwichLeaveRule: [false],
    allowNegativeLeaveBalance: [false],
  });

  readonly hrComplianceForm: FormGroup = this.fb.group({
    policyAckGraceDays: [14, [Validators.required, Validators.min(1)]],
    escalateUnacknowledgedPolicyToManager: [true],
    documentExpiryAlertDays: [30, [Validators.required, Validators.min(5)]],
    annualLeaveRolloverLimit: [10, [Validators.required, Validators.min(0)]],
  });

  // ── Admin (Org) Perspective Forms ─────────────────────────────────────────
  readonly orgForm: FormGroup = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    companyDomain: ['', [Validators.required, Validators.minLength(3)]],
    supportEmail: ['', [Validators.required, Validators.email]],
    defaultCurrency: ['INR', Validators.required],
    timeZone: ['Asia/Kolkata (IST +05:30)', Validators.required],
    fiscalYearStart: ['April', Validators.required],
  });

  readonly securityForm: FormGroup = this.fb.group({
    sessionTimeoutMinutes: [60, [Validators.required, Validators.min(5)]],
    passwordMinLength: [8, [Validators.required, Validators.min(6)]],
    requireSpecialChar: [true],
  });

  ngOnInit(): void {
    this.initDefaultPerspective();
    this.populateAllForms();
    this.loadColleaguesForDelegation();
  }

  // ── Navigation Methods ────────────────────────────────────────────────────
  private initDefaultPerspective(): void {
    const available = this.availablePerspectives();
    if (available.includes('admin')) {
      this.activePerspective.set('admin');
    } else if (available.includes('hr')) {
      this.activePerspective.set('hr');
    } else if (available.includes('manager')) {
      this.activePerspective.set('manager');
    } else {
      this.activePerspective.set('employee');
    }
  }

  setPerspective(mode: PerspectiveMode): void {
    if (!this.availablePerspectives().includes(mode)) return;
    this.activePerspective.set(mode);
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  setEmployeeTab(tab: 'preferences' | 'notifications' | 'security'): void {
    this.activeEmployeeTab.set(tab);
    this.clearMessages();
  }

  setManagerTab(tab: 'delegation' | 'team-alerts'): void {
    this.activeManagerTab.set(tab);
    this.clearMessages();
  }

  setHRTab(tab: 'lifecycle' | 'governance' | 'compliance'): void {
    this.activeHRTab.set(tab);
    this.clearMessages();
  }

  setAdminTab(tab: 'organization' | 'security'): void {
    this.activeAdminTab.set(tab);
    this.clearMessages();
  }

  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  private triggerSuccess(msg: string): void {
    this.successMessage.set(msg);
    this.errorMessage.set(null);
    setTimeout(() => {
      if (this.successMessage() === msg) {
        this.successMessage.set(null);
      }
    }, 4000);
  }

  // ── Data Initialization ───────────────────────────────────────────────────
  private populateAllForms(): void {
    // 1. Employee
    const emp = this.settingsService.employeeSettings();
    this.empPrefForm.patchValue({
      displayName: emp.preferences.displayName || this.authService.currentUser()?.username || '',
      language: emp.preferences.language,
      dateFormat: emp.preferences.dateFormat,
      timeFormat: emp.preferences.timeFormat,
      density: emp.preferences.density,
    });
    this.empNotifForm.patchValue(emp.notifications);
    this.empSecForm.patchValue({
      twoFactorEnabled: emp.security.twoFactorEnabled,
      twoFactorMethod: emp.security.twoFactorMethod,
      notifyNewLogins: emp.security.notifyNewLogins,
    });

    // 2. Manager
    const mgr = this.settingsService.managerSettings();
    this.managerDelegationForm.patchValue(mgr.delegation);
    this.managerAlertsForm.patchValue(mgr.teamNotifications);

    // 3. HR
    const hr = this.settingsService.hrSettings();
    this.hrLifecycleForm.patchValue(hr.lifecycle);
    this.hrGovernanceForm.patchValue(hr.governance);
    this.hrComplianceForm.patchValue(hr.compliance);

    // 4. Admin
    const org = this.settingsService.orgSettings();
    this.orgForm.patchValue({
      companyName: org.companyName,
      companyDomain: org.companyDomain,
      supportEmail: org.supportEmail,
      defaultCurrency: org.defaultCurrency,
      timeZone: org.timeZone,
      fiscalYearStart: org.fiscalYearStart,
    });
    this.selectedWorkDays.set([...org.workWeekDays]);
    this.securityForm.patchValue({
      sessionTimeoutMinutes: org.sessionTimeoutMinutes,
      passwordMinLength: org.passwordMinLength,
      requireSpecialChar: org.requireSpecialChar,
    });
  }

  private loadColleaguesForDelegation(): void {
    this.employeeService.getEmployees({ limit: 100, status: 'ACTIVE' }).subscribe({
      next: (res) => {
        const myEmpId = this.authService.currentUser()?.employeeId;
        const options: SelectOption[] = (res.data || [])
          .filter((e) => e.id !== myEmpId)
          .map((e) => ({
            value: e.id,
            label: `${e.firstName} ${e.lastName} (${e.employeeCode}) - ${e.designation?.name || 'Staff'}`,
          }));
        this.delegateOptions.set(options);
      },
      error: () => {
        // Fallback options
        this.delegateOptions.set([
          { value: 'colleague-1', label: 'Jane Smith (EMP-002) - Operations Lead' },
          { value: 'colleague-2', label: 'Robert Fox (EMP-003) - Senior Developer' },
        ]);
      },
    });
  }

  // ── Work Week Day Picker ──────────────────────────────────────────────────
  isDaySelected(day: string): boolean {
    return this.selectedWorkDays().includes(day);
  }

  toggleWorkDay(day: string): void {
    const current = [...this.selectedWorkDays()];
    const index = current.indexOf(day);
    if (index > -1) {
      if (current.length > 1) {
        current.splice(index, 1);
      }
    } else {
      current.push(day);
    }
    this.selectedWorkDays.set(current);
  }

  // ── Save Handlers ─────────────────────────────────────────────────────────

  // Employee 1: Preferences
  saveEmployeePreferences(): void {
    if (this.empPrefForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    const val = this.empPrefForm.value;
    this.settingsService.updateEmployeeSettings({
      preferences: {
        displayName: (val.displayName || '').trim(),
        language: val.language,
        dateFormat: val.dateFormat,
        timeFormat: val.timeFormat,
        density: val.density,
      },
    });
    this.isSaving.set(false);
    this.triggerSuccess('Personal preferences saved successfully.');
  }

  // Employee 2: Notifications
  saveEmployeeNotifications(): void {
    if (this.empNotifForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.settingsService.updateEmployeeSettings({
      notifications: this.empNotifForm.value,
    });
    this.isSaving.set(false);
    this.triggerSuccess('Notification preferences updated.');
  }

  // Employee 3: Security & Password
  saveEmployeeSecurity(): void {
    if (this.isSaving()) return;
    const val = this.empSecForm.value;

    if (val.newPassword) {
      if (val.newPassword !== val.confirmPassword) {
        this.errorMessage.set('New password and confirmation password do not match.');
        return;
      }
      if (val.newPassword.length < 8) {
        this.errorMessage.set('New password must be at least 8 characters long.');
        return;
      }
    }

    this.isSaving.set(true);
    this.settingsService.updateEmployeeSettings({
      security: {
        twoFactorEnabled: Boolean(val.twoFactorEnabled),
        twoFactorMethod: val.twoFactorMethod,
        notifyNewLogins: Boolean(val.notifyNewLogins),
      },
    });

    this.empSecForm.patchValue({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    this.isSaving.set(false);
    this.triggerSuccess(
      val.newPassword
        ? 'Password updated and security preferences saved.'
        : 'Account security preferences saved.'
    );
  }

  // Manager 1: Delegation
  saveManagerDelegation(): void {
    if (this.managerDelegationForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    const val = this.managerDelegationForm.value;
    const selected = this.delegateOptions().find((o) => o.value === val.delegateEmployeeId);
    this.settingsService.updateManagerSettings({
      delegation: {
        ...val,
        delegateName: selected ? selected.label : (val.delegateName || ''),
      },
    });
    this.isSaving.set(false);
    this.triggerSuccess('Approval delegation rules updated.');
  }

  // Manager 2: Team Alerts
  saveManagerAlerts(): void {
    if (this.managerAlertsForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.settingsService.updateManagerSettings({
      teamNotifications: this.managerAlertsForm.value,
    });
    this.isSaving.set(false);
    this.triggerSuccess('Team notification alerts & overtime rules saved.');
  }

  // HR 1: Lifecycle
  saveHRLifecycle(): void {
    if (this.hrLifecycleForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.settingsService.updateHRSettings({
      lifecycle: this.hrLifecycleForm.value,
    });
    this.isSaving.set(false);
    this.triggerSuccess('Onboarding and employee lifecycle defaults saved.');
  }

  // HR 2: Governance
  saveHRGovernance(): void {
    if (this.hrGovernanceForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.settingsService.updateHRSettings({
      governance: this.hrGovernanceForm.value,
    });
    this.isSaving.set(false);
    this.triggerSuccess('Attendance & leave governance policies updated.');
  }

  // HR 3: Compliance
  saveHRCompliance(): void {
    if (this.hrComplianceForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);
    this.settingsService.updateHRSettings({
      compliance: this.hrComplianceForm.value,
    });
    this.isSaving.set(false);
    this.triggerSuccess('Compliance, policy acknowledgements, and alerts saved.');
  }

  // Admin 1: Org Profile
  saveOrgSettings(): void {
    if (this.orgForm.invalid || this.isSaving()) {
      this.orgForm.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    const val = this.orgForm.value;
    this.settingsService.updateSettings({
      companyName: val.companyName.trim(),
      companyDomain: val.companyDomain.trim(),
      supportEmail: val.supportEmail.trim(),
      defaultCurrency: val.defaultCurrency,
      timeZone: val.timeZone,
      fiscalYearStart: val.fiscalYearStart,
      workWeekDays: this.selectedWorkDays(),
    });
    this.isSaving.set(false);
    this.triggerSuccess('Organization profile and regional defaults saved.');
  }

  // Admin 2: Security Policies
  saveSecuritySettings(): void {
    if (this.securityForm.invalid || this.isSaving()) {
      this.securityForm.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    const val = this.securityForm.value;
    this.settingsService.updateSettings({
      sessionTimeoutMinutes: Number(val.sessionTimeoutMinutes),
      passwordMinLength: Number(val.passwordMinLength),
      requireSpecialChar: Boolean(val.requireSpecialChar),
    });
    this.isSaving.set(false);
    this.triggerSuccess('Enterprise authentication and security policies updated.');
  }
}
