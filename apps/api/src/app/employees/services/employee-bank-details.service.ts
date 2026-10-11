import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Employee } from '../entities/employee.entity';
import { EmployeeBankDetails } from '../entities/employee-bank-details.entity';

import { CreateEmployeeBankDetailsDto } from '../dto/create-employee-bank-details.dto';
import { UpdateEmployeeBankDetailsDto } from '../dto/update-employee-bank-details.dto';

@Injectable()
export class EmployeeBankDetailsService {
    constructor(
        @InjectRepository(EmployeeBankDetails)
        private readonly bankRepository: Repository<EmployeeBankDetails>,

        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,
    ) {}

    async create(
        employeeId: string,
        dto: CreateEmployeeBankDetailsDto,
    ): Promise<EmployeeBankDetails> {
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

        const existingBankDetails =
            await this.bankRepository.findOne({
                where: {
                    employee: {
                        id: employeeId,
                    },
                },
            });

        if (existingBankDetails) {
            throw new ConflictException(
                'Employee bank details already exist',
            );
        }

        const bankDetails =
            this.bankRepository.create({
                employee,

                accountHolderName:
                    dto.accountHolderName.trim(),

                accountNumber:
                    dto.accountNumber.trim(),

                ifscCode:
                    dto.ifscCode.trim().toUpperCase(),

                bankName:
                    dto.bankName.trim(),

                branchName:
                    dto.branchName.trim(),
            });

        return this.bankRepository.save(
            bankDetails,
        );
    }

    async findOne(
        employeeId: string,
    ): Promise<EmployeeBankDetails> {
        const bankDetails =
            await this.bankRepository.findOne({
                where: {
                    employee: {
                        id: employeeId,
                    },
                },
                relations: {
                    employee: true,
                },
            });

        if (!bankDetails) {
            throw new NotFoundException(
                'Employee bank details not found',
            );
        }

        return bankDetails;
    }

    async update(
        employeeId: string,
        dto: UpdateEmployeeBankDetailsDto,
    ): Promise<EmployeeBankDetails> {
        const bankDetails =
            await this.findOne(employeeId);

        if (
            dto.accountHolderName !==
            undefined
        ) {
            bankDetails.accountHolderName =
                dto.accountHolderName.trim();
        }

        if (
            dto.accountNumber !==
            undefined
        ) {
            bankDetails.accountNumber =
                dto.accountNumber.trim();
        }

        if (
            dto.ifscCode !== undefined
        ) {
            bankDetails.ifscCode =
                dto.ifscCode
                    .trim()
                    .toUpperCase();
        }

        if (
            dto.bankName !== undefined
        ) {
            bankDetails.bankName =
                dto.bankName.trim();
        }

        if (
            dto.branchName !== undefined
        ) {
            bankDetails.branchName =
                dto.branchName.trim();
        }

        return this.bankRepository.save(
            bankDetails,
        );
    }
}
