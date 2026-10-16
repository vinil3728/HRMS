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
import { PermissionScope } from '../../app/permissions/enums/permission-scope.enum';
import { User } from '../entities/user.entity';

import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * ScopeAccessGuard (Unified Dynamic Resource & Scope Access Guard)
 *
 * Dynamically validates that the authenticated caller has the necessary scope
 * (SELF, TEAM, or ORG) on the requested route's permission(s) for the target employee:
 *
 * 1. Self Access (target employee is current user):
 *    Requires 'SELF' or 'GLOBAL' scope in role_permissions.scopes.
 *
 * 2. Direct Report / Team Access (target reports to current user):
 *    Requires 'TEAM', 'ORG', 'ORGANIZATION', or 'GLOBAL' scope in role_permissions.scopes.
 *
 * 3. Organization-Wide Access (target is any other employee in organization):
 *    Requires 'ORG', 'ORGANIZATION', or 'GLOBAL' scope in role_permissions.scopes.
 *
 * Replaces and unifies both EmployeeAccessGuard and ManagerAccessGuard into a single,
 * role-independent, database-driven guard.
 */
@Injectable()
export class ScopeAccessGuard implements CanActivate {
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

        const rawEmployeeId =
            request.params?.['employeeId'] ??
            request.params?.['id'] ??
            request.query?.['employeeId'] ??
            (request.body as { employeeId?: string })?.employeeId;

        const employeeId = typeof rawEmployeeId === 'string' ? rawEmployeeId : undefined;

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
                `(:selfScope = ANY(rolePermission.scopes) OR 'GLOBAL' = ANY(rolePermission.scopes) OR permission.scopes LIKE '%SELF%' OR permission.scopes LIKE '%GLOBAL%')`,
                { selfScope: PermissionScope.SELF }
            );
        } else if (isDirectReport) {
            // For direct report access, user must hold a permission with TEAM or ORG scope
            qb.andWhere(
                `(:teamScope = ANY(rolePermission.scopes) OR :orgScope = ANY(rolePermission.scopes) OR 'ORGANIZATION' = ANY(rolePermission.scopes) OR 'GLOBAL' = ANY(rolePermission.scopes) OR permission.scopes LIKE '%TEAM%' OR permission.scopes LIKE '%ORGANIZATION%')`,
                { teamScope: PermissionScope.TEAM, orgScope: PermissionScope.ORG }
            );
        } else {
            // For third-party employee access, user must hold a permission with ORG scope
            qb.andWhere(
                `(:orgScope = ANY(rolePermission.scopes) OR 'ORGANIZATION' = ANY(rolePermission.scopes) OR 'GLOBAL' = ANY(rolePermission.scopes) OR permission.scopes LIKE '%ORGANIZATION%')`,
                { orgScope: PermissionScope.ORG }
            );
        }

        const matchingPermsCount = await qb.getCount();

        if (matchingPermsCount > 0) {
            return true;
        }

        throw new ForbiddenException('You do not have access to this employee');
    }
}
