import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  CreatePolicyDto,
  Policy,
  PolicyAcknowledgement,
  PolicyAcknowledgementStatus,
  PolicyStatus,
  UpdatePolicyDto,
} from '../models/policy.model';

@Injectable({
  providedIn: 'root',
})
export class PolicyService {
  private readonly api = inject(ApiService);
  private readonly endpoints = API_CONFIG.endpoints.policies;

  getPolicies(status?: PolicyStatus): Observable<Policy[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.api.get<Policy[]>(this.endpoints.base, { params });
  }

  getPolicy(id: string): Observable<Policy> {
    return this.api.get<Policy>(this.endpoints.detail(id));
  }

  createPolicy(dto: CreatePolicyDto): Observable<Policy> {
    return this.api.post<Policy>(this.endpoints.base, dto);
  }

  updatePolicy(id: string, dto: UpdatePolicyDto): Observable<Policy> {
    return this.api.patch<Policy>(this.endpoints.detail(id), dto);
  }

  deletePolicy(id: string): Observable<{ message: string } | void> {
    return this.api.delete(this.endpoints.detail(id));
  }

  publishPolicy(id: string): Observable<Policy> {
    return this.api.post<Policy>(this.endpoints.publish(id), {});
  }

  archivePolicy(id: string): Observable<Policy> {
    return this.api.post<Policy>(this.endpoints.archive(id), {});
  }

  acknowledgePolicy(
    employeeId: string,
    policyId: string
  ): Observable<PolicyAcknowledgement> {
    return this.api.post<PolicyAcknowledgement>(
      this.endpoints.acknowledgements.acknowledge(employeeId, policyId),
      {}
    );
  }

  getEmployeeAcknowledgements(
    employeeId: string
  ): Observable<PolicyAcknowledgement[]> {
    return this.api.get<PolicyAcknowledgement[]>(
      this.endpoints.acknowledgements.employee(employeeId)
    );
  }

  getPolicyAcknowledgements(
    policyId: string
  ): Observable<PolicyAcknowledgement[]> {
    return this.api.get<PolicyAcknowledgement[]>(
      this.endpoints.acknowledgements.policy(policyId)
    );
  }

  getEmployeePolicyStatus(
    employeeId: string,
    policyId: string
  ): Observable<PolicyAcknowledgementStatus> {
    return this.api.get<PolicyAcknowledgementStatus>(
      this.endpoints.acknowledgements.status(employeeId, policyId)
    );
  }
}
