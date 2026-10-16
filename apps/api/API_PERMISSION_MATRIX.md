
# HRMS API Permission Matrix

## Base URL

```text
http://localhost:3000/api
```

## Roles

| Role     | Description                           |
| -------- | ------------------------------------- |
| ADMIN    | Full system administration            |
| HR       | HR operations and employee management |
| MANAGER  | Manager/direct-report operations      |
| EMPLOYEE | Employee self-service                 |

## Permission Legend

| Symbol | Meaning                                       |
| ------ | --------------------------------------------- |
| 🌐     | Public / no authentication                    |
| ✅     | Allowed                                       |
| ❌     | Not allowed                                   |
| ⚠️   | Conditional / additional business rules apply |

> **Important:** This matrix represents the **current implementation in the API code**. It should be treated as the source of truth for Swagger/Postman authorization until the authorization model is intentionally changed.

---

# 1. Authentication APIs

| Method | Endpoint                  | Description                      | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                                    |
| ------ | ------------------------- | -------------------------------- | :---: | :-: | :-----: | :------: | -------------------------------------------------------------- |
| POST   | `/auth/bootstrap-admin` | Create initial admin account     |  🌐  | 🌐 |   🌐   |    🌐    | Public, but only works when no users exist and employee exists |
| POST   | `/auth/login`           | Login and receive JWT            |  🌐  | 🌐 |   🌐   |    🌐    | Public                                                         |
| POST   | `/auth/users`           | Create user account for employee |  ✅  | ❌ |   ❌   |    ❌    | ADMIN only                                                     |

---

# 2. Employee APIs

| Method | Endpoint                  | Description            | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                        |
| ------ | ------------------------- | ---------------------- | :---: | :-: | :-----: | :------: | -------------------------------------------------- |
| POST   | `/employees`            | Create employee        |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN                                         |
| GET    | `/employees`            | List employees         |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN                                         |
| GET    | `/employees/:id`        | Get employee details   |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports only |
| PATCH  | `/employees/:id`        | Update employee        |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports only |
| PATCH  | `/employees/:id/status` | Change employee status |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN                                         |

### Manager restriction

For `GET/PATCH /employees/:id`:

* MANAGER can access only employees whose `manager.id` equals the logged-in manager's employee ID.
* EMPLOYEE is currently rejected by `ScopeAccessGuard`.

---

# 3. Department APIs

| Method | Endpoint             | Description       | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule            |
| ------ | -------------------- | ----------------- | :---: | :-: | :-----: | :------: | ---------------------- |
| POST   | `/departments`     | Create department |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |
| GET    | `/departments`     | List departments  |  ✅  | ✅ |   ✅   |    ✅    | Any authenticated user |
| GET    | `/departments/:id` | Get department    |  ✅  | ✅ |   ✅   |    ✅    | Any authenticated user |
| PATCH  | `/departments/:id` | Update department |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |

---

# 4. Designation APIs

| Method | Endpoint              | Description        | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule            |
| ------ | --------------------- | ------------------ | :---: | :-: | :-----: | :------: | ---------------------- |
| POST   | `/designations`     | Create designation |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |
| GET    | `/designations`     | List designations  |  ✅  | ✅ |   ✅   |    ✅    | Any authenticated user |
| GET    | `/designations/:id` | Get designation    |  ✅  | ✅ |   ✅   |    ✅    | Any authenticated user |
| PATCH  | `/designations/:id` | Update designation |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |

---

# 5. Attendance APIs

| Method | Endpoint                                            | Description                | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                   |
| ------ | --------------------------------------------------- | -------------------------- | :---: | :-: | :-----: | :------: | --------------------------------------------- |
| POST   | `/employees/:employeeId/attendance`               | Create attendance          |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| GET    | `/employees/:employeeId/attendance`               | List attendance            |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| GET    | `/employees/:employeeId/attendance/summary`       | Monthly attendance summary |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| POST   | `/employees/:employeeId/attendance/check-in`      | Check in                   |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| POST   | `/employees/:employeeId/attendance/check-out`     | Check out                  |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| GET    | `/employees/:employeeId/attendance/:attendanceId` | Get attendance record      |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| PATCH  | `/employees/:employeeId/attendance/:attendanceId` | Update attendance          |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| DELETE | `/employees/:employeeId/attendance/:attendanceId` | Delete attendance          |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |

