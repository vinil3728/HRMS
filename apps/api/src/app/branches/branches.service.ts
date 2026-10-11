import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async create(dto: CreateBranchDto): Promise<Branch> {
    const existing = await this.branchRepository.findOne({
      where: [
        { name: dto.name },
        { code: dto.code },
      ],
    });

    if (existing) {
      throw new ConflictException('Branch name or code already exists');
    }

    const branch = this.branchRepository.create(dto);
    return this.branchRepository.save(branch);
  }

  async findAll(search?: string, isActive?: boolean): Promise<Branch[]> {
    const queryBuilder = this.branchRepository
      .createQueryBuilder('branch')
      .leftJoinAndSelect('branch.departments', 'department')
      .leftJoinAndSelect('department.designations', 'designation')
      .orderBy('branch.name', 'ASC');

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(branch.name) LIKE :term OR LOWER(branch.code) LIKE :term OR LOWER(branch.city) LIKE :term OR LOWER(branch.state) LIKE :term)',
        { term }
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('branch.isActive = :isActive', { isActive });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchRepository.findOne({
      where: { id },
      relations: {
        departments: {
          designations: true,
        },
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);

    if (dto.name || dto.code) {
      const duplicate = await this.branchRepository.findOne({
        where: [
          ...(dto.name ? [{ name: dto.name }] : []),
          ...(dto.code ? [{ code: dto.code }] : []),
        ],
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('Branch name or code already exists');
      }
    }

    Object.assign(branch, dto);
    return this.branchRepository.save(branch);
  }

  async toggleStatus(id: string, isActive: boolean): Promise<Branch> {
    const branch = await this.findOne(id);
    branch.isActive = isActive;
    return this.branchRepository.save(branch);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const branch = await this.findOne(id);

    // If departments are assigned, soft deactivate to preserve historical integrity
    if (branch.departments && branch.departments.length > 0) {
      branch.isActive = false;
      await this.branchRepository.save(branch);
      return {
        success: true,
        message: 'Branch has subordinate departments; deactivated successfully to preserve organizational structure.',
      };
    }

    await this.branchRepository.remove(branch);
    return { success: true, message: 'Branch removed successfully.' };
  }
}
