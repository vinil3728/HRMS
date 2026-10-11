export enum PayrollRunStatus {
  DRAFT = 'DRAFT',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

export enum PayslipStatus {
  DRAFT = 'DRAFT',
  PROCESSED = 'PROCESSED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  REJECTED = 'REJECTED',
}

export enum PaymentMode {
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  CHEQUE = 'CHEQUE',
  CASH = 'CASH',
}

export interface SalaryStructure {
  id: string;
  employeeId?: string;
  ctc: number;
  basicSalary: number;
  hra: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  providentFund: number;
  professionalTax: number;
  tds: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  effectiveFrom: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: { id: string; name: string };
    designation?: { id: string; name: string };
    bankDetails?: {
      accountHolderName: string;
      accountNumber: string;
      bankName: string;
      ifscCode: string;
      branchName?: string;
    };
  };
}

export interface CreateSalaryStructureDto {
  employeeId: string;
  ctc: number;
  basicSalary: number;
  hra: number;
  conveyanceAllowance?: number;
  medicalAllowance?: number;
  specialAllowance?: number;
  providentFund?: number;
  professionalTax?: number;
  tds?: number;
  effectiveFrom?: string;
  isActive?: boolean;
}

export interface UpdateSalaryStructureDto {
  ctc?: number;
  basicSalary?: number;
  hra?: number;
  conveyanceAllowance?: number;
  medicalAllowance?: number;
  specialAllowance?: number;
  providentFund?: number;
  professionalTax?: number;
  tds?: number;
  effectiveFrom?: string;
  isActive?: boolean;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  runDate: string;
  status: PayrollRunStatus;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  processedBy: string;
  approvedBy?: string | null;
  paidAt?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
  payslips?: Payslip[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayrollRunDto {
  month: number;
  year: number;
  notes?: string;
}

export interface Payslip {
  id: string;
  month: number;
  year: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  workingDays: number;
  paidDays: number;
  lossOfPayDays: number;
  basicSalary: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  bonus: number;
  overtimePay: number;
  reimbursements: number;
  grossEarnings: number;
  providentFund: number;
  professionalTax: number;
  tds: number;
  lossOfPayDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: PayslipStatus;
  paymentMode: PaymentMode;
  paymentReference?: string | null;
  paidAt?: string | null;
  rejectionReason?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  payrollRun?: {
    id: string;
    month: number;
    year: number;
    status: PayrollRunStatus;
  };
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    dateOfJoining?: string;
    department?: { id: string; name: string };
    designation?: { id: string; name: string };
    bankDetails?: {
      accountHolderName: string;
      accountNumber: string;
      bankName: string;
      ifscCode: string;
      branchName?: string;
    };
  };
}

export interface CreatePayslipDto {
  employeeId: string;
  payrollRunId?: string;
  month: number;
  year: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  workingDays?: number;
  paidDays?: number;
  lossOfPayDays?: number;
  basicSalary: number;
  hra: number;
  conveyance?: number;
  medicalAllowance?: number;
  specialAllowance?: number;
  bonus?: number;
  overtimePay?: number;
  reimbursements?: number;
  providentFund?: number;
  professionalTax?: number;
  tds?: number;
  lossOfPayDeduction?: number;
  otherDeductions?: number;
  status?: PayslipStatus;
  paymentMode?: PaymentMode;
  remarks?: string;
}

export interface UpdatePayslipDto {
  workingDays?: number;
  paidDays?: number;
  lossOfPayDays?: number;
  basicSalary?: number;
  hra?: number;
  conveyance?: number;
  medicalAllowance?: number;
  specialAllowance?: number;
  bonus?: number;
  overtimePay?: number;
  reimbursements?: number;
  providentFund?: number;
  professionalTax?: number;
  tds?: number;
  lossOfPayDeduction?: number;
  otherDeductions?: number;
  status?: PayslipStatus;
  paymentMode?: PaymentMode;
  paymentReference?: string;
  remarks?: string;
}

export interface MarkPaidDto {
  paymentMode?: PaymentMode;
  paymentReference?: string;
  paidAt?: string;
}

export interface PayrollSummary {
  totalPayslips: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  statusCounts: {
    DRAFT: number;
    PROCESSED: number;
    APPROVED: number;
    PAID: number;
    REJECTED: number;
  };
  month: number | null;
  year: number | null;
}

export interface PayrollQueryParams {
  month?: number;
  year?: number;
  status?: PayslipStatus;
  employeeId?: string;
  departmentId?: string;
  payrollRunId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PayslipListResponse {
  items: Payslip[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
