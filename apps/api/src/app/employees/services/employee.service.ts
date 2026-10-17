import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus } from '../enums/employee-status.enum';

import { InjectRepository } from '@nestjs/typeorm';

import {
    FindManyOptions,
    ILike,
    Repository,
} from 'typeorm';

import { Employee } from '../entities/employee.entity';

import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeQueryDto } from '../dto/employee-query.dto';
import { EmployeeDirectoryQueryDto } from '../dto/employee-directory-query.dto';
import { EmployeeResponseDto } from '../dto/employee-response.dto';
import { UpdateEmployeeStatusDto } from '../dto/update-employee-status.dto';

import { DepartmentService } from '../../departments/department.service';
import { DesignationService } from '../../designations/designation.service';
import { RolePermission } from '../../permissions/entities/role-permission.entity';
import { User } from '../../../auth/entities/user.entity';

@Injectable()
export class EmployeeService {
    constructor(
        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,

        @InjectRepository(RolePermission)
        private readonly rolePermissionRepository: Repository<RolePermission>,

        private readonly departmentService: DepartmentService,

        private readonly designationService: DesignationService,
    ) {}

    async create(
        dto: CreateEmployeeDto,
    ): Promise<Employee> {
        const emailExists =
            await this.employeeRepository.findOne({
                where: {
                    email: dto.email,
                },
            });

        if (emailExists) {
            throw new ConflictException(
                'Employee email already exists',
            );
        }

        const department =
            await this.departmentService.findOne(
                dto.departmentId,
            );

        if (!department.isActive) {
            throw new BadRequestException(
                'Cannot assign an employee to an inactive department',
            );
        }

        if (department.branch && !department.branch.isActive) {
            throw new BadRequestException(
                'Cannot assign an employee to a department whose parent branch is inactive',
            );
        }

        const designation =
            await this.designationService.findOne(
                dto.designationId,
            );

        if (!designation.isActive) {
            throw new BadRequestException(
                'Cannot assign an employee to an inactive designation',
            );
        }

        let manager: Employee | null = null;

        if (dto.managerId) {
            manager =
                await this.employeeRepository.findOne({
                    where: {
                        id: dto.managerId,
                    },
                });

            if (!manager) {
                throw new NotFoundException(
                    'Manager employee not found',
                );
            }
        }

        const employee =
            this.employeeRepository.create({
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                phone: dto.phone,
                dateOfJoining: new Date(
                    dto.dateOfJoining,
                ),
                status: dto.status,
                department,
                designation,
                manager,
            });

        /*
         * employeeCode is intentionally not provided.
         *
         * PostgreSQL generates it using:
         *
         * EMP-001
         * EMP-002
         * EMP-003
         * ...
         */
        return this.employeeRepository.save(
            employee,
        );
    }

    async findAll(
        query: EmployeeQueryDto,
    ): Promise<EmployeeResponseDto> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;

        const findOptions: FindManyOptions<Employee> = {
            skip,
            take: limit,

            order: {
                createdAt: 'DESC',
            },

            relations: {
                department: true,
                designation: true,
                manager: true,
            },
        };

        if (query.search && query.status) {
            findOptions.where = [
                {
                    firstName: ILike(
                        `%${query.search}%`,
                    ),
                    status: query.status,
                },
                {
                    lastName: ILike(
                        `%${query.search}%`,
                    ),
                    status: query.status,
                },
                {
                    employeeCode: ILike(
                        `%${query.search}%`,
                    ),
                    status: query.status,
                },
                {
                    email: ILike(
                        `%${query.search}%`,
                    ),
                    status: query.status,
                },
            ];
        } else if (query.search) {
            findOptions.where = [
                {
                    firstName: ILike(
                        `%${query.search}%`,
                    ),
                },
                {
                    lastName: ILike(
                        `%${query.search}%`,
                    ),
                },
                {
                    employeeCode: ILike(
                        `%${query.search}%`,
                    ),
                },
                {
                    email: ILike(
                        `%${query.search}%`,
                    ),
                },
            ];
        } else if (query.status) {
            findOptions.where = {
                status: query.status,
            };
        }

