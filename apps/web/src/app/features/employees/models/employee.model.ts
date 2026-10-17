export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RESIGNED = 'RESIGNED',
  TERMINATED = 'TERMINATED',
}

export interface DepartmentRef {
  id: string;
  name: string;
  code: string;
}

export interface DesignationRef {
  id: string;
  name: string;
  code: string;
}

export interface ManagerRef {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeCode?: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfJoining: string;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
  department?: DepartmentRef | null;
  designation?: DesignationRef | null;
  manager?: ManagerRef | null;
  profileDetails?: EmployeeProfileDetails | null;
}

export interface EmployeeListResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EmployeeQueryParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  departmentId?: string;
  designationId?: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfJoining: string;
  status: EmployeeStatus;
  departmentId: string;
  designationId: string;
  managerId?: string | null;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfJoining?: string;
  status?: EmployeeStatus;
  departmentId?: string;
  designationId?: string;
  managerId?: string | null;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  departmentId?: string | null;
  department?: DepartmentRef | null;
}

export interface EmployeeProfileDetails {
  id?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  bloodGroup?: string | null;
  nationality?: string | null;
  personalEmail?: string | null;
  alternatePhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  currentAddress?: string | null;
  permanentAddress?: string | null;
  emergencyContactRelation?: string | null;
}

export interface EmployeeIdentityDetails {
  id?: string;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  passportNumber?: string | null;
}

export interface EmployeeBankDetails {
  id?: string;
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
}

export interface EmployeeDocument {
  id: string;
  documentType: string;
  fileName: string;
  filePath?: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  originalFileName?: string;
  storedFileName?: string;
  createdAt?: string;
}
