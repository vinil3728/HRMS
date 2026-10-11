import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Employee } from '../entities/employee.entity';
import { EmployeeIdentityDetails } from '../entities/employee-identity-details.entity';

import { CreateEmployeeIdentityDetailsDto } from '../dto/create-employee-identity-details.dto';
import { UpdateEmployeeIdentityDetailsDto } from '../dto/update-employee-identity-details.dto';

@Injectable()
export class EmployeeIdentityDetailsService {
    constructor(
        @InjectRepository(EmployeeIdentityDetails)
        private readonly identityRepository: Repository<EmployeeIdentityDetails>,

        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,
    ) {}

    async create(
        employeeId: string,
        dto: CreateEmployeeIdentityDetailsDto,
    ): Promise<EmployeeIdentityDetails> {
        const employee =
            await this.employeeRepository.findOne({
                where: {
                    id: employeeId,
                },
            });

        if (!employee) {
            throw new NotFoundException(
                'Employee not found',
            );
        }

        const existingIdentity =
            await this.identityRepository.findOne({
                where: {
                    employee: {
                        id: employeeId,
                    },
                },
            });

        if (existingIdentity) {
            throw new ConflictException(
                'Employee identity details already exist',
            );
        }

        const identity =
            this.identityRepository.create({
                employee,
                aadhaarNumber:
                    dto.aadhaarNumber ?? null,
                panNumber:
                    dto.panNumber?.toUpperCase() ??
                    null,
            });

        return this.identityRepository.save(
            identity,
        );
    }

    async findOne(
        employeeId: string,
    ): Promise<EmployeeIdentityDetails> {
        const identity =
            await this.identityRepository.findOne({
                where: {
                    employee: {
                        id: employeeId,
                    },
                },
                relations: {
                    employee: true,
                },
            });

        if (!identity) {
            throw new NotFoundException(
                'Employee identity details not found',
            );
        }

        return identity;
    }

    async update(
        employeeId: string,
        dto: UpdateEmployeeIdentityDetailsDto,
    ): Promise<EmployeeIdentityDetails> {
        const identity =
            await this.findOne(employeeId);

        if (
            dto.aadhaarNumber !== undefined
        ) {
            identity.aadhaarNumber =
                dto.aadhaarNumber;
        }

        if (
            dto.panNumber !== undefined
        ) {
            identity.panNumber =
                dto.panNumber
                    ? dto.panNumber.toUpperCase()
                    : null;
        }

        return this.identityRepository.save(
            identity,
        );
    }
}