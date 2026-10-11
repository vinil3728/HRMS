import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  CreateReimbursementDto,
  Reimbursement,
  ReimbursementQueryParams,
  ReimbursementResponse,
  UpdateReimbursementDto,
} from '../models/reimbursement.model';

@Injectable({
  providedIn: 'root',
})
export class ReimbursementService {
  private readonly api = inject(ApiService);
  private readonly endpoints = API_CONFIG.endpoints.reimbursements;

  getReimbursements(
    employeeId: string,
    params?: ReimbursementQueryParams
  ): Observable<ReimbursementResponse> {
    let httpParams = new HttpParams();
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.category) {
      httpParams = httpParams.set('category', params.category);
    }
    if (params?.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.api.get<ReimbursementResponse>(
      this.endpoints.base(employeeId),
      { params: httpParams }
    );
  }

  getReimbursementById(
    employeeId: string,
    id: string
  ): Observable<Reimbursement> {
    return this.api.get<Reimbursement>(
      this.endpoints.detail(employeeId, id)
    );
  }

  createReimbursement(
    employeeId: string,
    dto: CreateReimbursementDto
  ): Observable<Reimbursement> {
    return this.api.post<Reimbursement>(
      this.endpoints.base(employeeId),
      dto
    );
  }

  updateReimbursement(
    employeeId: string,
    id: string,
    dto: UpdateReimbursementDto
  ): Observable<Reimbursement> {
    return this.api.patch<Reimbursement>(
      this.endpoints.detail(employeeId, id),
      dto
    );
  }

  deleteReimbursement(
    employeeId: string,
    id: string
  ): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      this.endpoints.detail(employeeId, id)
    );
  }

  submitReimbursement(
    employeeId: string,
    id: string
  ): Observable<Reimbursement> {
    return this.api.post<Reimbursement>(
      this.endpoints.submit(employeeId, id),
      {}
    );
  }

  uploadReceipt(
    employeeId: string,
    id: string,
    file: File
  ): Observable<Reimbursement> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post<Reimbursement>(
      this.endpoints.receipt(employeeId, id),
      formData
    );
  }

  downloadReceipt(
    employeeId: string,
    id: string
  ): Observable<Blob> {
    return this.api.getBlob(
      this.endpoints.receipt(employeeId, id)
    );
  }

  approveReimbursement(
    employeeId: string,
    id: string
  ): Observable<Reimbursement> {
    return this.api.post<Reimbursement>(
      this.endpoints.approve(employeeId, id),
      {}
    );
  }

  rejectReimbursement(
    employeeId: string,
    id: string,
    rejectionReason: string
  ): Observable<Reimbursement> {
    return this.api.post<Reimbursement>(
      this.endpoints.reject(employeeId, id),
      { rejectionReason }
    );
  }

  markAsPaid(
    employeeId: string,
    id: string
  ): Observable<Reimbursement> {
    return this.api.post<Reimbursement>(
      this.endpoints.pay(employeeId, id),
      {}
    );
  }
}