### Additional business rules

Attendance service additionally validates:

* Duplicate attendance for same employee/date
* Check-out must be after check-in
* Check-in cannot be repeated
* Check-out requires a check-in
* Check-out cannot be repeated
* Late check-in is calculated against `09:30`
* Early checkout is calculated against `18:30`

---

# 6. Employee Document APIs

| Method | Endpoint                                                  | Description            | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                   |
| ------ | --------------------------------------------------------- | ---------------------- | :---: | :-: | :-----: | :------: | --------------------------------------------- |
| POST   | `/employees/:employeeId/documents`                      | Create document record |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| POST   | `/employees/:employeeId/documents/upload`               | Upload document        |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| GET    | `/employees/:employeeId/documents`                      | List documents         |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| GET    | `/employees/:employeeId/documents/:documentId/download` | Download document      |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| GET    | `/employees/:employeeId/documents/:documentId`          | Get document           |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| DELETE | `/employees/:employeeId/documents/:documentId`          | Delete document        |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |

### Upload restrictions

* PDF, JPG and PNG only
* Maximum file size: 5 MB

---

# 7. Leave Balance APIs

| Method | Endpoint                                             | Description                 | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                       |
| ------ | ---------------------------------------------------- | --------------------------- | :---: | :-: | :-----: | :------: | ------------------------------------------------- |
| POST   | `/employees/:employeeId/leave-balances`            | Create leave balance        |  🌐  | 🌐 |   🌐   |    🌐    | ⚠️ No controller authentication guard currently |
| GET    | `/employees/:employeeId/leave-balances`            | Get employee leave balances |  🌐  | 🌐 |   🌐   |    🌐    | ⚠️ No controller authentication guard currently |
| GET    | `/employees/:employeeId/leave-balances/:balanceId` | Get leave balance           |  🌐  | 🌐 |   🌐   |    🌐    | ⚠️ No controller authentication guard currently |

### Security gap

`LeaveBalanceController` currently has **no `JwtAuthGuard` or `RolesGuard`**.

Therefore, based on the supplied code, these endpoints are currently accessible without a JWT.

This should be corrected before production.

---

# 8. Leave APIs

| Method | Endpoint                                           | Description          | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                                                      |
| ------ | -------------------------------------------------- | -------------------- | :---: | :-: | :-----: | :------: | -------------------------------------------------------------------------------- |
| POST   | `/employees/:employeeId/leaves`                  | Create leave request |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports; EMPLOYEE blocked by current guard |
| GET    | `/employees/:employeeId/leaves`                  | List leave requests  |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports                                    |
| GET    | `/employees/:employeeId/leaves/summary`          | Leave summary        |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports                                    |
| GET    | `/employees/:employeeId/leaves/:leaveId`         | Get leave request    |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports                                    |
| PATCH  | `/employees/:employeeId/leaves/:leaveId`         | Update leave request |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports                                    |
| DELETE | `/employees/:employeeId/leaves/:leaveId`         | Cancel leave request |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports                                    |
| POST   | `/employees/:employeeId/leaves/:leaveId/approve` | Approve leave        |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports                                    |
| POST   | `/employees/:employeeId/leaves/:leaveId/reject`  | Reject leave         |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports                                    |

### Leave business rules

| Operation             | Additional rule                                    |
| --------------------- | -------------------------------------------------- |
| Create                | Leave dates cannot overlap                         |
| Create                | Sufficient leave balance required except UNPAID    |
| Update                | Only PENDING requests can be updated               |
| Cancel                | Only PENDING or APPROVED requests can be cancelled |
| Approve               | Only PENDING requests can be approved              |
| Reject                | Only PENDING requests can be rejected              |
| Approve               | Leave balance is consumed                          |
| Cancel approved leave | Used leave balance is restored                     |

