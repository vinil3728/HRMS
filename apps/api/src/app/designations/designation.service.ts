import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Designation } from './entities/designation.entity';
import { Department } from '../departments/entities/department.entity';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';

@Injectable()
export class DesignationService {
  constructor(
    @InjectRepository(Designation)
    private readonly designationRepository: Repository<Designation>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
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
      });
      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    const designation = this.designationRepository.create(dto);
    const saved = await this.designationRepository.save(designation);

    return this.findOne(saved.id);
  }

  async findAll(departmentId?: string): Promise<Designation[]> {
    return this.designationRepository.find({
      where: departmentId ? { departmentId } : {},
      relations: { department: true },
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Designation> {
    const designation = await this.designationRepository.findOne({
      where: { id },
      relations: { department: true },
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
    if (dto.isActive !== undefined) designation.isActive = dto.isActive;

    await this.designationRepository.save(designation);

    return this.findOne(id);
  }
}