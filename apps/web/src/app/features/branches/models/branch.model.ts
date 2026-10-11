export interface DepartmentRef {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  designations?: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  }[];
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  isActive: boolean;
  departments?: DepartmentRef[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchDto {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isActive?: boolean;
}

export interface UpdateBranchDto {
  name?: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isActive?: boolean;
}
