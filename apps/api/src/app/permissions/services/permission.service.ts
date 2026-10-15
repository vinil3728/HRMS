import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { PermissionEntity } from '../entities/permission.entity';
import { ModuleEntity } from '../../modules/entities/module.entity';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';

@Injectable()
export class PermissionService {
    constructor(
        @InjectRepository(PermissionEntity)
        private readonly permissionRepository: Repository<PermissionEntity>,

        @InjectRepository(ModuleEntity)
        private readonly moduleRepository: Repository<ModuleEntity>,

        private readonly dataSource: DataSource,
    ) { }

    async findAll(includeInactive = false): Promise<PermissionEntity[]> {
        const whereClause = includeInactive ? {} : { isActive: true };

        return this.permissionRepository.find({
            where: whereClause,
            relations: {
                module: true,
            },
            order: {
                module: {
                    name: 'ASC',
                },
                name: 'ASC',
            },
        });
    }

    async findById(id: string): Promise<PermissionEntity> {
        const permission =
            await this.permissionRepository.findOne({
                where: { id },
                relations: {
                    module: true,
                },
            });

        if (!permission) {
            throw new NotFoundException(
                `Permission with id "${id}" not found`,
            );
        }

        return permission;
    }

    async findByCode(
        code: string,
    ): Promise<PermissionEntity | null> {
        return this.permissionRepository.findOne({
            where: {
                code,
                isActive: true,
            },
            relations: {
                module: true,
            },
        });
    }

    async create(dto: CreatePermissionDto): Promise<PermissionEntity> {
        const code = dto.code.trim().toUpperCase();
        const name = dto.name.trim();

        const existing = await this.permissionRepository.findOne({
            where: [{ code }, { name }],
        });

        if (existing) {
            throw new BadRequestException(
                'A permission with the same code or name already exists',
            );
        }

        let targetModuleId = dto.moduleId;
        if (!targetModuleId && dto.module) {
            const foundModule = await this.moduleRepository.findOne({
                where: [
                    { id: dto.module },
                    { name: dto.module.trim() },
                    { code: dto.module.trim().toUpperCase() },
                ],
            });
            if (foundModule) {
                targetModuleId = foundModule.id;
            }
        }

        if (!targetModuleId) {
            throw new BadRequestException('A valid module must be selected');
        }

        const moduleEntity = await this.moduleRepository.findOne({
            where: { id: targetModuleId },
        });

        if (!moduleEntity) {
            throw new NotFoundException(
                `Module with id "${targetModuleId}" not found`,
            );
        }

        const permission = this.permissionRepository.create({
            code,
            name,
            moduleId: moduleEntity.id,
            module: moduleEntity,
            description: dto.description?.trim() ?? null,
            scopes: dto.scopes?.trim() || 'SELF',
            isActive: true,
        });

        const saved = await this.permissionRepository.save(permission);

        if (!moduleEntity.isActive || moduleEntity.isDeleted) {
            moduleEntity.isActive = true;
            moduleEntity.isDeleted = false;
            await this.moduleRepository.save(moduleEntity);
        }

        return this.findById(saved.id);
    }

