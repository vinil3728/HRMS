export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  HALF_DAY = 'HALF_DAY',
  LEAVE = 'LEAVE',
  HOLIDAY = 'HOLIDAY',
  WEEK_OFF = 'WEEK_OFF',
}

export interface Attendance {
  id: string;
  attendanceDate: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  workingHours: number | null;
  isLate: boolean;
  isEarlyCheckout: boolean;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSummary {
  month: string;
  totalDays: number;
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  holiday: number;
  weekOff: number;
  totalWorkingHours: number;
}

export interface AttendanceResponse {
  data: Attendance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AttendanceQueryParams {
  fromDate?: string;
  toDate?: string;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
}

export interface CreateAttendanceDto {
  attendanceDate: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface UpdateAttendanceDto {
  attendanceDate?: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: AttendanceStatus;
  remarks?: string | null;
}

export enum RegularizationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface AttendanceRegularization {
  id: string;
  attendanceDate: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: RegularizationStatus;
  rejectionReason: string | null;
  decisionNotes: string | null;
  actionedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
  actionedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRegularizationDto {
  attendanceDate: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
}

export interface RegularizationQueryParams {
  status?: RegularizationStatus | 'ALL';
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

