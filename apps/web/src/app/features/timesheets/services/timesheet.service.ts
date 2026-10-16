import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';
import { ApiService } from '../../../core/services/api.service';
import {
  CreateTimesheetDto,
  RejectTimesheetDto,
  ScopedTimesheetListResponse,
  ScopedTimesheetQueryParams,
  Timesheet,
  TimesheetListResponse,
  TimesheetQueryParams,
  TimesheetSummary,
  UpdateTimesheetDto,
} from '../models/timesheet.model';

@Injectable({
  providedIn: 'root',
})
export class TimesheetService {
  private readonly api = inject(ApiService);
  private readonly endpoints = API_CONFIG.endpoints.timesheets;

  getTimesheets(
    employeeId: string,
    query: TimesheetQueryParams = {}
  ): Observable<TimesheetListResponse> {
    let params = new HttpParams();
    if (query.fromDate) {
      params = params.set('fromDate', query.fromDate);
    }
    if (query.toDate) {
      params = params.set('toDate', query.toDate);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.page) {
      params = params.set('page', query.page.toString());
    }
    if (query.limit) {
      params = params.set('limit', query.limit.toString());
    }

    return this.api.get<TimesheetListResponse>(
      this.endpoints.base(employeeId),
      { params }
    );
  }

  getSummary(employeeId: string): Observable<TimesheetSummary> {
    return this.api.get<TimesheetSummary>(this.endpoints.summary(employeeId));
  }

  getTimesheet(employeeId: string, timesheetId: string): Observable<Timesheet> {
    return this.api.get<Timesheet>(
      this.endpoints.detail(employeeId, timesheetId)
    );
  }

  createTimesheet(
    employeeId: string,
    dto: CreateTimesheetDto
  ): Observable<Timesheet> {
    return this.api.post<Timesheet>(this.endpoints.base(employeeId), dto);
  }

  updateTimesheet(
    employeeId: string,
    timesheetId: string,
    dto: UpdateTimesheetDto
  ): Observable<Timesheet> {
    return this.api.patch<Timesheet>(
      this.endpoints.detail(employeeId, timesheetId),
      dto
    );
  }

  deleteTimesheet(
    employeeId: string,
    timesheetId: string
  ): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      this.endpoints.detail(employeeId, timesheetId)
    );
  }

  submitTimesheet(
    employeeId: string,
    timesheetId: string
  ): Observable<Timesheet> {
    return this.api.post<Timesheet>(
      this.endpoints.submit(employeeId, timesheetId),
      {}
    );
  }

  approveTimesheet(
    employeeId: string,
    timesheetId: string
  ): Observable<Timesheet> {
    return this.api.post<Timesheet>(
      this.endpoints.approve(employeeId, timesheetId),
      {}
    );
  }

  rejectTimesheet(
    employeeId: string,
    timesheetId: string,
    reason: string
  ): Observable<Timesheet> {
    const dto: RejectTimesheetDto = { reason };
    return this.api.post<Timesheet>(
      this.endpoints.reject(employeeId, timesheetId),
      dto
    );
  }

  getAllTimesheets(
    query: ScopedTimesheetQueryParams = {}
  ): Observable<ScopedTimesheetListResponse> {
    let params = new HttpParams();
    if (query.fromDate) {
      params = params.set('fromDate', query.fromDate);
    }
    if (query.toDate) {
      params = params.set('toDate', query.toDate);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.page) {
      params = params.set('page', query.page.toString());
    }
    if (query.limit) {
      params = params.set('limit', query.limit.toString());
    }
    if (query.employeeId) {
      params = params.set('employeeId', query.employeeId);
    }
    if (query.scope) {
      params = params.set('scope', query.scope);
    }

    return this.api.get<ScopedTimesheetListResponse>(
      this.endpoints.overview,
      { params }
    );
  }
}