    async update(
        id: string,
        dto: UpdatePermissionDto,
    ): Promise<PermissionEntity> {
        const permission = await this.findById(id);

        if (permission.isDeleted) {
            throw new BadRequestException(
                'Cannot update a deleted permission. Please activate it first.',
            );
        }

        if (permission.module && permission.module.isDeleted) {
            throw new BadRequestException(
                'Cannot modify permission because its associated module is deleted. Please activate the module first.',
            );
        }

        if (dto.code && dto.code.trim().toUpperCase() !== permission.code) {
            const newCode = dto.code.trim().toUpperCase();
            const existingCode = await this.permissionRepository.findOne({
                where: { code: newCode },
            });

            if (existingCode && existingCode.id !== id) {
                throw new BadRequestException(
                    'A permission with the same code already exists',
                );
            }
            permission.code = newCode;
        }

        if (dto.name && dto.name.trim() !== permission.name) {
            const newName = dto.name.trim();
            const existingName = await this.permissionRepository.findOne({
                where: { name: newName },
            });

            if (existingName && existingName.id !== id) {
                throw new BadRequestException(
                    'A permission with the same name already exists',
                );
            }
            permission.name = newName;
        }

        if (dto.moduleId || dto.module) {
            let targetModuleId = dto.moduleId;
            if (!targetModuleId && dto.module) {
                const foundModule = await this.moduleRepository.findOne({
                    where: [
                        { id: dto.module },
                        { name: dto.module.trim() },
                        { code: dto.module.trim().toUpperCase() },
                    ],
                });
                if (foundModule) {
                    targetModuleId = foundModule.id;
                }
            }

            if (!targetModuleId) {
                throw new BadRequestException(
                    'A valid module must be selected',
                );
            }

            const moduleEntity = await this.moduleRepository.findOne({
                where: { id: targetModuleId },
            });

            if (!moduleEntity) {
                throw new NotFoundException(
                    `Module with id "${targetModuleId}" not found`,
                );
            }

            permission.moduleId = moduleEntity.id;
            permission.module = moduleEntity;
        }

        if (dto.description !== undefined) {
            permission.description = dto.description?.trim() ?? null;
        }

        if (dto.scopes !== undefined) {
            permission.scopes = dto.scopes?.trim() || 'SELF';
        }

        await this.permissionRepository.save(permission);

        if (permission.moduleId && permission.isActive) {
            const module = await this.moduleRepository.findOne({
                where: { id: permission.moduleId },
            });
            if (module && (!module.isActive || module.isDeleted)) {
                module.isActive = true;
                module.isDeleted = false;
                await this.moduleRepository.save(module);
            }
        }

        return this.findById(id);
    }

    async activate(id: string): Promise<PermissionEntity> {
        const permission = await this.findById(id);

        if (permission.module && permission.module.isDeleted) {
            throw new BadRequestException(
                'Cannot modify permission because its associated module is deleted. Please activate the module first.',
            );
        }

        permission.isActive = true;
        permission.isDeleted = false;
        await this.permissionRepository.save(permission);

        if (permission.moduleId) {
            const module = await this.moduleRepository.findOne({
                where: { id: permission.moduleId },
            });
            if (module && (!module.isActive || module.isDeleted)) {
                module.isActive = true;
                module.isDeleted = false;
                await this.moduleRepository.save(module);
            }
        }

        return this.findById(id);
    }

    async deactivate(id: string): Promise<PermissionEntity> {
        const permission = await this.findById(id);

        if (permission.isDeleted) {
            throw new BadRequestException(
                'Cannot deactivate a deleted permission.',
            );
        }

        if (permission.module && permission.module.isDeleted) {
            throw new BadRequestException(
                'Cannot modify permission because its associated module is deleted. Please activate the module first.',
            );
        }

        permission.isActive = false;
        await this.permissionRepository.save(permission);
        return this.findById(id);
    }

    async remove(id: string): Promise<{ success: boolean; message: string; permission: PermissionEntity }> {
        const permission = await this.findById(id);

        if (permission.module && permission.module.isDeleted) {
            throw new BadRequestException(
                'Cannot delete permission because its associated module is already deleted.',
            );
        }

        await this.dataSource.transaction(async (manager) => {
            // Soft delete the permission
            permission.isDeleted = true;
            permission.isActive = false;
            await manager.save(PermissionEntity, permission);

            // Check if all permissions of this specific module are now deleted
            if (permission.moduleId) {
                const remainingNonDeletedCount = await manager.count(
                    PermissionEntity,
                    {
                        where: {
                            moduleId: permission.moduleId,
                            isDeleted: false,
                        },
                    },
                );

                if (remainingNonDeletedCount === 0) {
                    await manager.update(
                        ModuleEntity,
                        { id: permission.moduleId },
                        {
                            isDeleted: true,
                            isActive: false,
                        },
                    );
                }
            }
        });

        const updated = await this.findById(id);
        return {
            success: true,
            message: `Permission "${permission.name}" deleted successfully.`,
            permission: updated,
        };
    }
}