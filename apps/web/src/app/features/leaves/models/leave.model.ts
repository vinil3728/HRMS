export enum LeaveType {
  CASUAL = 'CASUAL',
  SICK = 'SICK',
  EARNED = 'EARNED',
  UNPAID = 'UNPAID',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  OTHER = 'OTHER',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface Leave {
  id: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  isHalfDay?: boolean;
  halfDaySession?: string | null;
  status: LeaveStatus;
  reason: string | null;
  rejectionReason: string | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  leaveType: LeaveType;
  year: number;
  totalDays: number;
  usedDays: number;
  availableDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveSummary {
  year: number;
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  totalDaysApproved: number;
}

export interface LeaveResponse {
  data: Leave[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeaveQueryParams {
  status?: LeaveStatus;
  leaveType?: LeaveType;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateLeaveDto {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  isHalfDay?: boolean;
  halfDaySession?: string | null;
}

export interface UpdateLeaveDto {
  leaveType?: LeaveType;
  startDate?: string;
  endDate?: string;
  reason?: string;
  isHalfDay?: boolean;
  halfDaySession?: string | null;
}

export interface CreateLeaveBalanceDto {
  leaveType: LeaveType;
  year: number;
  totalDays: number;
}

export interface AdjustLeaveBalanceDto {
  adjustmentDays: number;
  reason: string;
}
