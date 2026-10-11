export enum ReimbursementStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export const REIMBURSEMENT_CATEGORIES = [
  'Travel & Fuel',
  'Meals & Food',
  'Accommodation',
  'Office Supplies',
  'Internet & Phone',
  'Training & Certifications',
  'Client Entertainment',
  'Medical & Health',
  'Miscellaneous',
] as const;

export type ReimbursementCategory = (typeof REIMBURSEMENT_CATEGORIES)[number];

export interface Reimbursement {
  id: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  status: ReimbursementStatus;
  rejectionReason: string | null;
  paidAt: string | null;
  receiptFileName: string | null;
  receiptFilePath: string | null;
  receiptMimeType: string | null;
  receiptFileSize: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReimbursementResponse {
  data: Reimbursement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReimbursementQueryParams {
  status?: ReimbursementStatus;
  category?: string;
  page?: number;
  limit?: number;
}

export interface CreateReimbursementDto {
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  currency?: string;
}

export interface UpdateReimbursementDto {
  expenseDate?: string;
  category?: string;
  description?: string;
  amount?: number;
  currency?: string;
}
