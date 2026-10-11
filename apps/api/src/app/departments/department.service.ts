import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Department } from './entities/department.entity';
import { Branch } from '../branches/entities/branch.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.departmentRepository.findOne({
      where: [
        { name: dto.name },
        { code: dto.code },
      ],
    });

    if (existing) {
      throw new ConflictException(
        'Department name or code already exists',
      );
    }

    if (dto.branchId) {
      const branch = await this.branchRepository.findOne({
        where: { id: dto.branchId },
      });
      if (!branch) {
        throw new NotFoundException('Branch not found');
      }
    }

    const department = this.departmentRepository.create(dto);

    return this.departmentRepository.save(department);
  }

  async findAll(branchId?: string): Promise<Department[]> {
    const whereClause = branchId ? { branchId } : {};

    return this.departmentRepository.find({
      where: whereClause,
      relations: {
        designations: true,
        branch: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: {
        designations: true,
        branch: true,
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department = await this.findOne(id);

    if (dto.name || dto.code) {
      const duplicate = await this.departmentRepository.findOne({
        where: [
          ...(dto.name ? [{ name: dto.name }] : []),
          ...(dto.code ? [{ code: dto.code }] : []),
        ],
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          'Department name or code already exists',
        );
      }
    }

    if (dto.branchId !== undefined) {
      if (dto.branchId === null || dto.branchId === '') {
        department.branchId = null;
        department.branch = null;
      } else {
        const branch = await this.branchRepository.findOne({
          where: { id: dto.branchId },
        });
        if (!branch) {
          throw new NotFoundException('Branch not found');
        }
        department.branchId = dto.branchId;
      }
    }

    if (dto.name !== undefined) department.name = dto.name;
    if (dto.code !== undefined) department.code = dto.code;
    if (dto.isActive !== undefined) department.isActive = dto.isActive;

    return this.departmentRepository.save(department);
  }
}