---

# 9. Performance Cycle APIs

| Method | Endpoint                         | Description              | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule            |
| ------ | -------------------------------- | ------------------------ | :---: | :-: | :-----: | :------: | ---------------------- |
| POST   | `/performance-cycles`          | Create performance cycle |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |
| GET    | `/performance-cycles`          | List cycles              |  ✅  | ✅ |   ✅   |    ✅    | Any authenticated user |
| GET    | `/performance-cycles/:cycleId` | Get cycle                |  ✅  | ✅ |   ✅   |    ✅    | Any authenticated user |
| PATCH  | `/performance-cycles/:cycleId` | Update cycle             |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |
| DELETE | `/performance-cycles/:cycleId` | Delete cycle             |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |

### Performance cycle business rules

* Closed cycles cannot be updated.
* Only DRAFT cycles can be deleted.
* Start date cannot be after end date.

---

# 10. Performance Goal APIs

| Method | Endpoint                                                             | Description | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                   |
| ------ | -------------------------------------------------------------------- | ----------- | :---: | :-: | :-----: | :------: | --------------------------------------------- |
| POST   | `/employees/:employeeId/performance-cycles/:cycleId/goals`         | Create goal |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| GET    | `/employees/:employeeId/performance-cycles/:cycleId/goals`         | List goals  |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| GET    | `/employees/:employeeId/performance-cycles/:cycleId/goals/:goalId` | Get goal    |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| PATCH  | `/employees/:employeeId/performance-cycles/:cycleId/goals/:goalId` | Update goal |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| DELETE | `/employees/:employeeId/performance-cycles/:cycleId/goals/:goalId` | Delete goal |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |

### Goal business rules

* Closed performance cycles cannot be modified.
* Goal dates must be within the cycle dates.
* Total goal weight cannot exceed 100%.
* Progress can automatically change status to COMPLETED at 100%.

---

# 11. Performance Evaluation APIs

| Method | Endpoint                                                                                              | Description       | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                                         |
| ------ | ----------------------------------------------------------------------------------------------------- | ----------------- | :---: | :-: | :-----: | :------: | ------------------------------------------------------------------- |
| POST   | `/employees/:employeeId/performance-cycles/:cycleId/goals/:goalId/evaluations`                      | Create evaluation |  ✅  | ✅ |  ⚠️  |   ⚠️   | Service validates evaluation type and employee/manager relationship |
| GET    | `/employees/:employeeId/performance-cycles/:cycleId/goals/:goalId/evaluations`                      | List evaluations  |  ✅  | ✅ |  ⚠️  |    ❌    | ScopeAccessGuard currently blocks EMPLOYEE                       |
| GET    | `/employees/:employeeId/performance-cycles/:cycleId/goals/:goalId/evaluations/:evaluationId`        | Get evaluation    |  ✅  | ✅ |  ⚠️  |    ❌    | ScopeAccessGuard currently blocks EMPLOYEE                       |
| PATCH  | `/employees/:employeeId/performance-cycles/:cycleId/goals/:goalId/evaluations/:evaluationId`        | Update evaluation |  ✅  | ✅ |  ⚠️  |   ⚠️   | Service validates SELF/MANAGER access                               |
| POST   | `/employees/:employeeId/performance-cycles/:cycleId/goals/:goalId/evaluations/:evaluationId/submit` | Submit evaluation |  ✅  | ✅ |  ⚠️  |    ❌    | ScopeAccessGuard currently blocks EMPLOYEE                       |

### Evaluation creation rules

#### ADMIN / HR

Can create evaluations for any employee.

#### EMPLOYEE

Can create only:

```text
evaluationType = SELF
```

and only for their own employee ID.

#### MANAGER

Can create only:

```text
evaluationType = MANAGER
```

and only for direct reports.

### Evaluation update rules

#### ADMIN / HR

Can update any evaluation.

#### EMPLOYEE

Can update only their own:

```text
SELF
```

evaluation.

#### MANAGER

Can update only:

```text
MANAGER
```

evaluations belonging to direct reports.

### Important authorization inconsistency

