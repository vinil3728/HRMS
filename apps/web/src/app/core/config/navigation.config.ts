import { Permission } from '../models/permission.model';
import { IconName } from '../../shared/ui/icon/icon.component';

export interface NavItem {
  label: string;
  route: string;
  icon: IconName;
  permission?: Permission;
  badge?: string | number;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface ServiceItem {
  label: string;
  description: string;
  route: string;
  icon: IconName;
  color: string;
  permission?: Permission;
}

export const ALL_SERVICES: ServiceItem[] = [
  { label: 'Dashboard',              description: 'Overview & analytics',             route: '/dashboard',      icon: 'home',        color: '#6366f1' },
  { label: 'My Profile',             description: 'Personal profile, KYC & documents', route: '/my-profile',     icon: 'id-card',     color: '#3b82f6' },
  { label: 'Directory',              description: 'Coworker lookup & team directory',  route: '/directory',      icon: 'users',       color: '#0284c7', permission: Permission.EMPLOYEE_DIRECTORY_VIEW },
  { label: 'Employees',              description: 'Manage people & profiles',         route: '/employees',      icon: 'users',       color: '#0ea5e9', permission: Permission.EMPLOYEE_VIEWS },
  { label: 'Branches',               description: 'Branch offices & locations',        route: '/branches',       icon: 'map-pin',     color: '#0284c7', permission: Permission.BRANCH_VIEW },
  { label: 'Departments',            description: 'Org structure & departments',      route: '/departments',    icon: 'building',    color: '#f59e0b', permission: Permission.DEPARTMENT_VIEW },
  { label: 'Designations',           description: 'Job titles & designations',        route: '/designations',   icon: 'id-card',     color: '#8b5cf6', permission: Permission.DESIGNATION_VIEW },
  { label: 'Attendance',             description: 'Track attendance records',         route: '/attendance',     icon: 'calendar',    color: '#10b981', permission: Permission.ATTENDANCE_VIEW },
  { label: 'Timesheets',             description: 'Log & approve work hours',         route: '/timesheets',     icon: 'clock',       color: '#06b6d4', permission: Permission.TIMESHEET_VIEW },
  { label: 'Leave & Time-off',       description: 'Leave requests & approvals',       route: '/leaves',         icon: 'archive',     color: '#f97316', permission: Permission.LEAVE_VIEW },
  { label: 'Holiday Calendar',       description: 'Company annual holidays & observances', route: '/holidays', icon: 'calendar',    color: '#f59e0b', permission: Permission.HOLIDAY_VIEW },
  { label: 'Payroll',                description: 'Salary & payroll processing',      route: '/payroll',        icon: 'dollar',      color: '#22c55e', permission: Permission.PAYROLL_VIEW },
  { label: 'Reimbursements',         description: 'Expense reimbursements',           route: '/reimbursements', icon: 'receipt',     color: '#ec4899', permission: Permission.REIMBURSEMENT_VIEW },
  { label: 'Loans',          description: 'Employee loans, split repayment & advances', route: '/loans', icon: 'dollar', color: '#10b981', permission: Permission.LOAN_VIEW_OWN || Permission.LOAN_VIEW_ALL },
  { label: 'Performance',            description: 'Goals, reviews & appraisals',      route: '/performance',    icon: 'trending-up', color: '#a855f7', permission: Permission.PERFORMANCE_SUMMARY_VIEW },
  { label: 'Policies',               description: 'HR policies & documents',          route: '/policies',       icon: 'file-text',   color: '#14b8a6', permission: Permission.POLICY_VIEW },
  { label: 'Reports',                description: 'HR reports & insights',            route: '/reports',        icon: 'bar-chart',   color: '#f43f5e', permission: Permission.EMPLOYEE_VIEWS },
  { label: 'Roles & Access Control', description: 'Manage roles & permission matrix', route: '/roles',          icon: 'shield',      color: '#3b82f6', permission: Permission.ROLE_VIEW },
  { label: 'Module Management',      description: 'Configure system modules & capabilities', route: '/modules',    icon: 'grid',        color: '#0ea5e9', permission: Permission.MODULE_VIEW },
  { label: 'Permissions Catalog',    description: 'System privilege definitions',     route: '/permissions',    icon: 'target',      color: '#eab308', permission: Permission.PERMISSION_VIEW },
  { label: 'User Accounts',          description: 'Provision login credentials',      route: '/users',          icon: 'users',       color: '#8b5cf6', permission: Permission.USER_ACCOUNT_VIEW },
  { label: 'Settings',               description: 'Org profile & security policies',  route: '/settings',       icon: 'settings',    color: '#64748b', permission: Permission.SETTINGS_VIEW },
];

export const NAVIGATION_CONFIG: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      {
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'home',
      },
      {
        label: 'My Profile',
        route: '/my-profile',
        icon: 'id-card',
      },
    ],
  },
  {
    title: 'PEOPLE & ORG',
    items: [
      {
        label: 'Directory',
        route: '/directory',
        icon: 'users',
        permission: Permission.EMPLOYEE_DIRECTORY_VIEW,
      },
      {
        label: 'Employees',
        route: '/employees',
        icon: 'users',
        permission: Permission.EMPLOYEE_VIEWS,
      },
      {
        label: 'Branches',
        route: '/branches',
        icon: 'map-pin',
        permission: Permission.BRANCH_VIEW,
      },
      {
        label: 'Departments',
        route: '/departments',
        icon: 'building',
        permission: Permission.DEPARTMENT_VIEW,
      },
      {
        label: 'Designations',
        route: '/designations',
        icon: 'id-card',
        permission: Permission.DESIGNATION_VIEW,
      },
    ],
  },
  {
    title: 'TIME & ATTENDANCE',
    items: [
      {
        label: 'Attendance',
        route: '/attendance',
        icon: 'calendar',
        permission: Permission.ATTENDANCE_VIEW,
      },
      {
        label: 'Timesheets',
        route: '/timesheets',
        icon: 'clock',
        permission: Permission.TIMESHEET_VIEW,
      },
      {
        label: 'Leave & Time-off',
        route: '/leaves',
        icon: 'archive',
        permission: Permission.LEAVE_VIEW,
      },
      {
        label: 'Holiday Calendar',
        route: '/holidays',
        icon: 'calendar',
        permission: Permission.HOLIDAY_VIEW,
      },
    ],
  },
  {
    title: 'PAYROLL & EXPENSES',
    items: [
      {
        label: 'Payroll',
        route: '/payroll',
        icon: 'dollar',
        permission: Permission.PAYROLL_VIEW,
      },
      {
        label: 'Reimbursements',
        route: '/reimbursements',
        icon: 'receipt',
        permission: Permission.REIMBURSEMENT_VIEW,
      },
      {
        label: 'Loans',
        route: '/loans',
        icon: 'dollar',
        permission: Permission.LOAN_VIEW_OWN || Permission.LOAN_VIEW_ALL,
      },
    ],
  },
  {
    title: 'TALENT & COMPLIANCE',
    items: [
      {
        label: 'Performance',
        route: '/performance',
        icon: 'trending-up',
        permission: Permission.PERFORMANCE_SUMMARY_VIEW,
      },
      {
        label: 'Policies',
        route: '/policies',
        icon: 'file-text',
        permission: Permission.POLICY_VIEW,
      },
      {
        label: 'Reports',
        route: '/reports',
        icon: 'bar-chart',
        permission: Permission.EMPLOYEE_VIEWS,
      },
    ],
  },
  {
    title: 'ADMIN & ACCESS',
    items: [
      {
        label: 'User Accounts',
        route: '/users',
        icon: 'users',
        permission: Permission.USER_ACCOUNT_VIEW,
      },
      {
        label: 'Roles & Access',
        route: '/roles',
        icon: 'shield',
        permission: Permission.ROLE_VIEW,
      },
      {
        label: 'Module Management',
        route: '/modules',
        icon: 'grid',
        permission: Permission.MODULE_VIEW,
      },
      {
        label: 'Permissions Catalog',
        route: '/permissions',
        icon: 'target',
        permission: Permission.PERMISSION_VIEW,
      },
    ],
  },
];

