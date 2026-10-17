export interface DepartmentRef {
  id: string;
  name: string;
  code: string;
}

export interface EmployeeRef {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status?: string;
  dateOfJoining?: string;
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  departmentId?: string | null;
  department?: DepartmentRef | null;
  employees?: EmployeeRef[];
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