The service supports EMPLOYEE SELF-evaluation creation/update, but the following endpoints use `ScopeAccessGuard`:

```text
GET evaluations
GET evaluation
POST submit
```

Since the current `ScopeAccessGuard` rejects EMPLOYEE, those operations are currently unavailable to normal employees.

---

# 12. Performance Summary APIs

| Method | Endpoint                                                       | Description                  | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                   |
| ------ | -------------------------------------------------------------- | ---------------------------- | :---: | :-: | :-----: | :------: | --------------------------------------------- |
| POST   | `/employees/:employeeId/performance-cycles/:cycleId/summary` | Finalize performance summary |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN                                    |
| GET    | `/employees/:employeeId/performance-cycles/:cycleId/summary` | Get performance summary      |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |

### Finalization rules

A performance summary can only be finalized when:

* Performance cycle is `CLOSED`
* At least one goal exists
* Goal weights total 100%
* Every goal has a MANAGER evaluation
* Manager evaluations are `SUBMITTED`
* Manager ratings exist

---

# 13. Policy APIs

| Method | Endpoint                        | Description    | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule            |
| ------ | ------------------------------- | -------------- | :---: | :-: | :-----: | :------: | ---------------------- |
| POST   | `/policies`                   | Create policy  |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |
| GET    | `/policies`                   | List policies  |  ✅  | ✅ |   ✅   |    ✅    | Any authenticated user |
| GET    | `/policies/:policyId`         | Get policy     |  ✅  | ✅ |   ✅   |    ✅    | Any authenticated user |
| PATCH  | `/policies/:policyId`         | Update policy  |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |
| DELETE | `/policies/:policyId`         | Delete policy  |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |
| POST   | `/policies/:policyId/publish` | Publish policy |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |
| POST   | `/policies/:policyId/archive` | Archive policy |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN             |

### Policy business rules

* Only DRAFT policies can be updated.
* Only DRAFT policies can be deleted.
* Only DRAFT policies can be published.
* Policy content is required before publishing.
* Only PUBLISHED policies can be archived.

---

# 14. Policy Acknowledgement APIs

| Method | Endpoint                                                                     | Description                         | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                                  |
| ------ | ---------------------------------------------------------------------------- | ----------------------------------- | :---: | :-: | :-----: | :------: | ------------------------------------------------------------ |
| POST   | `/policy-acknowledgements/employees/:employeeId/policies/:policyId`        | Acknowledge policy                  |  ✅  | ✅ |  ⚠️  |   ⚠️   | HR/ADMIN any employee; MANAGER/EMPLOYEE own employee ID only |
| GET    | `/policy-acknowledgements/employees/:employeeId`                           | Get employee acknowledgements       |  ✅  | ✅ |  ⚠️  |   ⚠️   | HR/ADMIN any employee; others own employee ID only           |
| GET    | `/policy-acknowledgements/policies/:policyId`                              | Get all acknowledgements for policy |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN only                                              |
| GET    | `/policy-acknowledgements/employees/:employeeId/policies/:policyId/status` | Get acknowledgement status          |  ✅  | ✅ |  ⚠️  |   ⚠️   | HR/ADMIN any employee; others own employee ID only           |

### Acknowledgement business rules

* Policy must be `PUBLISHED`.
* An employee cannot acknowledge the same policy twice.

---

# 15. Reimbursement APIs

