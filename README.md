# TreasureX HRMS (Human Resource Management System)

A modern, enterprise-grade Human Resource Management System built on an **Nx Monorepo** architecture powered by **NestJS** on the backend and **Angular 19+** on the frontend with PostgreSQL and TypeORM.

---

## 📑 Table of Contents
- [1. Overview & Architecture](#1-overview--architecture)
- [2. Tech Stack](#2-tech-stack)
- [3. Getting Started](#3-getting-started)
- [4. Default System Accounts](#4-default-system-accounts)
- [5. Role-Based Access Control (RBAC)](#5-role-based-access-control-rbac)
- [6. Role vs. Permissions Matrix](#6-role-vs-permissions-matrix)
  - [6.1 Timesheet Management](#61-timesheet-management)
  - [6.2 Payroll Management](#62-payroll-management)
  - [6.3 Attendance Management](#63-attendance-management)
  - [6.4 Leave & Time-off Management](#64-leave--time-off-management)
  - [6.5 Expense Reimbursements](#65-expense-reimbursements)
  - [6.6 Performance Management (PMS)](#66-performance-management-pms)
  - [6.7 Employees Directory & Lifecycle](#67-employees-directory--lifecycle)
  - [6.8 Employee Documents](#68-employee-documents)
  - [6.9 Organization (Departments & Designations)](#69-organization-departments--designations)
  - [6.10 Company Policies & Compliance](#610-company-policies--compliance)
- [7. Side Menu Navigation Organization](#7-side-menu-navigation-organization)
- [8. Core System Workflows](#8-core-system-workflows)
- [9. Security & Enforcement Architecture](#9-security--enforcement-architecture)

---

## 1. Overview & Architecture

TreasureX HRMS is designed to manage employee lifecycles end-to-end with enterprise-grade security and role-scoped permissions. The project is structured within an Nx Monorepo:

- **`apps/api`**: NestJS backend application with TypeORM, PostgreSQL, JWT Authentication, and fine-grained Permission & Employee Access guards.
- **`apps/web`**: Angular 19+ single-page application using Signals, OnPush change detection, standalone components, strict 3-file pattern (`.ts`, `.html`, `.css`), and an accessible enterprise design system.

---

## 2. Tech Stack

- **Monorepo**: [Nx](https://nx.dev/)
- **Backend**: [NestJS](https://nestjs.com/) (TypeScript, TypeORM, Passport JWT, Class Validator)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Frontend**: [Angular 19](https://angular.dev/) (Standalone Components, Signals, Reactive Forms, Vite)
- **API Documentation**: Swagger UI at `/api/docs`

---

## 3. Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL (v14+) running locally or on server

### Environment Configuration
Ensure `.env` exists in the project root:
```env
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=hrms
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=86400
```

### Running the Services
```bash
# Install dependencies
npm install

# Start the NestJS Backend API (http://localhost:3000/api)
npx nx serve api

# Start the Angular Frontend (http://localhost:4200)
npx nx serve web
```

---

## 4. Default System Accounts

| Role | Username | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `Admin@12345` | Full organization-wide superuser access |
| **HR** | `sneha` | `Admin@12345` | People operations, onboarding, payroll processing |
| **Manager** | `roshan` | `Admin@12345` | Department supervision, approvals & evaluations |
| **Employee** | `rahul` | `Admin@12345` | Self-service timesheets, leaves, and expenses |

---

## 5. Role-Based Access Control (RBAC)

The HRMS platform enforces a 4-tier role hierarchy:

1. **Administrator (81 Permissions)**: Unrestricted operational, administrative, and configuration authority over all data and system entities.
2. **HR (76 Permissions)**: Manages employee lifecycles, salary structures, payroll runs, absence allocations, and organizational compliance policies.
3. **Manager (47 Permissions)**: Reviews and approves daily timesheet logs, leave applications, expense reimbursement claims, and conducts team performance appraisals.
4. **Employee (39 Permissions)**: Self-service capabilities to log work hours, request time-off, claim expense reimbursements, upload identity documents, and track personal OKRs.

---

## 6. Role vs. Permissions Matrix

> **Legend**:
> - `✓` = **Granted** (Active permission)
> - `—` = **Restricted** (No access)

### 6.1 Timesheet Management
| Permission Code | Description | Admin | HR | Manager | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `TIMESHEET_VIEW` | View timesheet records and daily work logs | `✓` | `✓` | `✓` | `✓` |
| `TIMESHEET_CREATE` | Log new daily work hours and project tasks | `✓` | `✓` | `✓` | `✓` |
| `TIMESHEET_UPDATE` | Edit existing draft timesheet entries | `✓` | `✓` | `✓` | `✓` |
| `TIMESHEET_DELETE` | Delete unsubmitted draft timesheets | `✓` | `✓` | `✓` | `✓` |
| `TIMESHEET_SUBMIT` | Submit draft timesheets for managerial review | `✓` | `✓` | `✓` | `✓` |
| `TIMESHEET_SUMMARY_VIEW` | View aggregated hours (Total, Draft, Approved, Rejected) | `✓` | `✓` | `✓` | `✓` |
| `TIMESHEET_APPROVE` | Approve submitted timesheets of team members | `✓` | `✓` | `✓` | `—` |
| `TIMESHEET_REJECT` | Return/reject timesheets with feedback | `✓` | `✓` | `✓` | `—` |

---

### 6.2 Payroll Management
| Permission Code | Description | Admin | HR | Manager | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `PAYROLL_VIEW` | View payslips, pay structures, and payroll run history | `✓` | `✓` | `✓` | `✓` |
| `PAYROLL_CREATE` | Initiate a new monthly payroll run | `✓` | `✓` | `—` | `—` |
| `PAYROLL_UPDATE` | Adjust earnings, deductions, or allowances on draft payslips | `✓` | `✓` | `—` | `—` |
| `PAYROLL_DELETE` | Cancel or delete an open payroll cycle | `✓` | `✓` | `—` | `—` |
| `PAYROLL_PROCESS` | Run gross-to-net tax & allowance calculations | `✓` | `✓` | `—` | `—` |
| `PAYROLL_APPROVE` | Approve and lock finalized payroll batches | `✓` | `✓` | `—` | `—` |
| `PAYROLL_REJECT` | Reject or return an unverified payroll run | `✓` | `✓` | `—` | `—` |
| `PAYROLL_SUMMARY_VIEW` | Access organization-wide financial disbursement metrics | `✓` | `✓` | `—` | `—` |

---

### 6.3 Attendance Management
| Permission Code | Description | Admin | HR | Manager | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `ATTENDANCE_VIEW` | View daily clock-in / clock-out records | `✓` | `✓` | `✓` | `✓` |
| `ATTENDANCE_CHECK_IN` | Record attendance check-in timestamp | `✓` | `✓` | `✓` | `✓` |
| `ATTENDANCE_CHECK_OUT` | Record attendance check-out timestamp | `✓` | `✓` | `✓` | `✓` |
| `ATTENDANCE_CREATE` | Manually log an attendance entry | `✓` | `✓` | `✓` | `✓` |
| `ATTENDANCE_SUMMARY_VIEW` | View attendance summaries, tardiness, and overtime totals | `✓` | `✓` | `✓` | `✓` |
| `ATTENDANCE_UPDATE` | Correct or adjust employee attendance logs | `✓` | `✓` | `—` | `—` |
| `ATTENDANCE_DELETE` | Delete erroneous attendance logs | `✓` | `✓` | `—` | `—` |

---

### 6.4 Leave & Time-off Management
| Permission Code | Description | Admin | HR | Manager | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `LEAVE_VIEW` | View leave requests and status | `✓` | `✓` | `✓` | `✓` |
| `LEAVE_CREATE` | Apply for leaves (Casual, Sick, Paid, etc.) | `✓` | `✓` | `✓` | `✓` |
| `LEAVE_UPDATE` | Modify pending leave requests | `✓` | `✓` | `✓` | `✓` |
| `LEAVE_DELETE` | Cancel / withdraw leave applications | `✓` | `✓` | `✓` | `✓` |
| `LEAVE_SUMMARY_VIEW` | View leave accrual balances and days taken | `✓` | `✓` | `✓` | `✓` |
| `LEAVE_APPROVE` | Approve team member leave requests | `✓` | `✓` | `✓` | `—` |
| `LEAVE_REJECT` | Decline leave requests with reason | `✓` | `✓` | `✓` | `—` |
| `LEAVE_BALANCE_VIEW` | View leave quota balances | `✓` | `✓` | `✓` | `✓` |
| `LEAVE_BALANCE_CREATE` | Credit or allocate annual leave entitlements | `✓` | `✓` | `—` | `—` |

---

### 6.5 Expense Reimbursements
| Permission Code | Description | Admin | HR | Manager | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `REIMBURSEMENT_VIEW` | View reimbursement expense claims | `✓` | `✓` | `✓` | `✓` |
| `REIMBURSEMENT_CREATE` | Draft a new reimbursement expense claim | `✓` | `✓` | `✓` | `✓` |
| `REIMBURSEMENT_UPDATE` | Modify draft reimbursement expense line items | `✓` | `✓` | `✓` | `✓` |
| `REIMBURSEMENT_DELETE` | Delete draft expense claims | `✓` | `✓` | `✓` | `✓` |
| `REIMBURSEMENT_SUBMIT` | Submit claim with receipt proof | `✓` | `✓` | `✓` | `✓` |
| `REIMBURSEMENT_RECEIPT_UPLOAD` | Upload receipts and bills | `✓` | `✓` | `✓` | `✓` |
| `REIMBURSEMENT_APPROVE` | Approve claims within approval threshold | `✓` | `✓` | `✓` | `—` |
| `REIMBURSEMENT_REJECT` | Reject non-compliant reimbursement claims | `✓` | `✓` | `✓` | `—` |
| `REIMBURSEMENT_PAY` | Mark approved claims as settled / paid | `✓` | `✓` | `—` | `—` |

---

### 6.6 Performance Management (PMS)
| Permission Code | Description | Admin | HR | Manager | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `PERFORMANCE_CYCLE_VIEW` | View review cycles | `✓` | `✓` | `✓` | `✓` |
| `PERFORMANCE_CYCLE_CREATE` | Create annual/quarterly review cycles | `✓` | `✓` | `—` | `—` |
| `PERFORMANCE_CYCLE_UPDATE` | Update appraisal cycle deadlines and criteria | `✓` | `✓` | `—` | `—` |
| `PERFORMANCE_CYCLE_DELETE` | Delete appraisal cycles | `✓` | `✓` | `—` | `—` |
| `PERFORMANCE_GOAL_VIEW` | View personal and team OKRs / goals | `✓` | `✓` | `✓` | `✓` |
| `PERFORMANCE_GOAL_CREATE` | Define new goals | `✓` | `✓` | `✓` | `✓` |
| `PERFORMANCE_GOAL_UPDATE` | Update goal milestones and progress | `✓` | `✓` | `✓` | `✓` |
| `PERFORMANCE_GOAL_DELETE` | Remove goals | `✓` | `✓` | `✓` | `—` |
| `PERFORMANCE_EVALUATION_VIEW` | View appraisal ratings and feedback | `✓` | `✓` | `✓` | `✓` |
| `PERFORMANCE_EVALUATION_CREATE` | Create self / manager evaluation form | `✓` | `✓` | `✓` | `✓` |
| `PERFORMANCE_EVALUATION_UPDATE` | Edit evaluation responses | `✓` | `✓` | `✓` | `✓` |
| `PERFORMANCE_EVALUATION_SUBMIT` | Submit final evaluation | `✓` | `✓` | `✓` | `✓` |
| `PERFORMANCE_SUMMARY_VIEW` | View performance summary analytics | `✓` | `✓` | `✓` | `✓` |
| `PERFORMANCE_SUMMARY_FINALIZE` | Finalize cycle ratings and calibration | `✓` | `✓` | `—` | `—` |

---

### 6.7 Employees Directory & Lifecycle
| Permission Code | Description | Admin | HR | Manager | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `EMPLOYEE_VIEW` | Browse employee directory | `✓` | `✓` | `✓` | `✓` |
| `EMPLOYEE_CREATE` | Onboard and register new employee | `✓` | `✓` | `—` | `—` |
| `EMPLOYEE_UPDATE` | Update profile, bank, or tax details | `✓` | `✓` | `—` | `—` |
| `EMPLOYEE_STATUS_UPDATE` | Change status (Active, On-Leave, Terminated) | `✓` | `✓` | `—` | `—` |

---

### 6.8 Employee Documents
| Permission Code | Description | Admin | HR | Manager | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `EMPLOYEE_DOCUMENT_VIEW` | View employee uploaded verification files | `✓` | `✓` | `✓` | `✓` |
| `EMPLOYEE_DOCUMENT_DOWNLOAD` | Download ID cards, certificates | `✓` | `✓` | `✓` | `✓` |
| `EMPLOYEE_DOCUMENT_UPLOAD` | Upload employee documents | `✓` | `✓` | `—` | `✓` |
| `EMPLOYEE_DOCUMENT_CREATE` | Add document categories | `✓` | `✓` | `—` | `—` |
| `EMPLOYEE_DOCUMENT_UPDATE` | Update document metadata | `✓` | `✓` | `—` | `—` |
| `EMPLOYEE_DOCUMENT_DELETE` | Remove employee documents | `✓` | `✓` | `—` | `—` |

---

### 6.9 Organization (Departments & Designations)
| Permission Code | Description | Admin | HR | Manager | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `DEPARTMENT_VIEW` | View company departments | `✓` | `✓` | `✓` | `✓` |
| `DEPARTMENT_CREATE` | Create company department | `✓` | `✓` | `—` | `—` |
| `DEPARTMENT_UPDATE` | Modify department details and head | `✓` | `✓` | `—` | `—` |
| `DESIGNATION_VIEW` | View job designations / roles | `✓` | `✓` | `✓` | `✓` |
| `DESIGNATION_CREATE` | Create new job titles and grade bands | `✓` | `✓` | `—` | `—` |
| `DESIGNATION_UPDATE` | Modify job title designations | `✓` | `✓` | `—` | `—` |

---

### 6.10 Company Policies & Compliance
| Permission Code | Description | Admin | HR | Manager | Employee |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `POLICY_VIEW` | Read published company handbook & policies | `✓` | `✓` | `✓` | `✓` |
| `POLICY_CREATE` | Draft a new company compliance policy | `✓` | `✓` | `—` | `—` |
| `POLICY_UPDATE` | Edit existing policy draft | `✓` | `✓` | `—` | `—` |
| `POLICY_PUBLISH` | Formally publish policy organization-wide | `✓` | `✓` | `—` | `—` |
| `POLICY_ARCHIVE` | Archive outdated policy documents | `✓` | `✓` | `—` | `—` |
| `POLICY_DELETE` | Permanently delete policy drafts | `✓` | `✓` | `—` | `—` |
| `POLICY_ACKNOWLEDGEMENT_VIEW` | View policy sign-off status | `✓` | `✓` | `✓` | `✓` |
| `POLICY_ACKNOWLEDGEMENT_CREATE` | Sign and acknowledge policy | `✓` | `✓` | `✓` | `✓` |
| `POLICY_ACKNOWLEDGEMENT_STATUS_VIEW`| Check individual policy compliance status | `✓` | `✓` | `✓` | `✓` |
| `POLICY_ACKNOWLEDGEMENT_POLICY_VIEW`| Audit department compliance rates | `✓` | `✓` | `—` | `—` |

---

## 7. Side Menu Navigation Organization

The application's sidebar navigation is logically categorized into clear domain groupings:

```
OVERVIEW
  └── Dashboard

PEOPLE
  ├── Employees
  ├── Departments
  └── Designations

TIME & ATTENDANCE
  ├── Attendance
  ├── Timesheets
  └── Leave & Time-off

PAY & EXPENSES
  ├── Payroll
  └── Reimbursements

PERFORMANCE
  └── Performance

RESOURCES
  ├── Policies
  └── Reports

SYSTEM
  └── Settings
```

---

## 8. Core System Workflows

### Timesheet Workflow
```
[Employee] Logs Hours (Draft)
    │
    ▼
[Employee] Submits for Approval (Status: SUBMITTED)
    │
    ├─────────► [Manager/HR/Admin] Approves (Status: APPROVED)
    │
    └─────────► [Manager/HR/Admin] Returns with Feedback (Status: REJECTED)
```

### Payroll Processing Cycle
```
[HR/Admin] Creates Payroll Run (Draft Batch)
    │
    ▼
[HR/Admin] Processes Computations (Gross, Taxes, Allowances, Net)
    │
    ▼
[HR/Admin] Reviews & Adjusts Individual Payslips
    │
    ▼
[HR/Admin] Approves Batch (Status: APPROVED) ──► Marks Paid & Disburses
```

---

## 9. Security & Enforcement Architecture

Security is layered throughout both client and server tiers:

1. **Angular Client Guarding**:
   - `authGuard`: Enforces active JWT session.
   - `rbacGuard`: Inspects route configuration against user permissions.
   - Reactive Permission Signals & Directives: Computes granular permissions (`computed(() => rbacService.hasPermission(...))`) and allowed resource scopes (`computed(() => rbacService.hasScope(...))`) powering modern `@if` control flow blocks, alongside `*appHasPermission` directives.
2. **NestJS API Guarding**:
   - `JwtAuthGuard`: Validates Bearer token authenticity and expiry.
   - `PermissionGuard`: Verifies that the authenticated user possesses the specific `Permission` assigned via `@Permissions(...)`.
   - `ScopeAccessGuard`: Validates relationship scoping—Admins and HR have org-wide access, Managers can review their direct reports, and Employees are restricted to their own resource records based on dynamic database scopes.