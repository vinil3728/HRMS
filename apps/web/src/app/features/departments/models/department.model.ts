export interface DesignationRef {
  id: string;
  name: string;
  code: string;
}

export interface BranchRef {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  state?: string | null;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  branchId?: string | null;
  branch?: BranchRef | null;
  designations?: DesignationRef[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  branchId?: string | null;
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  branchId?: string | null;
  isActive?: boolean;
}
