import { Employee } from '../../employees/models/employee.model';

export enum PolicyStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export interface Policy {
  id: string;
  title: string;
  code: string;
  content: string;
  version: string | null;
  status: PolicyStatus;
  effectiveDate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePolicyDto {
  title: string;
  code: string;
  content: string;
  version?: string;
  effectiveDate?: string;
}

export interface UpdatePolicyDto {
  title?: string;
  code?: string;
  content?: string;
  version?: string | null;
  effectiveDate?: string | null;
}

export interface PolicyAcknowledgement {
  id: string;
  employee: Employee;
  policy: Policy;
  acknowledgedAt: string;
}

export interface PolicyAcknowledgementStatus {
  employeeId: string;
  policyId: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}
