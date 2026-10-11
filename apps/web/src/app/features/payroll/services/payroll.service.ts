import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../../core/config/api.config';
import { ApiService } from '../../../core/services/api.service';
import {
  CreatePayrollRunDto,
  CreatePayslipDto,
  CreateSalaryStructureDto,
  MarkPaidDto,
  PayrollQueryParams,
  PayrollRun,
  PayrollSummary,
  Payslip,
  PayslipListResponse,
  SalaryStructure,
  UpdatePayslipDto,
  UpdateSalaryStructureDto,
} from '../models/payroll.model';

@Injectable({
  providedIn: 'root',
})
export class PayrollService {
  private readonly api = inject(ApiService);
  private readonly endpoints = API_CONFIG.endpoints.payroll;

  // --- Summary ---
  getSummary(month?: number, year?: number): Observable<PayrollSummary> {
    let params = new HttpParams();
    if (month) params = params.set('month', month.toString());
    if (year) params = params.set('year', year.toString());
    return this.api.get<PayrollSummary>(this.endpoints.summary, { params });
  }

  // --- Payroll Runs ---
  getRuns(year?: number): Observable<PayrollRun[]> {
    let params = new HttpParams();
    if (year) params = params.set('year', year.toString());
    return this.api.get<PayrollRun[]>(this.endpoints.runs, { params });
  }

  getRun(id: string): Observable<PayrollRun> {
    return this.api.get<PayrollRun>(this.endpoints.runDetail(id));
  }

  createRun(dto: CreatePayrollRunDto): Observable<PayrollRun> {
    return this.api.post<PayrollRun>(this.endpoints.runs, dto);
  }

  approveRun(id: string): Observable<PayrollRun> {
    return this.api.post<PayrollRun>(this.endpoints.approveRun(id), {});
  }

  payRun(id: string, dto: MarkPaidDto): Observable<PayrollRun> {
    return this.api.post<PayrollRun>(this.endpoints.payRun(id), dto);
  }

  markRunAsPaid(id: string, dto: MarkPaidDto): Observable<PayrollRun> {
    return this.payRun(id, dto);
  }

  deleteRun(id: string): Observable<{ deleted: boolean }> {
    return this.api.delete<{ deleted: boolean }>(this.endpoints.runDetail(id));
  }

  // --- Payslips ---
  getPayslips(query: PayrollQueryParams = {}): Observable<PayslipListResponse> {
    let params = new HttpParams();
    if (query.month) params = params.set('month', query.month.toString());
    if (query.year) params = params.set('year', query.year.toString());
    if (query.status) params = params.set('status', query.status);
    if (query.employeeId) params = params.set('employeeId', query.employeeId);
    if (query.departmentId) params = params.set('departmentId', query.departmentId);
    if (query.payrollRunId) params = params.set('payrollRunId', query.payrollRunId);
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());

    return this.api.get<PayslipListResponse>(this.endpoints.payslips, { params });
  }

  getPayslip(id: string): Observable<Payslip> {
    return this.api.get<Payslip>(this.endpoints.payslipDetail(id));
  }

  createPayslip(dto: CreatePayslipDto): Observable<Payslip> {
    return this.api.post<Payslip>(this.endpoints.payslips, dto);
  }

  updatePayslip(id: string, dto: UpdatePayslipDto): Observable<Payslip> {
    return this.api.patch<Payslip>(this.endpoints.payslipDetail(id), dto);
  }

  approvePayslip(id: string): Observable<Payslip> {
    return this.api.post<Payslip>(this.endpoints.approvePayslip(id), {});
  }

  rejectPayslip(id: string, reason: string): Observable<Payslip> {
    return this.api.post<Payslip>(this.endpoints.rejectPayslip(id), { reason });
  }

  payPayslip(id: string, dto: MarkPaidDto): Observable<Payslip> {
    return this.api.post<Payslip>(this.endpoints.payPayslip(id), dto);
  }

  markPayslipAsPaid(id: string, dto: MarkPaidDto): Observable<Payslip> {
    return this.payPayslip(id, dto);
  }

  deletePayslip(id: string): Observable<{ deleted: boolean }> {
    return this.api.delete<{ deleted: boolean }>(this.endpoints.payslipDetail(id));
  }

  // --- Salary Structures ---
  getSalaryStructures(): Observable<SalaryStructure[]> {
    return this.api.get<SalaryStructure[]>(this.endpoints.salaryStructures);
  }

  getSalaryStructureByEmployee(employeeId: string): Observable<SalaryStructure> {
    return this.api.get<SalaryStructure>(this.endpoints.salaryStructureEmployee(employeeId));
  }

  createOrUpdateSalaryStructure(dto: CreateSalaryStructureDto): Observable<SalaryStructure> {
    return this.api.post<SalaryStructure>(this.endpoints.salaryStructures, dto);
  }

  createSalaryStructure(dto: CreateSalaryStructureDto): Observable<SalaryStructure> {
    return this.createOrUpdateSalaryStructure(dto);
  }

  updateSalaryStructure(id: string, dto: UpdateSalaryStructureDto & { employeeId?: string }): Observable<SalaryStructure> {
    return this.api.post<SalaryStructure>(this.endpoints.salaryStructures, dto);
  }
}
