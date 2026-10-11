import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { rbacGuard } from './core/guards/rbac.guard';
import { Permission } from './core/models/permission.model';

export const appRoutes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent
      ),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login/login.component').then(
            (m) => m.LoginComponent
          ),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'my-profile',
        data: {
          title: 'My Profile & Documents',
        },
        loadComponent: () =>
          import(
            './features/employees/pages/my-profile-page/my-profile-page.component'
          ).then((m) => m.MyProfilePageComponent),
      },
      {
        path: 'services',
        data: {
          title: 'All Services',
        },
        loadComponent: () =>
          import(
            './features/services/pages/services-page/services-page.component'
          ).then((m) => m.ServicesPageComponent),
      },
      {
        path: 'directory',
        canActivate: [rbacGuard],
        data: {
          title: 'Employee Directory',
          permission: Permission.EMPLOYEE_DIRECTORY_VIEW,
        },
        loadComponent: () =>
          import(
            './features/employees/pages/employee-directory/employee-directory.component'
          ).then((m) => m.EmployeeDirectoryComponent),
      },
      {
        path: 'employees',
        canActivate: [rbacGuard],
        data: {
          title: 'Employees Management',
          permission: Permission.EMPLOYEE_VIEWS,
        },
        loadComponent: () =>
          import(
            './features/employees/pages/employee-list/employee-list.component'
          ).then((m) => m.EmployeeListComponent),
      },
      {
        path: 'branches',
        canActivate: [rbacGuard],
        data: {
          title: 'Branch Offices & Locations',
          permission: Permission.BRANCH_VIEW,
        },
        loadComponent: () =>
          import(
            './features/branches/pages/branch-list/branch-list.component'
          ).then((m) => m.BranchListComponent),
      },
      {
        path: 'departments',
        canActivate: [rbacGuard],
        data: {
          title: 'Department Management',
          permission: Permission.DEPARTMENT_VIEW,
        },
        loadComponent: () =>
          import(
            './features/departments/pages/department-list/department-list.component'
          ).then((m) => m.DepartmentListComponent),
      },
      {
        path: 'designations',
        canActivate: [rbacGuard],
        data: {
          title: 'Designation Management',
          permission: Permission.DESIGNATION_VIEW,
        },
        loadComponent: () =>
          import(
            './features/designations/pages/designation-list/designation-list.component'
          ).then((m) => m.DesignationListComponent),
      },
      {
        path: 'attendance',
        canActivate: [rbacGuard],
        data: {
          title: 'Attendance Management',
          permission: Permission.ATTENDANCE_VIEW,
        },
        loadComponent: () =>
          import(
            './features/attendance/pages/attendance-list/attendance-list.component'
          ).then((m) => m.AttendanceListComponent),
      },
      {
        path: 'timesheets',
        canActivate: [rbacGuard],
        data: {
          title: 'Timesheet Management',
          permission: Permission.TIMESHEET_VIEW,
        },
        loadComponent: () =>
          import(
            './features/timesheets/pages/timesheet-page/timesheet-page.component'
          ).then((m) => m.TimesheetPageComponent),
      },
      {
        path: 'leaves',
        canActivate: [rbacGuard],
        data: {
          title: 'Leave & Time-off Management',
          permission: Permission.LEAVE_VIEW,
        },
        loadComponent: () =>
          import(
            './features/leaves/pages/leave-list/leave-list.component'
          ).then((m) => m.LeaveListComponent),
      },
      {
        path: 'holidays',
        canActivate: [rbacGuard],
        data: {
          title: 'Holiday Calendar',
          permission: Permission.HOLIDAY_VIEW,
        },
        loadComponent: () =>
          import(
            './features/holiday-calendar/holiday-calendar.component'
          ).then((m) => m.HolidayCalendarComponent),
      },
      {
        path: 'payroll',
        canActivate: [rbacGuard],
        data: {
          title: 'Payroll Management',
          permission: Permission.PAYROLL_VIEW,
        },
        loadComponent: () =>
          import(
            './features/payroll/pages/payroll-page/payroll-page.component'
          ).then((m) => m.PayrollPageComponent),
      },
      {
        path: 'reimbursements',
        canActivate: [rbacGuard],
        data: {
          title: 'Reimbursement Management',
          permission: Permission.REIMBURSEMENT_VIEW,
        },
        loadComponent: () =>
          import(
            './features/reimbursements/pages/reimbursement-list/reimbursement-list.component'
          ).then((m) => m.ReimbursementListComponent),
      },
      {
        path: 'loans',
        canActivate: [rbacGuard],
        data: {
          title: 'Company Loans & Advances',
          permission: Permission.LOAN_VIEW_OWN,
        },
        loadComponent: () =>
          import('./features/loans/pages/loan-list/loan-list.component').then(
            (m) => m.LoanListComponent
          ),
      },
      {
        path: 'performance',
        canActivate: [rbacGuard],
        data: {
          title: 'Performance Management',
          permission: Permission.PERFORMANCE_SUMMARY_VIEW,
        },
        loadComponent: () =>
          import(
            './features/performance/pages/performance-dashboard/performance-dashboard.component'
          ).then((m) => m.PerformanceDashboardComponent),
      },
      {
        path: 'policies',
        canActivate: [rbacGuard],
        data: {
          title: 'Policy Management',
          permission: Permission.POLICY_VIEW,
        },
        loadComponent: () =>
          import(
            './features/policies/pages/policy-list/policy-list.component'
          ).then((m) => m.PolicyListComponent),
      },
      {
        path: 'reports',
        canActivate: [rbacGuard],
        data: {
          title: 'Reports & Analytics',
          permission: Permission.EMPLOYEE_VIEWS,
        },
        loadComponent: () =>
          import('./features/placeholder/placeholder.component').then(
            (m) => m.PlaceholderComponent
          ),
      },
      {
        path: 'roles',
        canActivate: [rbacGuard],
        data: {
          title: 'Roles & Access Control',
          permission: Permission.ROLE_VIEW,
        },
        loadComponent: () =>
          import(
            './features/settings/pages/roles-page/roles-page.component'
          ).then((m) => m.RolesPageComponent),
      },
      {
        path: 'permissions',
        canActivate: [rbacGuard],
        data: {
          title: 'Permissions Catalog',
          permission: Permission.ROLE_VIEW,
        },
        loadComponent: () =>
          import(
            './features/settings/pages/permissions-page/permissions-page.component'
          ).then((m) => m.PermissionsPageComponent),
      },
      {
        path: 'users',
        canActivate: [rbacGuard],
        data: {
          title: 'User Accounts',
          permission: Permission.ROLE_VIEW,
        },
        loadComponent: () =>
          import(
            './features/settings/pages/users-page/users-page.component'
          ).then((m) => m.UsersPageComponent),
      },
      {
        path: 'settings',
        data: {
          title: 'Settings & Preferences',
        },
        loadComponent: () =>
          import(
            './features/settings/pages/settings-page/settings-page.component'
          ).then((m) => m.SettingsPageComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
