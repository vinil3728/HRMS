import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Employee } from '../entities/employee.entity';
import { EmployeeProfileDetails } from '../entities/employee-profile-details.entity';

import { CreateEmployeeProfileDetailsDto } from '../dto/create-employee-profile-details.dto';
import { UpdateEmployeeProfileDetailsDto } from '../dto/update-employee-profile-details.dto';

@Injectable()
export class EmployeeProfileDetailsService {
    constructor(
        @InjectRepository(EmployeeProfileDetails)
        private readonly profileRepository: Repository<EmployeeProfileDetails>,

        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,
    ) {}

    async create(
        employeeId: string,
        dto: CreateEmployeeProfileDetailsDto,
    ): Promise<EmployeeProfileDetails> {
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

        const existingProfile =
            await this.profileRepository.findOne({
                where: {
                    employee: {
                        id: employeeId,
                    },
                },
            });

        if (existingProfile) {
            throw new ConflictException(
                'Employee profile details already exist',
            );
        }

        const profile =
            this.profileRepository.create({
                employee,
                dateOfBirth: dto.dateOfBirth
                    ? new Date(dto.dateOfBirth)
                    : null,
                gender: dto.gender ?? null,
                maritalStatus:
                    dto.maritalStatus ?? null,
                bloodGroup:
                    dto.bloodGroup ?? null,
                nationality:
                    dto.nationality ?? null,
                personalEmail:
                    dto.personalEmail ?? null,
                alternatePhone:
                    dto.alternatePhone ?? null,
                addressLine1:
                    dto.addressLine1 ?? null,
                addressLine2:
                    dto.addressLine2 ?? null,
                city: dto.city ?? null,
                state: dto.state ?? null,
                country: dto.country ?? null,
                postalCode:
                    dto.postalCode ?? null,
                emergencyContactName:
                    dto.emergencyContactName ?? null,
                emergencyContactRelationship:
                    dto.emergencyContactRelationship ?? null,
                emergencyContactPhone:
                    dto.emergencyContactPhone ?? null,
            });

        return this.profileRepository.save(profile);
    }

    async findOne(
        employeeId: string,
    ): Promise<EmployeeProfileDetails> {
        const profile =
            await this.profileRepository.findOne({
                where: {
                    employee: {
                        id: employeeId,
                    },
                },
                relations: {
                    employee: true,
                },
            });

        if (!profile) {
            throw new NotFoundException(
                'Employee profile details not found',
            );
        }

        return profile;
    }

    async update(
        employeeId: string,
        dto: UpdateEmployeeProfileDetailsDto,
    ): Promise<EmployeeProfileDetails> {
        const profile =
            await this.findOne(employeeId);

        if (dto.dateOfBirth !== undefined) {
            profile.dateOfBirth =
                dto.dateOfBirth
                    ? new Date(dto.dateOfBirth)
                    : null;
        }

        if (dto.gender !== undefined) {
            profile.gender = dto.gender;
        }

        if (dto.maritalStatus !== undefined) {
            profile.maritalStatus =
                dto.maritalStatus;
        }

        if (dto.bloodGroup !== undefined) {
            profile.bloodGroup =
                dto.bloodGroup;
        }

        if (dto.nationality !== undefined) {
            profile.nationality =
                dto.nationality;
        }

        if (dto.personalEmail !== undefined) {
            profile.personalEmail =
                dto.personalEmail;
        }

        if (dto.alternatePhone !== undefined) {
            profile.alternatePhone =
                dto.alternatePhone;
        }

        if (dto.addressLine1 !== undefined) {
            profile.addressLine1 =
                dto.addressLine1;
        }

        if (dto.addressLine2 !== undefined) {
            profile.addressLine2 =
                dto.addressLine2;
        }

        if (dto.city !== undefined) {
            profile.city = dto.city;
        }

        if (dto.state !== undefined) {
            profile.state = dto.state;
        }

        if (dto.country !== undefined) {
            profile.country = dto.country;
        }

        if (dto.postalCode !== undefined) {
            profile.postalCode =
                dto.postalCode;
        }

        if (
            dto.emergencyContactName !==
            undefined
        ) {
            profile.emergencyContactName =
                dto.emergencyContactName;
        }

        if (
            dto.emergencyContactRelationship !==
            undefined
        ) {
            profile.emergencyContactRelationship =
                dto.emergencyContactRelationship;
        }

        if (
            dto.emergencyContactPhone !==
            undefined
        ) {
            profile.emergencyContactPhone =
                dto.emergencyContactPhone;
        }

        return this.profileRepository.save(
            profile,
        );
    }
}
