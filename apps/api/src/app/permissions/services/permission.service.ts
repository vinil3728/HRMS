import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PermissionEntity } from '../entities/permission.entity';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';

@Injectable()
export class PermissionService {
    constructor(
        @InjectRepository(PermissionEntity)
        private readonly permissionRepository: Repository<PermissionEntity>,
    ) { }

    async findAll(includeInactive = false): Promise<PermissionEntity[]> {
        const whereClause = includeInactive ? {} : { isActive: true };

        return this.permissionRepository.find({
            where: whereClause,
            order: {
                module: 'ASC',
                name: 'ASC',
            },
        });
    }

    async findById(id: string): Promise<PermissionEntity> {
        const permission =
            await this.permissionRepository.findOne({
                where: { id },
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

        const permission = this.permissionRepository.create({
            code,
            name,
            module: dto.module.trim(),
            description: dto.description?.trim() ?? null,
            isActive: true,
        });

        return this.permissionRepository.save(permission);
    }

    async update(
        id: string,
        dto: UpdatePermissionDto,
    ): Promise<PermissionEntity> {
        const permission = await this.findById(id);

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

        if (dto.module) {
            permission.module = dto.module.trim();
        }

        if (dto.description !== undefined) {
            permission.description = dto.description?.trim() ?? null;
        }

        return this.permissionRepository.save(permission);
    }

    async activate(id: string): Promise<PermissionEntity> {
        const permission = await this.findById(id);
        permission.isActive = true;
        return this.permissionRepository.save(permission);
    }

    async deactivate(id: string): Promise<PermissionEntity> {
        const permission = await this.findById(id);
        permission.isActive = false;
        return this.permissionRepository.save(permission);
    }
}