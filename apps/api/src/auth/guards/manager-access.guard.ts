import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthenticatedRequest } from './jwt-auth.guard';

import { Employee } from '../../app/employees/entities/employee.entity';
import { RolePermission } from '../../app/permissions/entities/role-permission.entity';
import { Permission } from '../../app/permissions/enums/permission.enum';
import { User } from '../entities/user.entity';

const ORG_WIDE_MANAGER_PERMISSIONS: string[] = [
    Permission.EMPLOYEE_VIEWS,
    Permission.EMPLOYEE_UPDATE,
    Permission.ATTENDANCE_ALL_VIEW,
    Permission.ATTENDANCE_REGULARIZATION_APPROVE,
    Permission.LEAVE_BALANCE_CREATE,
    Permission.PAYROLL_VIEW,
    Permission.REIMBURSEMENT_PAY,
    Permission.PERFORMANCE_SUMMARY_FINALIZE,
];

@Injectable()
export class ManagerAccessGuard
    implements CanActivate
{
    constructor(
        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,

        @InjectRepository(RolePermission)
        private readonly rolePermissionRepository: Repository<RolePermission>,
    ) {}

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const request =
            context
                .switchToHttp()
                .getRequest<AuthenticatedRequest>();

        const currentUser = request.user;

        if (!currentUser) {
            throw new ForbiddenException(
                'User is not authenticated',
            );
        }

        const employeeId =
            request.params['employeeId'];

        if (!employeeId) {
            throw new ForbiddenException(
                'Employee ID is required',
            );
        }

        const employee =
            await this.employeeRepository.findOne({
                where: {
                    id: employeeId,
                },
                relations: {
                    manager: true,
                },
            });

        if (!employee) {
            throw new ForbiddenException(
                'Employee not found',
            );
        }

        /*
         * Direct manager can manage their direct reports.
         * PermissionGuard separately verifies the specific action permission.
         */
        if (
            employee.manager?.id ===
            currentUser.employeeId
        ) {
            return true;
        }

        /*
         * Users with organization-wide permissions can operate on any employee
         * (except self-approval, which services/UI guard against).
         */
        const orgPermsCount =
            await this.rolePermissionRepository
                .createQueryBuilder('rolePermission')
                .innerJoin('rolePermission.role', 'role')
                .innerJoin('rolePermission.permission', 'permission')
                .innerJoin(User, 'user', 'user.role_id = role.id')
                .where('user.id = :userId', {
                    userId: currentUser.userId,
                })
                .andWhere('role.is_active = true')
                .andWhere('permission.is_active = true')
                .andWhere('permission.code IN (:...codes)', {
                    codes: ORG_WIDE_MANAGER_PERMISSIONS,
                })
                .getCount();

        if (orgPermsCount > 0) {
            return true;
        }

        throw new ForbiddenException(
            'You can only manage your direct reports',
        );
    }
}