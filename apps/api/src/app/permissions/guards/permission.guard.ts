import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RolePermission } from '../entities/role-permission.entity';
import { User } from '../../../auth/entities/user.entity';

export interface PermissionRequest {
    user: {
        userId: string;
        employeeId: string;
        roleId: string;
        role?: string;
        username: string;
    };
}

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,

        @InjectRepository(RolePermission)
        private readonly rolePermissionRepository: Repository<RolePermission>,
    ) { }

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const requiredPermissions =
            this.reflector.getAllAndOverride<string[]>(
                'permissions',
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        const anyPermissions =
            this.reflector.getAllAndOverride<string[]>(
                'any_permissions',
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        if (
            !requiredPermissions?.length &&
            !anyPermissions?.length
        ) {
            return true;
        }

        const request =
            context
                .switchToHttp()
                .getRequest<PermissionRequest>();

        const userId = request.user?.userId;

        if (!userId) {
            throw new ForbiddenException(
                'Authenticated user not found',
            );
        }

        const targetCodes = [
            ...(requiredPermissions ?? []),
            ...(anyPermissions ?? []),
        ];

        const rolePermissions =
            await this.rolePermissionRepository
                .createQueryBuilder('rolePermission')
                .innerJoinAndSelect(
                    'rolePermission.role',
                    'role',
                )
                .innerJoinAndSelect(
                    'rolePermission.permission',
                    'permission',
                )
                .innerJoin(
                    User,
                    'user',
                    'user.role_id = role.id',
                )
                .where('user.id = :userId', {
                    userId,
                })
                .andWhere(
                    'role.is_active = true',
                )
                .andWhere(
                    'permission.is_active = true',
                )
                .andWhere(
                    'permission.code IN (:...permissions)',
                    {
                        permissions: targetCodes,
                    },
                )
                .getMany();

        const grantedPermissions =
            new Set(
                rolePermissions.map(
                    (rolePermission) =>
                        rolePermission.permission.code,
                ),
            );

        const hasAllRequired =
            !requiredPermissions?.length ||
            requiredPermissions.every(
                (permission) =>
                    grantedPermissions.has(permission),
            );

        const hasAnyRequired =
            !anyPermissions?.length ||
            anyPermissions.some(
                (permission) =>
                    grantedPermissions.has(permission),
            );

        if (!hasAllRequired || !hasAnyRequired) {
            throw new ForbiddenException(
                'You do not have permission to perform this action',
            );
        }

        return true;
    }
}