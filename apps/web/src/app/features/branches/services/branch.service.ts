import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  Branch,
  CreateBranchDto,
  UpdateBranchDto,
} from '../models/branch.model';

@Injectable({
  providedIn: 'root',
})
export class BranchService {
  private readonly api = inject(ApiService);
  private readonly endpoint = API_CONFIG.endpoints.branches;

  getBranches(search?: string, isActive?: boolean): Observable<Branch[]> {
    let url = this.endpoint.base;
    const params: string[] = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (isActive !== undefined) params.push(`isActive=${isActive}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.api.get<Branch[]>(url);
  }

  getBranchById(id: string): Observable<Branch> {
    return this.api.get<Branch>(this.endpoint.detail(id));
  }

  createBranch(dto: CreateBranchDto): Observable<Branch> {
    return this.api.post<Branch>(this.endpoint.base, dto);
  }

  updateBranch(id: string, dto: UpdateBranchDto): Observable<Branch> {
    return this.api.patch<Branch>(this.endpoint.detail(id), dto);
  }

  toggleStatus(id: string, currentStatus: boolean): Observable<Branch> {
    return this.api.patch<Branch>(this.endpoint.status(id), {
      isActive: !currentStatus,
    });
  }

  deleteBranch(id: string): Observable<{ success: boolean; message: string }> {
    return this.api.delete<{ success: boolean; message: string }>(
      this.endpoint.detail(id)
    );
  }
}
