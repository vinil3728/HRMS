import { Injectable, inject, signal } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  Attendance,
  AttendanceQueryParams,
  AttendanceRegularization,
  AttendanceResponse,
  AttendanceSummary,
  CreateAttendanceDto,
  CreateRegularizationDto,
  RegularizationQueryParams,
  UpdateAttendanceDto,
} from '../models/attendance.model';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private readonly api = inject(ApiService);
  private readonly endpoints = API_CONFIG.endpoints.attendance;

  readonly todayRecord = signal<Attendance | null>(null);
  readonly isCheckingInOut = signal<boolean>(false);

  loadTodayAttendance(employeeId: string): void {
    if (!employeeId) return;
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.getAttendance(employeeId, { page: 1, limit: 5 })
      .pipe(catchError(() => of({ data: [] as Attendance[], total: 0, page: 1, limit: 5, totalPages: 0 })))
      .subscribe((res) => {
        const match = (res.data || []).find((a) => String(a.attendanceDate).startsWith(todayIso)) || null;
        this.todayRecord.set(match);
      });
  }

  getAttendance(
    employeeId: string,
    params?: AttendanceQueryParams
  ): Observable<AttendanceResponse> {
    let httpParams = new HttpParams();
    if (params?.fromDate) {
      httpParams = httpParams.set('fromDate', params.fromDate);
    }
    if (params?.toDate) {
      httpParams = httpParams.set('toDate', params.toDate);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.api.get<AttendanceResponse>(this.endpoints.base(employeeId), {
      params: httpParams,
    });
  }

  getMonthlySummary(
    employeeId: string,
    month: string
  ): Observable<AttendanceSummary> {
    const params = new HttpParams().set('month', month);
    return this.api.get<AttendanceSummary>(this.endpoints.summary(employeeId), {
      params,
    });
  }

  checkIn(employeeId: string): Observable<Attendance> {
    this.isCheckingInOut.set(true);
    return this.api.post<Attendance>(this.endpoints.checkIn(employeeId), {}).pipe(
      tap({
        next: (res) => {
          this.todayRecord.set(res);
          this.isCheckingInOut.set(false);
        },
        error: () => {
          this.isCheckingInOut.set(false);
        },
      })
    );
  }

  checkOut(employeeId: string): Observable<Attendance> {
    this.isCheckingInOut.set(true);
    return this.api.post<Attendance>(this.endpoints.checkOut(employeeId), {}).pipe(
      tap({
        next: (res) => {
          this.todayRecord.set(res);
          this.isCheckingInOut.set(false);
        },
        error: () => {
          this.isCheckingInOut.set(false);
        },
      })
    );
  }

  createAttendance(
    employeeId: string,
    dto: CreateAttendanceDto
  ): Observable<Attendance> {
    return this.api.post<Attendance>(this.endpoints.base(employeeId), dto);
  }

  updateAttendance(
    employeeId: string,
    attendanceId: string,
    dto: UpdateAttendanceDto
  ): Observable<Attendance> {
    return this.api.patch<Attendance>(
      this.endpoints.detail(employeeId, attendanceId),
      dto
    );
  }

  deleteAttendance(
    employeeId: string,
    attendanceId: string
  ): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      this.endpoints.detail(employeeId, attendanceId)
    );
  }

  // ── Attendance Regularization ─────────────────────────────────────────────
  getRegularizations(
    employeeId: string,
    params?: RegularizationQueryParams
  ): Observable<{
    data: AttendanceRegularization[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let httpParams = new HttpParams();
    if (params?.status && params.status !== 'ALL') {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.fromDate) {
      httpParams = httpParams.set('fromDate', params.fromDate);
    }
    if (params?.toDate) {
      httpParams = httpParams.set('toDate', params.toDate);
    }
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.api.get<{
      data: AttendanceRegularization[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`employees/${employeeId}/attendance-regularizations`, {
      params: httpParams,
    });
  }

  createRegularization(
    employeeId: string,
    dto: CreateRegularizationDto
  ): Observable<AttendanceRegularization> {
    return this.api.post<AttendanceRegularization>(
      `employees/${employeeId}/attendance-regularizations`,
      dto
    );
  }

  cancelRegularization(
    employeeId: string,
    id: string
  ): Observable<AttendanceRegularization> {
    return this.api.post<AttendanceRegularization>(
      `employees/${employeeId}/attendance-regularizations/${id}/cancel`,
      {}
    );
  }

  approveRegularization(
    employeeId: string,
    id: string,
    decisionNotes?: string
  ): Observable<AttendanceRegularization> {
    return this.api.post<AttendanceRegularization>(
      `employees/${employeeId}/attendance-regularizations/${id}/approve`,
      { decisionNotes }
    );
  }

  rejectRegularization(
    employeeId: string,
    id: string,
    rejectionReason: string
  ): Observable<AttendanceRegularization> {
    return this.api.post<AttendanceRegularization>(
      `employees/${employeeId}/attendance-regularizations/${id}/reject`,
      { rejectionReason }
    );
  }
}
