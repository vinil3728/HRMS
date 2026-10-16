export enum TimesheetStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Timesheet {
  id: string;
  workDate: string;
  project: string;
  description: string;
  hours: number;
  status: TimesheetStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  employeeId?: string;
  employee?: {
    id: string;
    employeeCode?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    department?: { id: string; name: string };
    designation?: { id: string; name: string };
  };
  reviewedBy?: {
    id: string;
    employeeCode?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimesheetDto {
  workDate: string;
  project: string;
  description: string;
  hours: number;
}

export interface UpdateTimesheetDto {
  workDate?: string;
  project?: string;
  description?: string;
  hours?: number;
}

export interface RejectTimesheetDto {
  reason: string;
}

export interface TimesheetQueryParams {
  fromDate?: string;
  toDate?: string;
  status?: TimesheetStatus;
  page?: number;
  limit?: number;
}

export interface TimesheetSummary {
  employeeId: string;
  totalEntries: number;
  totalHours: number;
  draftHours: number;
  submittedHours: number;
  approvedHours: number;
  rejectedHours: number;
}

export interface TimesheetListResponse {
  data: Timesheet[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScopedTimesheetQueryParams extends TimesheetQueryParams {
  employeeId?: string;
  scope?: 'SELF' | 'TEAM' | 'ORG';
}

export interface ScopedTimesheetListResponse extends TimesheetListResponse {
  summary?: {
    totalHours: number;
    draftHours: number;
    submittedHours: number;
    approvedHours: number;
    rejectedHours: number;
    totalCount: number;
    pendingCount: number;
  };
}
