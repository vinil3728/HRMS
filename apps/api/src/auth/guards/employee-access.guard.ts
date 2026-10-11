import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Employee } from '../../app/employees/entities/employee.entity';
import { RolePermission } from '../../app/permissions/entities/role-permission.entity';
import { Permission } from '../../app/permissions/enums/permission.enum';
import { User } from '../entities/user.entity';

import { AuthenticatedRequest } from './jwt-auth.guard';

const ORG_WIDE_ACCESS_PERMISSIONS: string[] = [
    Permission.EMPLOYEE_VIEWS,
    Permission.EMPLOYEE_VIEW,
    Permission.EMPLOYEE_UPDATE,
    Permission.EMPLOYEE_STATUS_UPDATE,
    Permission.ATTENDANCE_ALL_VIEW,
    Permission.ATTENDANCE_CREATE,
    Permission.ATTENDANCE_UPDATE,
    Permission.ATTENDANCE_DELETE,
    Permission.ATTENDANCE_REGULARIZATION_VIEW,
    Permission.ATTENDANCE_REGULARIZATION_APPROVE,
    Permission.ATTENDANCE_REGULARIZATION_REJECT,
    Permission.LEAVE_BALANCE_CREATE,
    Permission.PAYROLL_SUMMARY_VIEW,
    Permission.PAYROLL_PROCESS,
    Permission.PAYROLL_CREATE,
    Permission.PAYROLL_UPDATE,
    Permission.PAYROLL_APPROVE,
    Permission.REIMBURSEMENT_PAY,
    Permission.PERFORMANCE_CYCLE_CREATE,
    Permission.PERFORMANCE_SUMMARY_FINALIZE,
];

const TEAM_ACCESS_PERMISSIONS: string[] = [
    Permission.ATTENDANCE_TEAM_VIEW,
    Permission.ATTENDANCE_REGULARIZATION_VIEW,
    Permission.ATTENDANCE_REGULARIZATION_APPROVE,
    Permission.ATTENDANCE_REGULARIZATION_REJECT,
    Permission.LEAVE_APPROVE,
    Permission.LEAVE_REJECT,
    Permission.TIMESHEET_APPROVE,
    Permission.TIMESHEET_REJECT,
    Permission.REIMBURSEMENT_APPROVE,
    Permission.REIMBURSEMENT_REJECT,
    Permission.PERFORMANCE_GOAL_CREATE,
    Permission.PERFORMANCE_EVALUATION_CREATE,
];

@Injectable()
export class EmployeeAccessGuard
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
            request.params['employeeId'] ??
            request.params['id'];

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
            throw new NotFoundException(
                'Employee not found',
            );
        }

        /*
         * 1. Self access: Employee can access their own record.
         */
        if (
            employee.id ===
            currentUser.employeeId
        ) {
            return true;
        }

        const isDirectReport =
            employee.manager?.id ===
            currentUser.employeeId;

        const allowedPermissionCodes = isDirectReport
            ? [
                  ...ORG_WIDE_ACCESS_PERMISSIONS,
                  ...TEAM_ACCESS_PERMISSIONS,
              ]
            : ORG_WIDE_ACCESS_PERMISSIONS;

        const matchingPermsCount =
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
                    codes: allowedPermissionCodes,
                })
                .getCount();

        if (matchingPermsCount > 0) {
            return true;
        }

        throw new ForbiddenException(
            'You do not have access to this employee',
        );
    }
}