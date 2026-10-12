import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Role } from '../entities/role.entity';
import { PermissionEntity } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,

        @InjectRepository(PermissionEntity)
        private readonly permissionRepository: Repository<PermissionEntity>,

        @InjectRepository(RolePermission)
        private readonly rolePermissionRepository: Repository<RolePermission>,
    ) { }

    async findAll(includeInactive = true): Promise<Role[]> {
        const whereClause = includeInactive ? {} : { isActive: true, isDeleted: false };
        return this.roleRepository.find({
            where: whereClause,
            relations: {
                rolePermissions: {
                    permission: {
                        module: true,
                    },
                },
            },
            order: {
                name: 'ASC',
            },
        });
    }

    async findById(id: string): Promise<Role> {
        const role = await this.roleRepository.findOne({
            where: { id },
            relations: {
                rolePermissions: {
                    permission: {
                        module: true,
                    },
                },
            },
        });

        if (!role) {
            throw new NotFoundException(
                `Role with id "${id}" not found`,
            );
        }

        return role;
    }

    async findByCode(code: string): Promise<Role | null> {
        return this.roleRepository.findOne({
            where: {
                code,
            },
        });
    }

    async create(data: {
        name: string;
        code: string;
        description?: string | null;
        permissionIds?: string[];
    }): Promise<Role> {
        const existingRole = await this.roleRepository.findOne({
            where: [
                { name: data.name },
                { code: data.code },
            ],
        });

        if (existingRole) {
            throw new BadRequestException(
                'A role with the same name or code already exists',
            );
        }

        const role = this.roleRepository.create({
            name: data.name,
            code: data.code,
            description: data.description ?? null,
            isSystemRole: false,
            isActive: true,
            isDeleted: false,
        });

        const savedRole = await this.roleRepository.save(role);

        if (data.permissionIds?.length) {
            await this.assignPermissions(
                savedRole.id,
                data.permissionIds,
            );
        }

        return this.findById(savedRole.id);
    }

    async update(
        id: string,
        data: {
            name?: string;
            code?: string;
            description?: string | null;
        },
    ): Promise<Role> {
        const role = await this.findById(id);

        if (role.isDeleted) {
            throw new BadRequestException(
                'Cannot edit a deleted role',
            );
        }

        if (
            role.isSystemRole &&
            data.code &&
            data.code !== role.code
        ) {
            throw new BadRequestException(
                'System role code cannot be changed',
            );
        }

        if (data.name && data.name !== role.name) {
            const existingRole =
                await this.roleRepository.findOne({
                    where: {
                        name: data.name,
                    },
                });

            if (existingRole && existingRole.id !== id) {
                throw new BadRequestException(
                    'A role with the same name already exists',
                );
            }
        }

        if (data.code && data.code !== role.code) {
            const existingRole =
                await this.roleRepository.findOne({
                    where: {
                        code: data.code,
                    },
                });

            if (existingRole && existingRole.id !== id) {
                throw new BadRequestException(
                    'A role with the same code already exists',
                );
            }
        }

        Object.assign(role, data);

        await this.roleRepository.save(role);

        return this.findById(id);
    }

    async deactivate(id: string): Promise<Role> {
        const role = await this.findById(id);

        if (role.isDeleted) {
            throw new BadRequestException(
                'Deleted role cannot be deactivated',
            );
        }

        role.isActive = false;

        await this.roleRepository.save(role);

        return role;
    }

    async activate(id: string): Promise<Role> {
        const role = await this.findById(id);

        role.isActive = true;
        role.isDeleted = false;

        await this.roleRepository.save(role);

        return role;
    }

    async remove(id: string): Promise<Role> {
        const role = await this.findById(id);

        if (role.isSystemRole) {
            throw new BadRequestException(
                'System roles cannot be deleted',
            );
        }

        role.isDeleted = true;
        role.isActive = false;

        await this.roleRepository.save(role);

        return role;
    }

    async assignPermissions(
        roleId: string,
        permissionIds: string[],
    ): Promise<Role> {
        const role = await this.findById(roleId);

        if (!permissionIds.length) {
            await this.rolePermissionRepository.delete({
                role: {
                    id: roleId,
                },
            });

            return this.findById(roleId);
        }

        const uniquePermissionIds = [
            ...new Set(permissionIds),
        ];

        const permissions =
            await this.permissionRepository.find({
                where: {
                    id: In(uniquePermissionIds),
                    isActive: true,
                },
            });

        if (
            permissions.length !== uniquePermissionIds.length
        ) {
            throw new BadRequestException(
                'One or more permission IDs are invalid or inactive',
            );
        }

        await this.rolePermissionRepository.delete({
            role: {
                id: roleId,
            },
        });

        const rolePermissions =
            permissions.map((permission) =>
                this.rolePermissionRepository.create({
                    role,
                    permission,
                }),
            );

        await this.rolePermissionRepository.save(
            rolePermissions,
        );

        return this.findById(roleId);
    }

    async getPermissions(
        roleId: string,
    ): Promise<PermissionEntity[]> {
        const role = await this.findById(roleId);

        return role.rolePermissions
            .filter(
                (rolePermission) =>
                    rolePermission.permission.isActive,
            )
            .map(
                (rolePermission) =>
                    rolePermission.permission,
            );
    }
}