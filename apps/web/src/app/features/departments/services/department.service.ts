import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from '../models/department.model';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private readonly api = inject(ApiService);
  private readonly endpoint = API_CONFIG.endpoints.departments;

  getDepartments(branchId?: string): Observable<Department[]> {
    const url = branchId
      ? `${this.endpoint.base}?branchId=${encodeURIComponent(branchId)}`
      : this.endpoint.base;
    return this.api.get<Department[]>(url);
  }

  getDepartmentById(id: string): Observable<Department> {
    return this.api.get<Department>(this.endpoint.detail(id));
  }

  createDepartment(dto: CreateDepartmentDto): Observable<Department> {
    return this.api.post<Department>(this.endpoint.base, dto);
  }

  updateDepartment(
    id: string,
    dto: UpdateDepartmentDto
  ): Observable<Department> {
    return this.api.patch<Department>(this.endpoint.detail(id), dto);
  }

  toggleStatus(id: string, currentStatus: boolean): Observable<Department> {
    return this.updateDepartment(id, { isActive: !currentStatus });
  }
}
