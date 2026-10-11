export interface SystemPermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  isActive: boolean;
}

export interface CreatePermissionDto {
  code: string;
  name: string;
  module: string;
  description?: string | null;
}

export interface UpdatePermissionDto {
  name?: string;
  code?: string;
  module?: string;
  description?: string | null;
}

export interface RolePermission {
  id: string;
  permission: SystemPermission;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  rolePermissions?: RolePermission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRoleDto {
  name: string;
  code: string;
  description?: string | null;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  code?: string;
  description?: string | null;
}

export interface SystemUser {
  id: string;
  username: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: { id: string; name: string };
    designation?: { id: string; name: string };
  };
  role?: {
    id: string;
    name: string;
    code: string;
    isSystemRole: boolean;
  };
}

export interface CreateUserDto {
  employeeId: string;
  roleId: string;
  username: string;
  password: string;
}

export interface UpdateUserDto {
  username?: string;
  roleId?: string;
  password?: string;
}

export interface OrganizationSettings {
  companyName: string;
  companyDomain: string;
  supportEmail: string;
  defaultCurrency: string;
  timeZone: string;
  fiscalYearStart: string;
  workWeekDays: string[];
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  requireSpecialChar: boolean;
}

export const DEFAULT_ORG_SETTINGS: OrganizationSettings = {
  companyName: 'TreasureX FinServ Ltd.',
  companyDomain: 'treasurex.com',
  supportEmail: 'hr@treasurex.com',
  defaultCurrency: 'INR',
  timeZone: 'Asia/Kolkata (IST +05:30)',
  fiscalYearStart: 'April',
  workWeekDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  sessionTimeoutMinutes: 60,
  passwordMinLength: 8,
  requireSpecialChar: true,
};

// ── Employee Perspective Models ─────────────────────────────────────────
export interface EmployeePreferences {
  displayName: string;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  density: 'comfortable' | 'compact';
  theme: 'system' | 'light';
}

export interface EmployeeNotificationPreferences {
  emailLeaveUpdates: boolean;
  emailPayrollPublished: boolean;
  emailReimbursementStatus: boolean;
  emailPolicyAnnouncements: boolean;
  inAppAttendanceReminders: boolean;
  inAppCelebrations: boolean;
  emailDigestFrequency: 'realtime' | 'daily' | 'weekly';
}

export interface EmployeeSecurityPreferences {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'email_otp' | 'authenticator_app';
  notifyNewLogins: boolean;
}

export interface EmployeeSettings {
  preferences: EmployeePreferences;
  notifications: EmployeeNotificationPreferences;
  security: EmployeeSecurityPreferences;
}

export const DEFAULT_EMPLOYEE_SETTINGS: EmployeeSettings = {
  preferences: {
    displayName: '',
    language: 'en-IN',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    density: 'comfortable',
    theme: 'light',
  },
  notifications: {
    emailLeaveUpdates: true,
    emailPayrollPublished: true,
    emailReimbursementStatus: true,
    emailPolicyAnnouncements: true,
    inAppAttendanceReminders: true,
    inAppCelebrations: true,
    emailDigestFrequency: 'realtime',
  },
  security: {
    twoFactorEnabled: false,
    twoFactorMethod: 'email_otp',
    notifyNewLogins: true,
  },
};

// ── Manager Perspective Models ──────────────────────────────────────────
export interface ManagerDelegationSettings {
  isDelegationActive: boolean;
  delegateEmployeeId: string;
  delegateName: string;
  startDate: string;
  endDate: string;
  delegateLeaves: boolean;
  delegateTimesheets: boolean;
  delegateReimbursements: boolean;
  delegateAttendanceRegularizations: boolean;
  notifyDelegateOnAssignment: boolean;
}

export interface ManagerTeamNotificationRules {
  notifyLateCheckIn: boolean;
  lateThresholdMinutes: number;
  notifyUnplannedAbsence: boolean;
  notifyOvertimeHours: boolean;
  weeklyOvertimeThresholdHours: number;
  dailyPendingApprovalReminder: boolean;
  reminderTime: string;
}

export interface ManagerSettings {
  delegation: ManagerDelegationSettings;
  teamNotifications: ManagerTeamNotificationRules;
}

export const DEFAULT_MANAGER_SETTINGS: ManagerSettings = {
  delegation: {
    isDelegationActive: false,
    delegateEmployeeId: '',
    delegateName: '',
    startDate: '',
    endDate: '',
    delegateLeaves: true,
    delegateTimesheets: true,
    delegateReimbursements: true,
    delegateAttendanceRegularizations: true,
    notifyDelegateOnAssignment: true,
  },
  teamNotifications: {
    notifyLateCheckIn: true,
    lateThresholdMinutes: 15,
    notifyUnplannedAbsence: true,
    notifyOvertimeHours: false,
    weeklyOvertimeThresholdHours: 45,
    dailyPendingApprovalReminder: true,
    reminderTime: '09:00 AM',
  },
};

// ── HR Perspective Models ───────────────────────────────────────────────
export interface HRLifecycleSettings {
  defaultProbationDays: number;
  defaultNoticePeriodDays: number;
  onboardingDocDeadlineDays: number;
  sendWelcomeEmailOnCreation: boolean;
  requireIdentityVerification: boolean;
  requireBankDetailsOnJoin: boolean;
}

export interface HRAttendanceLeaveGovernance {
  lateCheckInGraceMinutes: number;
  maxRegularizationsPerMonth: number;
  halfDayMinHours: number;
  fullDayMinHours: number;
  enforceSandwichLeaveRule: boolean;
  allowNegativeLeaveBalance: boolean;
}

export interface HRComplianceSettings {
  policyAckGraceDays: number;
  escalateUnacknowledgedPolicyToManager: boolean;
  documentExpiryAlertDays: number;
  annualLeaveRolloverLimit: number;
}

export interface HRSettings {
  lifecycle: HRLifecycleSettings;
  governance: HRAttendanceLeaveGovernance;
  compliance: HRComplianceSettings;
}

export const DEFAULT_HR_SETTINGS: HRSettings = {
  lifecycle: {
    defaultProbationDays: 90,
    defaultNoticePeriodDays: 60,
    onboardingDocDeadlineDays: 7,
    sendWelcomeEmailOnCreation: true,
    requireIdentityVerification: true,
    requireBankDetailsOnJoin: true,
  },
  governance: {
    lateCheckInGraceMinutes: 15,
    maxRegularizationsPerMonth: 3,
    halfDayMinHours: 4.5,
    fullDayMinHours: 8.0,
    enforceSandwichLeaveRule: false,
    allowNegativeLeaveBalance: false,
  },
  compliance: {
    policyAckGraceDays: 14,
    escalateUnacknowledgedPolicyToManager: true,
    documentExpiryAlertDays: 30,
    annualLeaveRolloverLimit: 10,
  },
};
