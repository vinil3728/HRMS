import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Designation } from './entities/designation.entity';
import { Department } from '../departments/entities/department.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeeStatus } from '../employees/enums/employee-status.enum';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

@Injectable()
export class DesignationService {
  constructor(
    @InjectRepository(Designation)
    private readonly designationRepository: Repository<Designation>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(dto: CreateDesignationDto): Promise<Designation> {
    const existing = await this.designationRepository.findOne({
      where: [
        { name: dto.name },
        { code: dto.code },
      ],
    });

    if (existing) {
      throw new ConflictException(
        'Designation name or code already exists',
      );
    }

    if (dto.departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: dto.departmentId },
        relations: { branch: true },
      });
      if (!department) {
        throw new NotFoundException('Department not found');
      }
      if (!department.isActive && dto.isActive !== false) {
        throw new BadRequestException(
          'Cannot create an active designation under an inactive department. Please activate the department first.',
        );
      }
      if (department.branch && !department.branch.isActive && dto.isActive !== false) {
        throw new BadRequestException(
          'Cannot create an active designation under a department whose branch is inactive.',
        );
      }
    }

    const designation = this.designationRepository.create(dto);
    const saved = await this.designationRepository.save(designation);

    return this.findOne(saved.id);
  }

  async findAll(departmentId?: string): Promise<Designation[]> {
    return this.designationRepository.find({
      where: departmentId ? { departmentId } : {},
      relations: {
        department: true,
        employees: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Designation> {
    const designation = await this.designationRepository.findOne({
      where: { id },
      relations: {
        department: { branch: true },
        employees: true,
      },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    return designation;
  }

  async update(
    id: string,
    dto: UpdateDesignationDto,
  ): Promise<Designation> {
    const designation = await this.findOne(id);

    if (dto.name || dto.code) {
      const duplicate = await this.designationRepository.findOne({
        where: [
          ...(dto.name ? [{ name: dto.name }] : []),
          ...(dto.code ? [{ code: dto.code }] : []),
        ],
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          'Designation name or code already exists',
        );
      }
    }

    if (dto.departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: dto.departmentId },
      });
      if (!department) {
        throw new NotFoundException('Department not found');
      }
      designation.departmentId = dto.departmentId;
    } else if (dto.departmentId === null) {
      designation.departmentId = null;
      designation.department = null;
    }

    if (dto.name !== undefined) designation.name = dto.name;
    if (dto.code !== undefined) designation.code = dto.code;

    const statusChanged = dto.isActive !== undefined && dto.isActive !== designation.isActive;
    if (dto.isActive !== undefined) designation.isActive = dto.isActive;

    await this.designationRepository.save(designation);

    if (statusChanged) {
      if (!designation.isActive) {
        // ── 1. DEACTIVATE DESIGNATION HIERARCHY ──────────────────────────
        // Deactivate active employees with this designation (preserve resigned/inactive)
        await this.employeeRepository
          .createQueryBuilder()
          .update(Employee)
          .set({ status: EmployeeStatus.INACTIVE })
          .where('designation_id = :id', { id })
          .andWhere('status = :activeStatus', { activeStatus: EmployeeStatus.ACTIVE })
          .execute();

        // Rules 3, 5, 6: Check other designations in the department
        // "Deactivate one designation | Other designations remain active | Department remains active"
        // "Deactivate one designation | All other designations are already inactive | Department deactivates"
        if (designation.departmentId) {
          const activeDesigCount = await this.designationRepository.count({
            where: {
              departmentId: designation.departmentId,
              isActive: true,
            },
          });

          if (activeDesigCount === 0) {
            // Deactivate parent department
            const dept = await this.departmentRepository.findOne({
              where: { id: designation.departmentId },
            });
            if (dept && dept.isActive) {
              dept.isActive = false;
              await this.departmentRepository.save(dept);

              // Rule 8: If no active departments remain in the branch, deactivate branch
              if (dept.branchId) {
                const activeDeptCount = await this.departmentRepository.count({
                  where: {
                    branchId: dept.branchId,
                    isActive: true,
                  },
                });
                if (activeDeptCount === 0) {
                  await this.branchRepository.update(dept.branchId, { isActive: false });
                }
              }
            }
          }
        }
      } else {
        // ── 2. ACTIVATE DESIGNATION HIERARCHY ────────────────────────────
        // Rules 3 & 7: Ensure department and branch are active
        // "Activate one designation | Department is inactive | Activate the department first, then the designation"
        // "Activate one designation | Branch is inactive | Branch must be activated first, followed by the department and designation"
        if (designation.departmentId) {
          const dept = await this.departmentRepository.findOne({
            where: { id: designation.departmentId },
          });
          if (dept) {
            // Activate branch if inactive
            if (dept.branchId) {
              const branch = await this.branchRepository.findOne({
                where: { id: dept.branchId },
              });
              if (branch && !branch.isActive) {
                branch.isActive = true;
                await this.branchRepository.save(branch);
              }
            }
            // Activate department if inactive
            if (!dept.isActive) {
              dept.isActive = true;
              await this.departmentRepository.save(dept);
            }
          }
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const designation = await this.findOne(id);

    const employeesCount = await this.employeeRepository.count({
      where: { designation: { id } },
    });

    if (employeesCount > 0) {
      await this.update(id, { isActive: false });
      return {
        success: true,
        message: 'Designation has assigned employees; deactivated successfully to preserve records.',
      };
    }

    await this.designationRepository.remove(designation);
    return { success: true, message: 'Designation removed successfully.' };
  }
}