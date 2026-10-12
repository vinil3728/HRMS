import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ModuleEntity } from './entities/module.entity';
import { PermissionEntity } from '../permissions/entities/permission.entity';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

@Injectable()
export class ModulesService {
    constructor(
        @InjectRepository(ModuleEntity)
        private readonly moduleRepository: Repository<ModuleEntity>,

        @InjectRepository(PermissionEntity)
        private readonly permissionRepository: Repository<PermissionEntity>,

        private readonly dataSource: DataSource,
    ) {}

    async findAll(search?: string, includeInactive = true): Promise<ModuleEntity[]> {
        const qb = this.moduleRepository
            .createQueryBuilder('module')
            .orderBy('module.name', 'ASC');

        if (!includeInactive) {
            qb.andWhere('module.isActive = :isActive', { isActive: true });
        }

        if (search && search.trim()) {
            const query = `%${search.trim().toLowerCase()}%`;
            qb.andWhere(
                '(LOWER(module.name) LIKE :query OR LOWER(module.code) LIKE :query OR LOWER(COALESCE(module.description, \'\')) LIKE :query)',
                { query },
            );
        }

        const modules = await qb.getMany();

        const counts = await this.permissionRepository
            .createQueryBuilder('permission')
            .select('permission.module_id', 'moduleId')
            .addSelect('COUNT(permission.id)', 'count')
            .groupBy('permission.module_id')
            .getRawMany<{ moduleId: string; count: string }>();

        const countMap = new Map<string, number>();
        for (const item of counts) {
            countMap.set(item.moduleId, parseInt(item.count, 10));
        }

        for (const mod of modules) {
            mod.permissionCount = countMap.get(mod.id) ?? 0;
        }

        return modules;
    }

    async findOne(id: string): Promise<ModuleEntity> {
        const module = await this.moduleRepository.findOne({
            where: { id },
            relations: {
                permissions: true,
            },
        });

        if (!module) {
            throw new NotFoundException(`Module with id "${id}" not found`);
        }

        module.permissionCount = module.permissions?.length ?? 0;
        return module;
    }

    async findByCode(code: string): Promise<ModuleEntity | null> {
        return this.moduleRepository.findOne({
            where: { code: code.trim().toUpperCase() },
        });
    }

    async findByName(name: string): Promise<ModuleEntity | null> {
        return this.moduleRepository.findOne({
            where: { name: name.trim() },
        });
    }

    async create(dto: CreateModuleDto): Promise<ModuleEntity> {
        const code = dto.code.trim().toUpperCase();
        const name = dto.name.trim();

        const existing = await this.moduleRepository.findOne({
            where: [
                { code, isDeleted: false },
                { name, isDeleted: false },
            ],
        });

        if (existing) {
            throw new ConflictException(
                'A module with the same code or name already exists',
            );
        }

        const module = this.moduleRepository.create({
            code,
            name,
            description: dto.description?.trim() ?? null,
            isActive: true,
            isDeleted: false,
        });

        const saved = await this.moduleRepository.save(module);
        saved.permissionCount = 0;
        return saved;
    }

    async update(id: string, dto: UpdateModuleDto): Promise<ModuleEntity> {
        const module = await this.findOne(id);

        if (module.isDeleted) {
            throw new BadRequestException(
                'Cannot edit a deleted module. Please activate it first.',
            );
        }

        if (dto.code && dto.code.trim().toUpperCase() !== module.code) {
            const newCode = dto.code.trim().toUpperCase();
            const existingCode = await this.moduleRepository.findOne({
                where: { code: newCode, isDeleted: false },
            });

            if (existingCode && existingCode.id !== id) {
                throw new ConflictException(
                    'A module with the same code already exists',
                );
            }
            module.code = newCode;
        }

        if (dto.name && dto.name.trim() !== module.name) {
            const newName = dto.name.trim();
            const existingName = await this.moduleRepository.findOne({
                where: { name: newName, isDeleted: false },
            });

            if (existingName && existingName.id !== id) {
                throw new ConflictException(
                    'A module with the same name already exists',
                );
            }
            module.name = newName;
        }

        if (dto.description !== undefined) {
            module.description = dto.description?.trim() ?? null;
        }

        await this.moduleRepository.save(module);
        return this.findOne(id);
    }

    async activate(id: string): Promise<ModuleEntity> {
        const module = await this.findOne(id);

        await this.dataSource.transaction(async (manager) => {
            // Activate module and restore if deleted
            await manager.update(ModuleEntity, { id }, {
                isActive: true,
                isDeleted: false,
            });

            // Automatically restore and activate all its associated permissions
            await manager.update(PermissionEntity, { moduleId: id }, {
                isDeleted: false,
                isActive: true,
            });
        });

        return this.findOne(id);
    }

    async deactivate(id: string): Promise<ModuleEntity> {
        const module = await this.findOne(id);

        await this.dataSource.transaction(async (manager) => {
            // Deactivate module
            await manager.update(ModuleEntity, { id }, { isActive: false });

            // Automatically deactivate all its associated permissions
            await manager.update(PermissionEntity, { moduleId: id }, {
                isActive: false,
            });
        });

        return this.findOne(id);
    }

    async remove(id: string): Promise<{ success: boolean; message: string }> {
        const module = await this.findOne(id);

        await this.dataSource.transaction(async (manager) => {
            // Mark module as deleted and inactive
            await manager.update(ModuleEntity, { id }, {
                isDeleted: true,
                isActive: false,
            });

            // Automatically mark all its associated permissions as deleted true and inactive
            await manager.update(PermissionEntity, { moduleId: id }, {
                isDeleted: true,
                isActive: false,
            });
        });

        return {
            success: true,
            message: `Module "${module.name}" deleted successfully.`,
        };
    }
}
