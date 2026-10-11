import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  CompanyLoan,
  CreateLoanPayload,
  ApproveLoanPayload,
  RejectLoanPayload,
  DisburseLoanPayload,
  ConfigureRepaymentPayload,
  RecordPaymentPayload,
  LoanMetrics,
  LoanQueryParams,
} from '../models/loan.model';

@Injectable({
  providedIn: 'root',
})
export class LoanService {
  private readonly api = inject(ApiService);
  private readonly endpoints = API_CONFIG.endpoints.loans;

  applyLoan(payload: CreateLoanPayload): Observable<CompanyLoan> {
    return this.api.post<CompanyLoan>(this.endpoints.apply, payload);
  }

  getMyLoans(): Observable<CompanyLoan[]> {
    return this.api.get<CompanyLoan[]>(this.endpoints.myLoans);
  }

  getAllLoans(params?: LoanQueryParams): Observable<{ data: CompanyLoan[]; total: number }> {
    let url = this.endpoints.base;
    const queryParts: string[] = [];

    if (params?.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.employeeId) queryParts.push(`employeeId=${encodeURIComponent(params.employeeId)}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);

    if (queryParts.length > 0) {
      url += `?${queryParts.join('&')}`;
    }

    return this.api.get<{ data: CompanyLoan[]; total: number }>(url);
  }

  getLoanById(id: string): Observable<CompanyLoan> {
    return this.api.get<CompanyLoan>(this.endpoints.detail(id));
  }

  getMetrics(): Observable<LoanMetrics> {
    return this.api.get<LoanMetrics>(this.endpoints.metrics);
  }

  approveLoan(id: string, payload: ApproveLoanPayload): Observable<CompanyLoan> {
    return this.api.post<CompanyLoan>(this.endpoints.approve(id), payload);
  }

  rejectLoan(id: string, payload: RejectLoanPayload): Observable<CompanyLoan> {
    return this.api.post<CompanyLoan>(this.endpoints.reject(id), payload);
  }

  disburseLoan(id: string, payload: DisburseLoanPayload): Observable<CompanyLoan> {
    return this.api.post<CompanyLoan>(this.endpoints.disburse(id), payload);
  }

  configureRepayment(id: string, payload: ConfigureRepaymentPayload): Observable<CompanyLoan> {
    return this.api.post<CompanyLoan>(this.endpoints.configureRepayment(id), payload);
  }

  startRepayment(id: string): Observable<CompanyLoan> {
    return this.api.post<CompanyLoan>(this.endpoints.startRepayment(id), {});
  }

  recordPayment(
    id: string,
    installmentId: string,
    payload: RecordPaymentPayload,
  ): Observable<CompanyLoan> {
    return this.api.post<CompanyLoan>(
      this.endpoints.payInstallment(id, installmentId),
      payload,
    );
  }

  uploadReceipt(file: File): Observable<{ fileUrl: string; originalName: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<{ fileUrl: string; originalName: string }>(
      this.endpoints.uploadReceipt,
      formData,
    );
  }
}