| Method | Endpoint                                                           | Description                | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                   |
| ------ | ------------------------------------------------------------------ | -------------------------- | :---: | :-: | :-----: | :------: | --------------------------------------------- |
| POST   | `/employees/:employeeId/reimbursements`                          | Create reimbursement       |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| GET    | `/employees/:employeeId/reimbursements`                          | List reimbursements        |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| GET    | `/employees/:employeeId/reimbursements/:reimbursementId`         | Get reimbursement          |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| PATCH  | `/employees/:employeeId/reimbursements/:reimbursementId`         | Update reimbursement       |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| DELETE | `/employees/:employeeId/reimbursements/:reimbursementId`         | Delete reimbursement       |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| POST   | `/employees/:employeeId/reimbursements/:reimbursementId/submit`  | Submit reimbursement       |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| POST   | `/employees/:employeeId/reimbursements/:reimbursementId/receipt` | Upload receipt             |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| POST   | `/employees/:employeeId/reimbursements/:reimbursementId/approve` | Approve reimbursement      |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| POST   | `/employees/:employeeId/reimbursements/:reimbursementId/reject`  | Reject reimbursement       |  ✅  | ✅ |  ⚠️  |    ❌    | ADMIN/HR any employee; MANAGER direct reports |
| POST   | `/employees/:employeeId/reimbursements/:reimbursementId/pay`     | Mark reimbursement as paid |  ✅  | ✅ |   ❌   |    ❌    | HR / ADMIN                                    |

### Reimbursement business rules

| Operation      | Required status |
| -------------- | --------------- |
| Update         | DRAFT           |
| Delete         | DRAFT           |
| Upload receipt | DRAFT           |
| Submit         | DRAFT           |
| Approve        | SUBMITTED       |
| Reject         | SUBMITTED       |
| Mark as paid   | APPROVED        |

### Receipt restrictions

* PDF, JPG and PNG
* Maximum 5 MB

---

# 16. Timesheet APIs

| Method | Endpoint                                                | Description             | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule                                                                                                 |
| ------ | ------------------------------------------------------- | ----------------------- | :---: | :-: | :-----: | :------: | ----------------------------------------------------------------------------------------------------------- |
| POST   | `/employees/:employeeId/timesheets`                     | Create timesheet entry  |  ✅  | ✅ |   ⚠️   |    ⚠️    | `ScopeAccessGuard` (`['SELF', 'TEAM', 'ORG']`); requires `TIMESHEET_CREATE`                                |
| GET    | `/employees/:employeeId/timesheets`                     | List timesheets         |  ✅  | ✅ |   ⚠️   |    ⚠️    | `ScopeAccessGuard` (`['SELF', 'TEAM', 'ORG']`); requires `TIMESHEET_VIEW`                                  |
| GET    | `/employees/:employeeId/timesheets/summary`             | Get timesheet summary   |  ✅  | ✅ |   ⚠️   |    ⚠️    | `ScopeAccessGuard` (`['SELF', 'TEAM', 'ORG']`); requires `TIMESHEET_SUMMARY_VIEW`                          |
| GET    | `/employees/:employeeId/timesheets/:timesheetId`        | Get timesheet entry     |  ✅  | ✅ |   ⚠️   |    ⚠️    | `ScopeAccessGuard` (`['SELF', 'TEAM', 'ORG']`); requires `TIMESHEET_VIEW`                                  |
| PATCH  | `/employees/:employeeId/timesheets/:timesheetId`        | Update timesheet entry  |  ✅  | ✅ |   ⚠️   |    ⚠️    | `ScopeAccessGuard` (`['SELF', 'TEAM', 'ORG']`); requires `TIMESHEET_UPDATE`; status must be DRAFT or REJECTED |
| DELETE | `/employees/:employeeId/timesheets/:timesheetId`        | Delete timesheet entry  |  ✅  | ✅ |   ⚠️   |    ⚠️    | `ScopeAccessGuard` (`['SELF', 'TEAM', 'ORG']`); requires `TIMESHEET_DELETE`; status must be DRAFT          |
| POST   | `/employees/:employeeId/timesheets/:timesheetId/submit` | Submit timesheet        |  ✅  | ✅ |   ⚠️   |    ⚠️    | `ScopeAccessGuard` (`['SELF', 'TEAM', 'ORG']`); requires `TIMESHEET_SUBMIT`; status must be DRAFT or REJECTED |
| POST   | `/employees/:employeeId/timesheets/:timesheetId/approve`| Approve timesheet entry |  ✅  | ✅ |   ⚠️   |    ❌    | `ScopeAccessGuard` (`['TEAM', 'ORG']`); requires `TIMESHEET_APPROVE`; reviewer cannot approve own timesheet |
| POST   | `/employees/:employeeId/timesheets/:timesheetId/reject` | Reject timesheet entry  |  ✅  | ✅ |   ⚠️   |    ❌    | `ScopeAccessGuard` (`['TEAM', 'ORG']`); requires `TIMESHEET_REJECT`; reviewer cannot reject own timesheet  |