        const [employees, total] =
            await this.employeeRepository.findAndCount(
                findOptions,
            );

        return {
            data: employees,
            total,
            page,
            limit,
            totalPages: Math.ceil(
                total / limit,
            ),
        };
    }

    async findOne(
        id: string,
    ): Promise<Employee> {
        const employee =
            await this.employeeRepository.findOne({
                where: { id },

                relations: {
                    department: true,
                    designation: true,
                    manager: true,
                    profileDetails: true,
                },
            });

        if (!employee) {
            throw new NotFoundException(
                'Employee not found',
            );
        }

        return employee;
    }

    async findMyProfile(
        employeeId: string,
    ): Promise<Partial<Employee>> {
        const employee =
            await this.employeeRepository.findOne({
                where: { id: employeeId },
                relations: {
                    department: true,
                    designation: true,
                    manager: true,
                },
            });

        if (!employee) {
            throw new NotFoundException(
                'Employee profile not found',
            );
        }

        return {
            id: employee.id,
            employeeCode: employee.employeeCode,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            phone: employee.phone,
            dateOfJoining: employee.dateOfJoining,
            status: employee.status,
            createdAt: employee.createdAt,
            updatedAt: employee.updatedAt,
            department: employee.department,
            designation: employee.designation,
            manager: employee.manager
                ? ({
                      id: employee.manager.id,
                      firstName: employee.manager.firstName,
                      lastName: employee.manager.lastName,
                      employeeCode: employee.manager.employeeCode,
                      email: employee.manager.email,
                  } as Employee)
                : null,
        };
    }

    async findDirectory(
        userId: string,
        employeeId: string,
        query?: EmployeeDirectoryQueryDto,
    ): Promise<Partial<Employee>[]> {
        const orgPermsCount =
            await this.rolePermissionRepository
                .createQueryBuilder('rolePermission')
                .innerJoin('rolePermission.role', 'role')
                .innerJoin('rolePermission.permission', 'permission')
                .innerJoin(User, 'user', 'user.role_id = role.id')
                .where('user.id = :userId', { userId })
                .andWhere('role.is_active = true')
                .andWhere('permission.is_active = true')
                .andWhere('permission.is_deleted = false')
                .andWhere("('ORG' = ANY(rolePermission.scopes) OR 'ORGANIZATION' = ANY(rolePermission.scopes) OR 'GLOBAL' = ANY(rolePermission.scopes) OR permission.scopes LIKE '%ORGANIZATION%')")
                .getCount();

        const hasOrgWideAccess = orgPermsCount > 0;

        const qb = this.employeeRepository
            .createQueryBuilder('employee')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.designation', 'designation')
            .leftJoinAndSelect('employee.manager', 'manager')
            .leftJoinAndSelect('employee.profileDetails', 'profileDetails');

        if (!hasOrgWideAccess) {
            qb.andWhere('employee.manager_id = :managerId', {
                managerId: employeeId,
            });
        }

        if (query?.search && query.search.trim()) {
            const searchTerm = `%${query.search.trim()}%`;
            qb.andWhere(
                '(employee.first_name ILIKE :search OR employee.last_name ILIKE :search OR employee.email ILIKE :search OR employee.employee_code ILIKE :search)',
                { search: searchTerm },
            );
        }

        if (query?.departmentId) {
            qb.andWhere('employee.department_id = :deptId', {
                deptId: query.departmentId,
            });
        }

        if (query?.designationId) {
            qb.andWhere('employee.designation_id = :desigId', {
                desigId: query.designationId,
            });
        }

        qb.orderBy('employee.first_name', 'ASC').addOrderBy(
            'employee.last_name',
            'ASC',
        );

        const employees = await qb.getMany();

        return employees.map((emp) => ({
            id: emp.id,
            employeeCode: emp.employeeCode,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            phone: emp.phone,
            dateOfJoining: emp.dateOfJoining,
            status: emp.status,
            department: emp.department,
            designation: emp.designation,
            manager: emp.manager
                ? ({
                      id: emp.manager.id,
                      firstName: emp.manager.firstName,
                      lastName: emp.manager.lastName,
                      employeeCode: emp.manager.employeeCode,
                      email: emp.manager.email,
                  } as Employee)
                : null,
            profileDetails: emp.profileDetails
                ? ({
                      gender: emp.profileDetails.gender,
                      nationality: emp.profileDetails.nationality,
                  } as any)
                : null,
        }));
    }

    async update(
        id: string,
        dto: UpdateEmployeeDto,
    ): Promise<Employee> {
        const employee =
            await this.findOne(id);

        if (
            dto.email &&
            dto.email !== employee.email
        ) {
            const emailExists =
                await this.employeeRepository.findOne({
                    where: {
                        email: dto.email,
                    },
                });

            if (emailExists) {
                throw new ConflictException(
                    'Employee email already exists',
                );
            }
        }

        if (dto.departmentId) {
            const department =
                await this.departmentService.findOne(
                    dto.departmentId,
                );

            if (!department.isActive) {
                throw new BadRequestException(
                    'Cannot assign an employee to an inactive department',
                );
            }

            if (department.branch && !department.branch.isActive) {
                throw new BadRequestException(
                    'Cannot assign an employee to a department whose parent branch is inactive',
                );
            }

            employee.department = department;
        }

        if (dto.designationId) {
            const designation =
                await this.designationService.findOne(
                    dto.designationId,
                );

            if (!designation.isActive) {
                throw new BadRequestException(
                    'Cannot assign an employee to an inactive designation',
                );
            }

            employee.designation =
                designation;
        }

        if (dto.managerId !== undefined) {
            if (dto.managerId === null) {
                employee.manager = null;
            } else {
                if (dto.managerId === id) {
                    throw new ConflictException(
                        'An employee cannot be their own manager',
                    );
                }

                const manager =
                    await this.employeeRepository.findOne({
                        where: {
                            id: dto.managerId,
                        },
                    });

                if (!manager) {
                    throw new NotFoundException(
                        'Manager employee not found',
                    );
                }

                employee.manager = manager;
            }
        }

        if (dto.dateOfJoining) {
            employee.dateOfJoining =
                new Date(
                    dto.dateOfJoining,
                );
        }

        Object.assign(employee, {
            ...dto,
            departmentId: undefined,
            designationId: undefined,
            managerId: undefined,
            dateOfJoining: undefined,
        });

        return this.employeeRepository.save(
            employee,
        );
    }

    async updateStatus(
        id: string,
        dto: UpdateEmployeeStatusDto,
    ): Promise<Employee> {
        const employee = await this.employeeRepository.findOne({
            where: { id },
            relations: {
                department: { branch: true },
                designation: true,
            },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        if (employee.status === dto.status) {
            throw new ConflictException(
                `Employee is already ${dto.status}`,
            );
        }

        // Rule 4: Hierarchy validation when activating an employee
        if (dto.status === EmployeeStatus.ACTIVE) {
            if (employee.department && !employee.department.isActive) {
                throw new BadRequestException(
                    `Cannot activate employee: Assigned department "${employee.department.name}" is inactive. All parent entities (Branch -> Department -> Designation) must be active.`,
                );
            }

            if (employee.designation && !employee.designation.isActive) {
                throw new BadRequestException(
                    `Cannot activate employee: Assigned designation "${employee.designation.name}" is inactive. All parent entities (Branch -> Department -> Designation) must be active.`,
                );
            }

            if (employee.department?.branch && !employee.department.branch.isActive) {
                throw new BadRequestException(
                    `Cannot activate employee: Assigned branch "${employee.department.branch.name}" is inactive. All parent entities (Branch -> Department -> Designation) must be active.`,
                );
            }
        }

        employee.status = dto.status;

        return this.employeeRepository.save(
            employee,
        );
    }
}
