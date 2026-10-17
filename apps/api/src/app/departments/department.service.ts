import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Department } from './entities/department.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Designation } from '../designations/entities/designation.entity';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeeStatus } from '../employees/enums/employee-status.enum';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Designation)
    private readonly designationRepository: Repository<Designation>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
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
      if (!branch.isActive && dto.isActive !== false) {
        throw new BadRequestException(
          'Cannot create an active department under an inactive branch. Please activate the branch first.',
        );
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

    const statusChanged = dto.isActive !== undefined && dto.isActive !== department.isActive;
    if (dto.isActive !== undefined) department.isActive = dto.isActive;

    await this.departmentRepository.save(department);

    if (statusChanged) {
      if (!department.isActive) {
        // ── 1. DEACTIVATE DEPARTMENT HIERARCHY ──────────────────────────
        // Deactivate all designations under this department
        await this.designationRepository
          .createQueryBuilder()
          .update(Designation)
          .set({ isActive: false })
          .where('departmentId = :id', { id })
          .execute();

        // Deactivate active employees in this department (preserve resigned/inactive)
        await this.employeeRepository
          .createQueryBuilder()
          .update(Employee)
          .set({ status: EmployeeStatus.INACTIVE })
          .where('department_id = :id', { id })
          .andWhere('status = :activeStatus', { activeStatus: EmployeeStatus.ACTIVE })
          .execute();

        // Rule 8: If all departments in the branch are now deactivated, deactivate branch
        if (department.branchId) {
          const activeDeptsInBranch = await this.departmentRepository.count({
            where: {
              branchId: department.branchId,
              isActive: true,
            },
          });
          if (activeDeptsInBranch === 0) {
            await this.branchRepository.update(department.branchId, { isActive: false });
          }
        }
      } else {
        // ── 2. ACTIVATE DEPARTMENT HIERARCHY ────────────────────────────
        // Rule 2 & 9: Ensure parent branch is active (activate parent branch if inactive)
        if (department.branchId) {
          const branch = await this.branchRepository.findOne({
            where: { id: department.branchId },
          });
          if (branch && !branch.isActive) {
            branch.isActive = true;
            await this.branchRepository.save(branch);
          }
        }

        // Activate all associated designations under this department
        await this.designationRepository
          .createQueryBuilder()
          .update(Designation)
          .set({ isActive: true })
          .where('departmentId = :id', { id })
          .execute();
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const department = await this.findOne(id);

    const designationsCount = await this.designationRepository.count({
      where: { departmentId: id },
    });
    const employeesCount = await this.employeeRepository.count({
      where: { department: { id } },
    });

    if (designationsCount > 0 || employeesCount > 0) {
      await this.update(id, { isActive: false });
      return {
        success: true,
        message: 'Department has subordinate designations/records; deactivated successfully to preserve organizational structure.',
      };
    }

    await this.departmentRepository.remove(department);
    return { success: true, message: 'Department removed successfully.' };
  }
}