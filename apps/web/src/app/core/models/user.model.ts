import { Employee } from '../../features/employees/models/employee.model';

export interface User {
  id: string;
  username: string;
  employeeId?: string;
  employee?: Partial<Employee>;
  roleId?: string;
  role: string;
  permissions: string[];
  permissionScopes?: Record<string, string[]>;
}