### Timesheet business rules

| Operation | Required status | Scope & Additional Constraints |
| --------- | --------------- | ------------------------------ |
| Create    | -               | Scope check on `:employeeId`; duplicate workDate prohibited |
| Update    | DRAFT, REJECTED | Scope check on `:employeeId`; hours must be > 0 and <= 24 |
| Delete    | DRAFT           | Scope check on `:employeeId` |
| Submit    | DRAFT, REJECTED | Scope check on `:employeeId` |
| Approve   | SUBMITTED       | TEAM/ORG scope; reviewer employeeId cannot equal target employeeId |
| Reject    | SUBMITTED       | TEAM/ORG scope; reviewer employeeId cannot equal target employeeId; rejectionReason required |

---

# 17. Application / Health Endpoint

| Method | Endpoint | Description              | ADMIN | HR | MANAGER | EMPLOYEE | Access Rule |
| ------ | -------- | ------------------------ | :---: | :-: | :-----: | :------: | ----------- |
| GET    | `/`    | API health/root response |  🌐  | 🌐 |   🌐   |    🌐    | Public      |

Response:

```json
{
  "message": "Hello API"
}
```

---

# 18. Authorization Summary

## ADMIN

| Capability                | Access           |
| ------------------------- | ---------------- |
| User management           | Full             |
| Employee management       | Full             |
| Department management     | Full             |
| Designation management    | Full             |
| Attendance                | Any employee     |
| Documents                 | Any employee     |
| Leave                     | Any employee     |
| Leave balance             | Currently public |
| Timesheets                | Any employee (approval restricted from self-review) |
| Performance cycles        | Full             |
| Performance goals         | Any employee     |
| Performance evaluations   | Any employee     |
| Performance summaries     | Any employee     |
| Policies                  | Full             |
| Policy acknowledgements   | Any employee     |
| Reimbursements            | Any employee     |
| Payment of reimbursements | Full             |

---

## HR

| Capability                | Access           |
| ------------------------- | ---------------- |
| User management           | ❌               |
| Employee management       | Full             |
| Department management     | Full             |
| Designation management    | Full             |
| Attendance                | Any employee     |
| Documents                 | Any employee     |
| Leave                     | Any employee     |
| Leave balance             | Currently public |
| Timesheets                | Any employee (approval restricted from self-review) |
| Performance cycles        | Full             |
| Performance goals         | Any employee     |
| Performance evaluations   | Any employee     |
| Performance summaries     | Any employee     |
| Policies                  | Full             |
| Policy acknowledgements   | Any employee     |
| Reimbursements            | Any employee     |
| Payment of reimbursements | Full             |

---

## MANAGER

| Capability                       | Access         |
| -------------------------------- | -------------- |
| User management                  | ❌             |
| Employee list                    | ❌             |
| Employee details                 | Direct reports |
| Employee update                  | Direct reports |
| Department/designation read      | ✅             |
| Attendance                       | Direct reports |
| Documents                        | Direct reports |
| Leave                            | Direct reports |
| Leave approval/rejection         | Direct reports |
| Timesheets (log/submit)          | Own records    |
| Timesheets (approval/rejection)  | Direct reports (self-approval prohibited) |
| Performance cycles read          | ✅             |
| Performance goals                | Direct reports |
| Manager evaluations              | Direct reports |
| Performance summaries            | Direct reports |
| Policies read                    | ✅             |
| Policy acknowledgement           | Own account    |
| Policy acknowledgement reports   | ❌             |
| Reimbursements                   | Direct reports |
| Reimbursement approval/rejection | Direct reports |
| Reimbursement payment            | ❌             |

---

## EMPLOYEE

