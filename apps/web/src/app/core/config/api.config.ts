export const API_CONFIG = {
  baseUrl: '/api',
  endpoints: {
    auth: {
      login: '/auth/login',
      refresh: '/auth/refresh',
      logout: '/auth/logout',
      changePassword: '/auth/change-password',
      users: '/auth/users',
      userDetail: (id: string) => `/auth/users/${id}`,
      activateUser: (id: string) => `/auth/users/${id}/activate`,
      deactivateUser: (id: string) => `/auth/users/${id}/deactivate`,
      bootstrapAdmin: '/auth/bootstrap-admin',
    },
    employees: {
      base: '/employees',
      me: '/employees/me',
      directory: '/employees/directory',
      detail: (id: string) => `/employees/${id}`,
      status: (id: string) => `/employees/${id}/status`,
      profile: (id: string) => `/employees/${id}/profile`,
      identity: (id: string) => `/employees/${id}/identity`,
      bankDetails: (id: string) => `/employees/${id}/bank-details`,
      documents: (id: string) => `/employees/${id}/documents`,
      uploadDocument: (id: string) => `/employees/${id}/documents/upload`,
      downloadDocument: (employeeId: string, docId: string) =>
        `/employees/${employeeId}/documents/${docId}/download`,
      deleteDocument: (employeeId: string, docId: string) =>
        `/employees/${employeeId}/documents/${docId}`,
    },
    branches: {
      base: '/branches',
      detail: (id: string) => `/branches/${id}`,
      status: (id: string) => `/branches/${id}/status`,
    },
    departments: {
      base: '/departments',
      detail: (id: string) => `/departments/${id}`,
    },
    designations: {
      base: '/designations',
      detail: (id: string) => `/designations/${id}`,
    },
    attendance: {
      base: (employeeId: string) => `/employees/${employeeId}/attendance`,
      summary: (employeeId: string) => `/employees/${employeeId}/attendance/summary`,
      checkIn: (employeeId: string) => `/employees/${employeeId}/attendance/check-in`,
      checkOut: (employeeId: string) => `/employees/${employeeId}/attendance/check-out`,
      detail: (employeeId: string, attendanceId: string) =>
        `/employees/${employeeId}/attendance/${attendanceId}`,
    },
    leaves: {
      base: (employeeId: string) => `/employees/${employeeId}/leaves`,
      summary: (employeeId: string) => `/employees/${employeeId}/leaves/summary`,
      detail: (employeeId: string, leaveId: string) =>
        `/employees/${employeeId}/leaves/${leaveId}`,
      approve: (employeeId: string, leaveId: string) =>
        `/employees/${employeeId}/leaves/${leaveId}/approve`,
      reject: (employeeId: string, leaveId: string) =>
        `/employees/${employeeId}/leaves/${leaveId}/reject`,
      balances: (employeeId: string) => `/employees/${employeeId}/leave-balances`,
    },
    performance: {
      cycles: '/performance-cycles',
      cycleDetail: (id: string) => `/performance-cycles/${id}`,
      goals: (employeeId: string, cycleId: string) =>
        `/employees/${employeeId}/performance-cycles/${cycleId}/goals`,
      goalDetail: (employeeId: string, cycleId: string, goalId: string) =>
        `/employees/${employeeId}/performance-cycles/${cycleId}/goals/${goalId}`,
      evaluations: (employeeId: string, cycleId: string, goalId: string) =>
        `/employees/${employeeId}/performance-cycles/${cycleId}/goals/${goalId}/evaluations`,
      evaluationDetail: (
        employeeId: string,
        cycleId: string,
        goalId: string,
        evaluationId: string
      ) =>
        `/employees/${employeeId}/performance-cycles/${cycleId}/goals/${goalId}/evaluations/${evaluationId}`,
      submitEvaluation: (
        employeeId: string,
        cycleId: string,
        goalId: string,
        evaluationId: string
      ) =>
        `/employees/${employeeId}/performance-cycles/${cycleId}/goals/${goalId}/evaluations/${evaluationId}/submit`,
      summary: (employeeId: string, cycleId: string) =>
        `/employees/${employeeId}/performance-cycles/${cycleId}/summary`,
      finalizeSummary: (employeeId: string, cycleId: string) =>
        `/employees/${employeeId}/performance-cycles/${cycleId}/summary/finalize`,
    },
    policies: {
      base: '/policies',
      detail: (id: string) => `/policies/${id}`,
      publish: (id: string) => `/policies/${id}/publish`,
      archive: (id: string) => `/policies/${id}/archive`,
      acknowledgements: {
        acknowledge: (employeeId: string, policyId: string) =>
          `/policy-acknowledgements/employees/${employeeId}/policies/${policyId}`,
        employee: (employeeId: string) =>
          `/policy-acknowledgements/employees/${employeeId}`,
        policy: (policyId: string) =>
          `/policy-acknowledgements/policies/${policyId}`,
        status: (employeeId: string, policyId: string) =>
          `/policy-acknowledgements/employees/${employeeId}/policies/${policyId}/status`,
      },
    },
    reimbursements: {
      base: (employeeId: string) => `/employees/${employeeId}/reimbursements`,
      detail: (employeeId: string, reimbursementId: string) =>
        `/employees/${employeeId}/reimbursements/${reimbursementId}`,
      submit: (employeeId: string, reimbursementId: string) =>
        `/employees/${employeeId}/reimbursements/${reimbursementId}/submit`,
      receipt: (employeeId: string, reimbursementId: string) =>
        `/employees/${employeeId}/reimbursements/${reimbursementId}/receipt`,
      approve: (employeeId: string, reimbursementId: string) =>
        `/employees/${employeeId}/reimbursements/${reimbursementId}/approve`,
      reject: (employeeId: string, reimbursementId: string) =>
        `/employees/${employeeId}/reimbursements/${reimbursementId}/reject`,
      pay: (employeeId: string, reimbursementId: string) =>
        `/employees/${employeeId}/reimbursements/${reimbursementId}/pay`,
    },
    rbac: {
      permissions: '/permissions',
      permissionDetail: (id: string) => `/permissions/${id}`,
      activatePermission: (id: string) => `/permissions/${id}/activate`,
      deactivatePermission: (id: string) => `/permissions/${id}/deactivate`,
      roles: '/roles',
      roleDetail: (roleId: string) => `/roles/${roleId}`,
      rolePermissions: (roleId: string) => `/roles/${roleId}/permissions`,
      activateRole: (roleId: string) => `/roles/${roleId}/activate`,
      deactivateRole: (roleId: string) => `/roles/${roleId}/deactivate`,
    },
    payroll: {
      summary: '/payroll/summary',
      runs: '/payroll/runs',
      runDetail: (id: string) => `/payroll/runs/${id}`,
      approveRun: (id: string) => `/payroll/runs/${id}/approve`,
      payRun: (id: string) => `/payroll/runs/${id}/pay`,
      payslips: '/payroll/payslips',
      payslipDetail: (id: string) => `/payroll/payslips/${id}`,
      approvePayslip: (id: string) => `/payroll/payslips/${id}/approve`,
      rejectPayslip: (id: string) => `/payroll/payslips/${id}/reject`,
      payPayslip: (id: string) => `/payroll/payslips/${id}/pay`,
      salaryStructures: '/payroll/salary-structures',
      salaryStructureEmployee: (employeeId: string) =>
        `/payroll/salary-structures/employee/${employeeId}`,
    },
    timesheets: {
      base: (employeeId: string) => `/employees/${employeeId}/timesheets`,
      summary: (employeeId: string) => `/employees/${employeeId}/timesheets/summary`,
      detail: (employeeId: string, timesheetId: string) =>
        `/employees/${employeeId}/timesheets/${timesheetId}`,
      submit: (employeeId: string, timesheetId: string) =>
        `/employees/${employeeId}/timesheets/${timesheetId}/submit`,
      approve: (employeeId: string, timesheetId: string) =>
        `/employees/${employeeId}/timesheets/${timesheetId}/approve`,
      reject: (employeeId: string, timesheetId: string) =>
        `/employees/${employeeId}/timesheets/${timesheetId}/reject`,
    },
    loans: {
      base: '/loans',
      apply: '/loans/apply',
      myLoans: '/loans/my-loans',
      metrics: '/loans/metrics',
      detail: (id: string) => `/loans/${id}`,
      approve: (id: string) => `/loans/${id}/approve`,
      reject: (id: string) => `/loans/${id}/reject`,
      disburse: (id: string) => `/loans/${id}/disburse`,
      configureRepayment: (id: string) => `/loans/${id}/configure-repayment`,
      startRepayment: (id: string) => `/loans/${id}/start-repayment`,
      payInstallment: (id: string, installmentId: string) =>
        `/loans/${id}/repayments/${installmentId}/pay`,
      uploadReceipt: '/loans/upload-receipt',
    },
  },
};
