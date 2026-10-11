import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  Designation,
  CreateDesignationDto,
  UpdateDesignationDto,
} from '../models/designation.model';

@Injectable({
  providedIn: 'root',
})
export class DesignationService {
  private readonly api = inject(ApiService);
  private readonly endpoint = API_CONFIG.endpoints.designations;

  getDesignations(departmentId?: string): Observable<Designation[]> {
    return this.api.get<Designation[]>(
      this.endpoint.base,
      departmentId ? { params: { departmentId } } : undefined
    );
  }

  getDesignationById(id: string): Observable<Designation> {
    return this.api.get<Designation>(this.endpoint.detail(id));
  }

  createDesignation(dto: CreateDesignationDto): Observable<Designation> {
    return this.api.post<Designation>(this.endpoint.base, dto);
  }

  updateDesignation(
    id: string,
    dto: UpdateDesignationDto
  ): Observable<Designation> {
    return this.api.patch<Designation>(this.endpoint.detail(id), dto);
  }

  toggleStatus(id: string, currentStatus: boolean): Observable<Designation> {
    return this.updateDesignation(id, { isActive: !currentStatus });
  }
}