| Capability                 | Current Access                                                      |
| -------------------------- | ------------------------------------------------------------------- |
| Login                      | ✅                                                                  |
| Employee own details       | ❌ ⚠️                                                             |
| Attendance                 | ❌ ⚠️                                                             |
| Documents                  | ❌ ⚠️                                                             |
| Leave                      | ❌ ⚠️                                                             |
| Leave balance              | 🌐 Currently public                                                 |
| Timesheets                 | ✅ Own records (view, create, update, delete, submit, summary)     |
| Timesheet approval/rejection | ❌ Denied (`['TEAM', 'ORG']` required)                            |
| Performance cycles read    | ✅                                                                  |
| Performance goals          | ❌ ⚠️                                                             |
| SELF evaluation creation   | ⚠️ Service allows it, but related endpoint access is inconsistent |
| SELF evaluation update     | ⚠️ Service allows it, but related endpoint access is inconsistent |
| Performance summary        | ❌                                                                  |
| Policies read              | ✅                                                                  |
| Own policy acknowledgement | ✅                                                                  |
| Own acknowledgement status | ✅                                                                  |
| Reimbursements             | ❌ ⚠️                                                             |

---

# 19. Authorization Gaps Found

These should be reviewed before considering the API authorization model complete.

### Gap 1 — Employee self-service is currently blocked

`ScopeAccessGuard` currently behaves as:

```text
ADMIN  → any employee
HR     → any employee
MANAGER → direct reports
EMPLOYEE → denied
```

Therefore employees cannot currently access many endpoints that would normally be expected for self-service.

Affected areas include:

```text
Employee details
Attendance
Documents
Leave
Performance goals
Performance evaluation read/submit
Performance summary
Reimbursements
```

---

### Gap 2 — Leave Balance endpoints are currently public

Current controller has no authentication guard:

```text
POST /employees/:employeeId/leave-balances
GET  /employees/:employeeId/leave-balances
GET  /employees/:employeeId/leave-balances/:balanceId
```

These should be reviewed and protected.

---

### Gap 3 — Performance evaluation authorization is inconsistent

The service explicitly supports:

```text
EMPLOYEE → SELF evaluation
MANAGER  → MANAGER evaluation for direct reports
HR/ADMIN → any evaluation
```

But some controller endpoints use `ScopeAccessGuard`, which currently rejects EMPLOYEE.

The intended authorization model should be decided before final Swagger/Postman documentation.

---

# 20. Authentication Flow

```text
POST /auth/login
        │
        ▼
      JWT
        │
        ▼
Authorization: Bearer <JWT>
        │
        ▼
   JwtAuthGuard
        │
        ▼
    RolesGuard / AccessGuard
        │
        ▼
     Controller
        │
        ▼
      Service
```

---

# 21. JWT Payload

The authenticated request currently contains:

```text
userId
employeeId
role
username
```

The role is used by:

```text
RolesGuard
ScopeAccessGuard (Unified Resource & Scope Guard)
```

---

# 22. Important Distinction

Role permission and business validation are different.

For example:

```text
MANAGER → can approve reimbursement
```

does **not** mean every reimbursement can be approved.

The reimbursement must also be:

```text
SUBMITTED
```

Similarly:

```text
HR → can finalize performance summary
```

does **not** mean every summary can be finalized.

The performance cycle must be:

```text
CLOSED
```

Therefore:

```text
ROLE AUTHORIZATION
        +
BUSINESS RULE VALIDATION
        =
FINAL API ACCESS
```

---

# 23. Total API Inventory

| Module                  |         APIs |
| ----------------------- | -----------: |
| Auth                    |            3 |
| Employees               |            5 |
| Departments             |            4 |
| Designations            |            4 |
| Attendance              |            8 |
| Employee Documents      |            6 |
| Leave Balance           |            3 |
| Leave                   |            8 |
| Timesheets              |            9 |
| Performance Cycles      |            5 |
| Performance Goals       |            5 |
| Performance Evaluations |            5 |
| Performance Summary     |            2 |
| Policies                |            7 |
| Policy Acknowledgements |            4 |
| Reimbursements          |           10 |
| Application/Health      |            1 |
| **Total**         | **84** |

> This matrix contains **84 API endpoints** based on the controllers supplied so far.
