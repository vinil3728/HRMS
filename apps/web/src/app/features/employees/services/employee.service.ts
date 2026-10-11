import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';
import { ApiService } from '../../../core/services/api.service';
import {
  CreateEmployeeRequest,
  Department,
  Designation,
  Employee,
  EmployeeBankDetails,
  EmployeeDocument,
  EmployeeIdentityDetails,
  EmployeeListResponse,
  EmployeeProfileDetails,
  EmployeeQueryParams,
  UpdateEmployeeRequest,
} from '../models/employee.model';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly api = inject(ApiService);

  getEmployees(query: EmployeeQueryParams = {}): Observable<EmployeeListResponse> {
    let params = new HttpParams();

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }
    if (query.status && query.status !== 'ALL') {
      params = params.set('status', query.status);
    }
    if (query.page) {
      params = params.set('page', query.page.toString());
    }
    if (query.limit) {
      params = params.set('limit', query.limit.toString());
    }

    return this.api.get<EmployeeListResponse>(
      API_CONFIG.endpoints.employees.base,
      { params }
    );
  }

  getEmployeeById(id: string): Observable<Employee> {
    return this.api.get<Employee>(
      API_CONFIG.endpoints.employees.detail(id)
    );
  }

  getMyProfile(): Observable<Employee> {
    return this.api.get<Employee>(
      API_CONFIG.endpoints.employees.me
    );
  }

  getDirectory(query?: {
    search?: string;
    departmentId?: string;
    designationId?: string;
  }): Observable<Employee[]> {
    let params = new HttpParams();
    if (query?.search?.trim()) {
      params = params.set('search', query.search.trim());
    }
    if (query?.departmentId && query.departmentId !== 'ALL') {
      params = params.set('departmentId', query.departmentId);
    }
    if (query?.designationId && query.designationId !== 'ALL') {
      params = params.set('designationId', query.designationId);
    }
    return this.api.get<Employee[]>(
      API_CONFIG.endpoints.employees.directory,
      { params }
    );
  }

  createEmployee(payload: CreateEmployeeRequest): Observable<Employee> {
    return this.api.post<Employee>(
      API_CONFIG.endpoints.employees.base,
      payload
    );
  }

  updateEmployee(id: string, payload: UpdateEmployeeRequest): Observable<Employee> {
    return this.api.patch<Employee>(
      API_CONFIG.endpoints.employees.detail(id),
      payload
    );
  }

  updateEmployeeStatus(id: string, status: string): Observable<Employee> {
    return this.api.patch<Employee>(
      API_CONFIG.endpoints.employees.status(id),
      { status }
    );
  }

  getDepartments(): Observable<Department[]> {
    return this.api.get<Department[]>(
      API_CONFIG.endpoints.departments.base
    );
  }

  getDesignations(): Observable<Designation[]> {
    return this.api.get<Designation[]>(
      API_CONFIG.endpoints.designations.base
    );
  }

  getProfile(employeeId: string): Observable<EmployeeProfileDetails | null> {
    return this.api.get<EmployeeProfileDetails>(
      API_CONFIG.endpoints.employees.profile(employeeId)
    ).pipe(
      catchError(() => of(null))
    );
  }

  createProfile(
    employeeId: string,
    payload: Partial<EmployeeProfileDetails>
  ): Observable<EmployeeProfileDetails> {
    return this.api.post<EmployeeProfileDetails>(
      API_CONFIG.endpoints.employees.profile(employeeId),
      payload
    );
  }

  updateProfile(
    employeeId: string,
    payload: Partial<EmployeeProfileDetails>
  ): Observable<EmployeeProfileDetails> {
    return this.api.patch<EmployeeProfileDetails>(
      API_CONFIG.endpoints.employees.profile(employeeId),
      payload
    );
  }

  getIdentity(employeeId: string): Observable<EmployeeIdentityDetails | null> {
    return this.api.get<EmployeeIdentityDetails>(
      API_CONFIG.endpoints.employees.identity(employeeId)
    ).pipe(
      catchError(() => of(null))
    );
  }

  createIdentity(
    employeeId: string,
    payload: Partial<EmployeeIdentityDetails>
  ): Observable<EmployeeIdentityDetails> {
    return this.api.post<EmployeeIdentityDetails>(
      API_CONFIG.endpoints.employees.identity(employeeId),
      payload
    );
  }

  updateIdentity(
    employeeId: string,
    payload: Partial<EmployeeIdentityDetails>
  ): Observable<EmployeeIdentityDetails> {
    return this.api.patch<EmployeeIdentityDetails>(
      API_CONFIG.endpoints.employees.identity(employeeId),
      payload
    );
  }

  getBankDetails(employeeId: string): Observable<EmployeeBankDetails | null> {
    return this.api.get<EmployeeBankDetails>(
      API_CONFIG.endpoints.employees.bankDetails(employeeId)
    ).pipe(
      catchError(() => of(null))
    );
  }

  createBankDetails(
    employeeId: string,
    payload: Partial<EmployeeBankDetails>
  ): Observable<EmployeeBankDetails> {
    return this.api.post<EmployeeBankDetails>(
      API_CONFIG.endpoints.employees.bankDetails(employeeId),
      payload
    );
  }

  updateBankDetails(
    employeeId: string,
    payload: Partial<EmployeeBankDetails>
  ): Observable<EmployeeBankDetails> {
    return this.api.patch<EmployeeBankDetails>(
      API_CONFIG.endpoints.employees.bankDetails(employeeId),
      payload
    );
  }

  getDocuments(employeeId: string): Observable<EmployeeDocument[]> {
    return this.api.get<EmployeeDocument[]>(
      API_CONFIG.endpoints.employees.documents(employeeId)
    ).pipe(
      catchError(() => of([]))
    );
  }

  uploadDocument(
    employeeId: string,
    file: File,
    documentType: string
  ): Observable<EmployeeDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return this.api.post<EmployeeDocument>(
      API_CONFIG.endpoints.employees.uploadDocument(employeeId),
      formData
    );
  }

  downloadDocument(employeeId: string, docId: string): Observable<Blob> {
    return this.api.getBlob(
      API_CONFIG.endpoints.employees.downloadDocument(employeeId, docId)
    );
  }

  deleteDocument(
    employeeId: string,
    docId: string
  ): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(
      API_CONFIG.endpoints.employees.deleteDocument(employeeId, docId)
    );
  }
}
