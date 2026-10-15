import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Employee } from '../../app/employees/entities/employee.entity';
import { RolePermission } from '../../app/permissions/entities/role-permission.entity';
import { User } from '../entities/user.entity';

import { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class EmployeeAccessGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,

        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,

        @InjectRepository(RolePermission)
        private readonly rolePermissionRepository: Repository<RolePermission>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const currentUser = request.user;

        if (!currentUser) {
            throw new ForbiddenException('User is not authenticated');
        }

        const employeeId = request.params['employeeId'] ?? request.params['id'];
        if (!employeeId) {
            throw new ForbiddenException('Employee ID is required');
        }

        const employee = await this.employeeRepository.findOne({
            where: { id: employeeId },
            relations: { manager: true },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        // Retrieve route permissions from @Permissions and @AnyPermissions decorators
        const requiredPermissions =
            this.reflector.getAllAndOverride<string[]>('permissions', [
                context.getHandler(),
                context.getClass(),
            ]) ?? [];

        const anyPermissions =
            this.reflector.getAllAndOverride<string[]>('any_permissions', [
                context.getHandler(),
                context.getClass(),
            ]) ?? [];

        const routePermissions = [...requiredPermissions, ...anyPermissions];

        // Determine relation between current user and target employee
        const isSelf = employee.id === currentUser.employeeId;
        const isDirectReport = employee.manager?.id === currentUser.employeeId;

        // Query user's active permissions
        const qb = this.rolePermissionRepository
            .createQueryBuilder('rolePermission')
            .innerJoin('rolePermission.role', 'role')
            .innerJoin('rolePermission.permission', 'permission')
            .innerJoin(User, 'user', 'user.role_id = role.id')
            .where('user.id = :userId', { userId: currentUser.userId })
            .andWhere('role.is_active = true')
            .andWhere('permission.is_active = true')
            .andWhere('permission.is_deleted = false');

        if (routePermissions.length > 0) {
            qb.andWhere('permission.code IN (:...codes)', { codes: routePermissions });
        }

        if (isSelf) {
            // For self access, if specific route permissions are defined,
            // ensure the user has a permission permitting SELF or GLOBAL scope
            // (e.g. pure TEAM/ORG approval permissions do not allow self-approval).
            if (routePermissions.length === 0) {
                return true;
            }
            qb.andWhere(
                "(permission.scopes LIKE '%SELF%' OR permission.scopes LIKE '%GLOBAL%')"
            );
        } else if (isDirectReport) {
            // For direct report access, user must hold a permission with TEAM or ORGANIZATION scope
            qb.andWhere(
                "(permission.scopes LIKE '%TEAM%' OR permission.scopes LIKE '%ORGANIZATION%')"
            );
        } else {
            // For third-party employee access, user must hold a permission with ORGANIZATION scope
            qb.andWhere("permission.scopes LIKE '%ORGANIZATION%'");
        }

        const matchingPermsCount = await qb.getCount();

        if (matchingPermsCount > 0) {
            return true;
        }

        throw new ForbiddenException('You do not have access to this employee');
    }
}