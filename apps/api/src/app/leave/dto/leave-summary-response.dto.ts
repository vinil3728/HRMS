import { LeaveStatus } from '../enums/leave-status.enum';
import { LeaveType } from '../enums/leave-type.enum';

export interface LeaveTypeSummary {
    leaveType: LeaveType;
    allocatedDays: number;
    usedDays: number;
    availableDays: number;
}

export interface LeaveStatusSummary {
    status: LeaveStatus;
    count: number;
}

export class LeaveSummaryResponseDto {
    year!: number;
    totalRequests!: number;
    statusSummary!: LeaveStatusSummary[];
    leaveTypeSummary!: LeaveTypeSummary[];
}