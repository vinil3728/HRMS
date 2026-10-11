import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Policy } from '../entities/policy.entity';
import { CreatePolicyDto } from '../dto/create-policy.dto';
import { PolicyStatus } from '../enums/policy-status.enum';
import { PolicyQueryDto } from '../dto/policy-query.dto';
import { UpdatePolicyDto } from '../dto/update-policy.dto';
import { RolePermission } from '../../permissions/entities/role-permission.entity';
import { Permission } from '../../permissions/enums/permission.enum';
import { User } from '../../../auth/entities/user.entity';

const POLICY_MANAGEMENT_PERMISSIONS: string[] = [
  Permission.POLICY_CREATE,
  Permission.POLICY_UPDATE,
  Permission.POLICY_DELETE,
  Permission.POLICY_PUBLISH,
  Permission.POLICY_ARCHIVE,
  Permission.POLICY_ACKNOWLEDGEMENT_POLICY_VIEW,
];

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async hasPolicyManagementAccess(userId: string): Promise<boolean> {
    if (!userId) return false;
    const count = await this.rolePermissionRepository
      .createQueryBuilder('rolePermission')
      .innerJoin('rolePermission.role', 'role')
      .innerJoin('rolePermission.permission', 'permission')
      .innerJoin(User, 'user', 'user.role_id = role.id')
      .where('user.id = :userId', { userId })
      .andWhere('role.is_active = true')
      .andWhere('permission.is_active = true')
      .andWhere('permission.code IN (:...codes)', {
        codes: POLICY_MANAGEMENT_PERMISSIONS,
      })
      .getCount();
    return count > 0;
  }

  async create(dto: CreatePolicyDto) {
    const existingTitle =
      await this.policyRepository.findOne({
        where: { title: dto.title },
      });

    if (existingTitle) {
      throw new ConflictException(
        'Policy title already exists',
      );
    }

    const existingCode =
      await this.policyRepository.findOne({
        where: { code: dto.code },
      });

    if (existingCode) {
      throw new ConflictException(
        'Policy code already exists',
      );
    }

    const policy = this.policyRepository.create({
      title: dto.title,
      code: dto.code,
      content: dto.content,
      version: dto.version ?? '1.0',
      status: PolicyStatus.DRAFT,
      effectiveDate: dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : null,
    });

    return this.policyRepository.save(policy);
  }

  async findAll(query: PolicyQueryDto, userId?: string) {
    const canManage = userId
      ? await this.hasPolicyManagementAccess(userId)
      : false;

    const queryBuilder =
      this.policyRepository.createQueryBuilder('policy');

    if (!canManage) {
      queryBuilder.where('policy.status = :pubStatus', {
        pubStatus: PolicyStatus.PUBLISHED,
      });
    } else if (query.status) {
      queryBuilder.where(
        'policy.status = :status',
        {
          status: query.status,
        },
      );
    }

    return queryBuilder
      .orderBy('policy.createdAt', 'DESC')
      .getMany();
  }

  async findOne(policyId: string) {
    const policy =
      await this.policyRepository.findOne({
        where: { id: policyId },
      });

    if (!policy) {
      throw new NotFoundException(
        'Policy not found',
      );
    }

    return policy;
  }

  async findOneForUser(policyId: string, userId: string) {
    const policy = await this.findOne(policyId);
    if (policy.status !== PolicyStatus.PUBLISHED) {
      const canManage = await this.hasPolicyManagementAccess(userId);
      if (!canManage) {
        throw new ForbiddenException(
          'You only have access to published policies',
        );
      }
    }
    return policy;
  }

  async update(
    policyId: string,
    dto: UpdatePolicyDto,
  ) {
    const policy = await this.findOne(policyId);

    if (policy.status !== PolicyStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT policies can be updated',
      );
    }

    if (
      dto.title !== undefined &&
      dto.title !== policy.title
    ) {
      const existing =
        await this.policyRepository.findOne({
          where: { title: dto.title },
        });

      if (existing && existing.id !== policy.id) {
        throw new ConflictException(
          'Policy title already exists',
        );
      }

      policy.title = dto.title;
    }

    if (
      dto.code !== undefined &&
      dto.code !== policy.code
    ) {
      const existing =
        await this.policyRepository.findOne({
          where: { code: dto.code },
        });

      if (existing && existing.id !== policy.id) {
        throw new ConflictException(
          'Policy code already exists',
        );
      }

      policy.code = dto.code;
    }

    if (dto.content !== undefined) {
      policy.content = dto.content;
    }

    if (dto.version !== undefined) {
      policy.version = dto.version;
    }

    if (dto.effectiveDate !== undefined) {
      policy.effectiveDate = dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : null;
    }

    return this.policyRepository.save(policy);
  }

  async remove(policyId: string) {
    const policy = await this.findOne(policyId);

    if (policy.status !== PolicyStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT policies can be deleted',
      );
    }

    await this.policyRepository.remove(policy);

    return {
      message: 'Policy deleted successfully',
    };
  }

  async publish(policyId: string) {
    const policy = await this.findOne(policyId);

    if (policy.status !== PolicyStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT policies can be published',
      );
    }

    if (!policy.content.trim()) {
      throw new BadRequestException(
        'Policy content is required before publishing',
      );
    }

    policy.status = PolicyStatus.PUBLISHED;

    if (!policy.effectiveDate) {
      policy.effectiveDate = new Date();
    }

    return this.policyRepository.save(policy);
  }

  async archive(policyId: string) {
    const policy = await this.findOne(policyId);

    if (policy.status !== PolicyStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only PUBLISHED policies can be archived',
      );
    }

    policy.status = PolicyStatus.ARCHIVED;

    return this.policyRepository.save(policy);
  }
}
