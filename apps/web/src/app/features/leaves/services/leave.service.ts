import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  AdjustLeaveBalanceDto,
  CreateLeaveBalanceDto,
  CreateLeaveDto,
  Leave,
  LeaveBalance,
  LeaveQueryParams,
  LeaveResponse,
  LeaveSummary,
  UpdateLeaveDto,
} from '../models/leave.model';

@Injectable({
  providedIn: 'root',
})
export class LeaveService {
  private readonly api = inject(ApiService);
  private readonly endpoints = API_CONFIG.endpoints.leaves;

  getLeaves(
    employeeId: string,
    params?: LeaveQueryParams
  ): Observable<LeaveResponse> {
    let httpParams = new HttpParams();
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.leaveType) {
      httpParams = httpParams.set('leaveType', params.leaveType);
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

    return this.api.get<LeaveResponse>(this.endpoints.base(employeeId), {
      params: httpParams,
    });
  }

  getLeaveById(employeeId: string, leaveId: string): Observable<Leave> {
    return this.api.get<Leave>(this.endpoints.detail(employeeId, leaveId));
  }

  applyLeave(employeeId: string, dto: CreateLeaveDto): Observable<Leave> {
    return this.api.post<Leave>(this.endpoints.base(employeeId), dto);
  }

  updateLeave(
    employeeId: string,
    leaveId: string,
    dto: UpdateLeaveDto
  ): Observable<Leave> {
    return this.api.patch<Leave>(
      this.endpoints.detail(employeeId, leaveId),
      dto
    );
  }

  cancelLeave(employeeId: string, leaveId: string): Observable<Leave> {
    return this.api.delete<Leave>(this.endpoints.detail(employeeId, leaveId));
  }

  approveLeave(employeeId: string, leaveId: string): Observable<Leave> {
    return this.api.post<Leave>(
      this.endpoints.approve(employeeId, leaveId),
      {}
    );
  }

  rejectLeave(
    employeeId: string,
    leaveId: string,
    rejectionReason: string
  ): Observable<Leave> {
    return this.api.post<Leave>(this.endpoints.reject(employeeId, leaveId), {
      rejectionReason,
    });
  }

  getLeaveBalances(
    employeeId: string,
    year?: number
  ): Observable<LeaveBalance[]> {
    let httpParams = new HttpParams();
    if (year) {
      httpParams = httpParams.set('year', year.toString());
    }
    return this.api.get<LeaveBalance[]>(this.endpoints.balances(employeeId), {
      params: httpParams,
    });
  }

  createLeaveBalance(
    employeeId: string,
    dto: CreateLeaveBalanceDto
  ): Observable<LeaveBalance> {
    return this.api.post<LeaveBalance>(this.endpoints.balances(employeeId), dto);
  }

  adjustLeaveBalance(
    employeeId: string,
    balanceId: string,
    dto: AdjustLeaveBalanceDto
  ): Observable<LeaveBalance> {
    return this.api.post<LeaveBalance>(
      this.endpoints.adjustBalance(employeeId, balanceId),
      dto
    );
  }

  getLeaveSummary(employeeId: string, year: number): Observable<LeaveSummary> {
    const params = new HttpParams().set('year', year.toString());
    return this.api.get<LeaveSummary>(this.endpoints.summary(employeeId), {
      params,
    });
  }
}
