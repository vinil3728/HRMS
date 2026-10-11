export enum LoanStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISBURSED = 'DISBURSED',
  REPAYMENT_INITIATED = 'REPAYMENT_INITIATED',
  ACTIVE = 'ACTIVE',
  FULLY_REPAID = 'FULLY_REPAID',
  CANCELLED = 'CANCELLED',
}

export enum LoanType {
  PERSONAL = 'PERSONAL',
  EMERGENCY = 'EMERGENCY',
  EDUCATION = 'EDUCATION',
  MEDICAL = 'MEDICAL',
  HOME_ADVANCE = 'HOME_ADVANCE',
  OTHER = 'OTHER',
}

export enum RepaymentMode {
  SALARY_DEDUCTION = 'SALARY_DEDUCTION',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  SPLIT = 'SPLIT',
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  paymentMode: RepaymentMode;
  status: InstallmentStatus;
  paidAt?: string | null;
  receiptUrl?: string | null;
  payrollRunId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyLoanEmployee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  department?: { id: string; name: string } | null;
  designation?: { id: string; title: string } | null;
}

export interface CompanyLoan {
  id: string;
  employeeId: string;
  employee?: CompanyLoanEmployee;
  loanType: LoanType;
  amount: number;
  approvedAmount: number | null;
  tenureMonths: number;
  purpose: string;
  status: LoanStatus;
  approvedById?: string | null;
  approvedBy?: CompanyLoanEmployee | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  disbursedById?: string | null;
  disbursedBy?: CompanyLoanEmployee | null;
  disbursedAt?: string | null;
  disbursementReceiptUrl?: string | null;
  disbursementReference?: string | null;
  repaymentMode?: RepaymentMode | null;
  cashAmount: number;
  salaryDeductionAmount: number;
  monthlyInstallment: number;
  totalRepaid: number;
  remainingBalance: number;
  repaymentStartDate?: string | null;
  notes?: string | null;
  repayments?: LoanRepayment[];
  createdAt: string;
  updatedAt: string;
}

export interface LoanMetrics {
  totalDisbursed: number;
  totalRepaid: number;
  outstandingBalance: number;
  activeLoansCount: number;
  pendingCount: number;
}

export interface CreateLoanPayload {
  loanType: LoanType;
  amount: number;
  tenureMonths: number;
  purpose: string;
  notes?: string;
}

export interface ApproveLoanPayload {
  approvedAmount?: number;
  tenureMonths?: number;
  notes?: string;
}

export interface RejectLoanPayload {
  rejectionReason: string;
}

export interface DisburseLoanPayload {
  disbursedAt: string;
  disbursementReference: string;
  disbursementReceiptUrl?: string;
  notes?: string;
}

export interface ConfigureRepaymentPayload {
  repaymentMode: RepaymentMode;
  cashAmount?: number;
  salaryDeductionAmount?: number;
  repaymentStartDate: string;
  tenureMonths?: number;
  notes?: string;
}

export interface RecordPaymentPayload {
  amountPaid: number;
  paymentMode: RepaymentMode;
  paidAt: string;
  receiptUrl?: string;
  notes?: string;
}

export interface LoanQueryParams {
  status?: LoanStatus;
  employeeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}
