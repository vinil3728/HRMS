import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PolicyAcknowledgement } from '../entities/policy-acknowledgement.entity';
import { PolicyStatus } from '../enums/policy-status.enum';

import { PolicyService } from './policy.service';
import { EmployeeService } from '../../employees/services/employee.service';

@Injectable()
export class PolicyAcknowledgementService {
  constructor(
    @InjectRepository(PolicyAcknowledgement)
    private readonly acknowledgementRepository: Repository<PolicyAcknowledgement>,

    private readonly employeeService: EmployeeService,

    private readonly policyService: PolicyService,
  ) {}

  async acknowledge(
    employeeId: string,
    policyId: string,
  ) {
    const employee =
      await this.employeeService.findOne(employeeId);

    if (!employee) {
      throw new NotFoundException(
        'Employee not found',
      );
    }

    const policy =
      await this.policyService.findOne(policyId);

    if (!policy) {
      throw new NotFoundException(
        'Policy not found',
      );
    }

    if (policy.status !== PolicyStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only PUBLISHED policies can be acknowledged',
      );
    }

    const existing =
      await this.acknowledgementRepository.findOne({
        where: {
          employee: { id: employeeId },
          policy: { id: policyId },
        },
      });

    if (existing) {
      throw new ConflictException(
        'Policy has already been acknowledged',
      );
    }

    const acknowledgement =
      this.acknowledgementRepository.create({
        employee,
        policy,
      });

    return this.acknowledgementRepository.save(
      acknowledgement,
    );
  }

  async getEmployeeAcknowledgements(
    employeeId: string,
  ) {
    await this.employeeService.findOne(employeeId);

    return this.acknowledgementRepository.find({
      where: {
        employee: { id: employeeId },
      },
      relations: {
        employee: true,
        policy: true,
      },
      order: {
        acknowledgedAt: 'DESC',
      },
    });
  }

  async getPolicyAcknowledgements(
    policyId: string,
  ) {
    await this.policyService.findOne(policyId);

    return this.acknowledgementRepository.find({
      where: {
        policy: { id: policyId },
      },
      relations: {
        employee: true,
        policy: true,
      },
      order: {
        acknowledgedAt: 'DESC',
      },
    });
  }

  async getEmployeePolicyStatus(
    employeeId: string,
    policyId: string,
  ) {
    await this.employeeService.findOne(employeeId);

    await this.policyService.findOne(policyId);

    const acknowledgement =
      await this.acknowledgementRepository.findOne({
        where: {
          employee: { id: employeeId },
          policy: { id: policyId },
        },
        relations: {
          employee: true,
          policy: true,
        },
      });

    return {
      employeeId,
      policyId,
      acknowledged: !!acknowledgement,
      acknowledgedAt:
        acknowledgement?.acknowledgedAt ?? null,
    };
  }
}
