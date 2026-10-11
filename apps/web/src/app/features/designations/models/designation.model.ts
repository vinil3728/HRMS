export interface DepartmentRef {
  id: string;
  name: string;
  code: string;
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  departmentId?: string | null;
  department?: DepartmentRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDesignationDto {
  name: string;
  code: string;
  departmentId?: string | null;
  isActive?: boolean;
}

export interface UpdateDesignationDto {
  name?: string;
  code?: string;
  departmentId?: string | null;
  isActive?: boolean;
}
