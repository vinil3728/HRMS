import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import {
    Between,
    Repository,
} from 'typeorm';

import { Employee } from '../../employees/entities/employee.entity';
import { CreateTimesheetDto } from '../dto/create-timesheet.dto';
import { RejectTimesheetDto } from '../dto/reject-timesheet.dto';
import { TimesheetQueryDto } from '../dto/timesheet-query.dto';
import { UpdateTimesheetDto } from '../dto/update-timesheet.dto';
import { Timesheet } from '../entities/timesheet.entity';
import { TimesheetStatus } from '../enums/timesheet-status.enum';

@Injectable()
export class TimesheetService {
    constructor(
        @InjectRepository(Timesheet)
        private readonly timesheetRepository: Repository<Timesheet>,

        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,
    ) { }

    async create(
        employeeId: string,
        dto: CreateTimesheetDto,
    ) {
        const employee =
            await this.getEmployee(employeeId);

        const existing =
            await this.timesheetRepository.findOne({
                where: {
                    employee: {
                        id: employeeId,
                    },
                    workDate: new Date(dto.workDate),
                    project: dto.project,
                },
            });

        if (existing) {
            throw new BadRequestException(
                'A timesheet already exists for this employee, date and project',
            );
        }

        const timesheet =
            this.timesheetRepository.create({
                employee,
                workDate: new Date(dto.workDate),
                project: dto.project,
                description: dto.description,
                hours: dto.hours,
                status: TimesheetStatus.DRAFT,
            });

        return this.timesheetRepository.save(
            timesheet,
        );
    }

    async findAll(
        employeeId: string,
        query: TimesheetQueryDto,
    ) {
        await this.getEmployee(employeeId);

        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const qb =
            this.timesheetRepository
                .createQueryBuilder('timesheet')
                .leftJoinAndSelect(
                    'timesheet.employee',
                    'employee',
                )
                .leftJoinAndSelect(
                    'timesheet.reviewedBy',
                    'reviewedBy',
                )
                .where(
                    'employee.id = :employeeId',
                    { employeeId },
                );

        if (query.fromDate) {
            qb.andWhere(
                'timesheet.work_date >= :fromDate',
                {
                    fromDate: query.fromDate,
                },
            );
        }

        if (query.toDate) {
            qb.andWhere(
                'timesheet.work_date <= :toDate',
                {
                    toDate: query.toDate,
                },
            );
        }

        if (query.status) {
            qb.andWhere(
                'timesheet.status = :status',
                {
                    status: query.status,
                },
            );
        }

        qb.orderBy(
            'timesheet.work_date',
            'DESC',
        );

        qb.skip(skip).take(limit);

        const [data, total] =
            await qb.getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(
                total / limit,
            ),
        };
    }

    async findOne(
        employeeId: string,
        timesheetId: string,
    ) {
        const timesheet =
            await this.timesheetRepository.findOne({
                where: {
                    id: timesheetId,
                    employee: {
                        id: employeeId,
                    },
                },
                relations: {
                    employee: true,
                    reviewedBy: true,
                },
            });

        if (!timesheet) {
            throw new NotFoundException(
                'Timesheet not found',
            );
        }

        return timesheet;
    }

    async update(
        employeeId: string,
        timesheetId: string,
        dto: UpdateTimesheetDto,
    ) {
        const timesheet =
            await this.findOne(
                employeeId,
                timesheetId,
            );

        if (
            timesheet.status !==
            TimesheetStatus.DRAFT
        ) {
            throw new BadRequestException(
                'Only draft timesheets can be updated',
            );
        }

        if (dto.workDate !== undefined) {
            timesheet.workDate =
                new Date(dto.workDate);
        }

        if (dto.project !== undefined) {
            timesheet.project = dto.project;
        }

        if (dto.description !== undefined) {
            timesheet.description =
                dto.description;
        }

        if (dto.hours !== undefined) {
            timesheet.hours = dto.hours;
        }

        return this.timesheetRepository.save(
            timesheet,
        );
    }

    async remove(
        employeeId: string,
        timesheetId: string,
    ) {
        const timesheet =
            await this.findOne(
                employeeId,
                timesheetId,
            );

        if (
            timesheet.status !==
            TimesheetStatus.DRAFT
        ) {
            throw new BadRequestException(
                'Only draft timesheets can be deleted',
            );
        }

        await this.timesheetRepository.remove(
            timesheet,
        );

        return {
            message: 'Timesheet deleted successfully',
        };
    }

    async submit(
        employeeId: string,
        timesheetId: string,
    ) {
        const timesheet =
            await this.findOne(
                employeeId,
                timesheetId,
            );

        if (
            timesheet.status !==
            TimesheetStatus.DRAFT
        ) {
            throw new BadRequestException(
                'Only draft timesheets can be submitted',
            );
        }

        timesheet.status =
            TimesheetStatus.SUBMITTED;

        timesheet.submittedAt =
            new Date();

        timesheet.rejectionReason =
            null;

        return this.timesheetRepository.save(
            timesheet,
        );
    }

    async approve(
        employeeId: string,
        timesheetId: string,
        currentUserEmployeeId: string,
        currentUserRole?: string,
    ) {
        const timesheet =
            await this.findOne(
                employeeId,
                timesheetId,
            );

        await this.ensureManagerAccess(
            employeeId,
            currentUserEmployeeId,
            currentUserRole,
        );

        if (
            timesheet.status !==
            TimesheetStatus.SUBMITTED
        ) {
            throw new BadRequestException(
                'Only submitted timesheets can be approved',
            );
        }

        timesheet.status =
            TimesheetStatus.APPROVED;

        timesheet.reviewedAt =
            new Date();

        timesheet.reviewedBy =
            await this.getEmployee(
                currentUserEmployeeId,
            );

        timesheet.rejectionReason =
            null;

        return this.timesheetRepository.save(
            timesheet,
        );
    }

    async reject(
        employeeId: string,
        timesheetId: string,
        currentUserEmployeeId: string,
        dto: RejectTimesheetDto,
        currentUserRole?: string,
    ) {
        const timesheet =
            await this.findOne(
                employeeId,
                timesheetId,
            );

        await this.ensureManagerAccess(
            employeeId,
            currentUserEmployeeId,
            currentUserRole,
        );

        if (
            timesheet.status !==
            TimesheetStatus.SUBMITTED
        ) {
            throw new BadRequestException(
                'Only submitted timesheets can be rejected',
            );
        }

        timesheet.status =
            TimesheetStatus.REJECTED;

        timesheet.rejectionReason =
            dto.reason;

        timesheet.reviewedAt =
            new Date();

        timesheet.reviewedBy =
            await this.getEmployee(
                currentUserEmployeeId,
            );

        return this.timesheetRepository.save(
            timesheet,
        );
    }

    async getSummary(
        employeeId: string,
    ) {
        await this.getEmployee(employeeId);

        const rows =
            await this.timesheetRepository.find({
                where: {
                    employee: {
                        id: employeeId,
                    },
                },
                order: {
                    workDate: 'ASC',
                },
            });

        const totalHours =
            rows.reduce(
                (total, row) =>
                    total + Number(row.hours),
                0,
            );

        const draftHours =
            rows
                .filter(
                    (row) =>
                        row.status ===
                        TimesheetStatus.DRAFT,
                )
                .reduce(
                    (total, row) =>
                        total + Number(row.hours),
                    0,
                );

        const submittedHours =
            rows
                .filter(
                    (row) =>
                        row.status ===
                        TimesheetStatus.SUBMITTED,
                )
                .reduce(
                    (total, row) =>
                        total + Number(row.hours),
                    0,
                );

        const approvedHours =
            rows
                .filter(
                    (row) =>
                        row.status ===
                        TimesheetStatus.APPROVED,
                )
                .reduce(
                    (total, row) =>
                        total + Number(row.hours),
                    0,
                );

        const rejectedHours =
            rows
                .filter(
                    (row) =>
                        row.status ===
                        TimesheetStatus.REJECTED,
                )
                .reduce(
                    (total, row) =>
                        total + Number(row.hours),
                    0,
                );

        return {
            employeeId,
            totalEntries: rows.length,
            totalHours,
            draftHours,
            submittedHours,
            approvedHours,
            rejectedHours,
        };
    }

    private async getEmployee(
        employeeId: string,
    ) {
        const employee =
            await this.employeeRepository.findOne({
                where: {
                    id: employeeId,
                },
                relations: {
                    manager: true,
                },
            });

        if (!employee) {
            throw new NotFoundException(
                'Employee not found',
            );
        }

        return employee;
    }

    private async ensureManagerAccess(
        employeeId: string,
        currentUserEmployeeId: string,
        currentUserRole?: string,
    ) {
        if (
            currentUserRole === 'ADMIN' ||
            currentUserRole === 'HR'
        ) {
            return;
        }

        const employee =
            await this.getEmployee(
                employeeId,
            );

        if (
            employee.manager?.id !==
            currentUserEmployeeId
        ) {
            throw new ForbiddenException(
                'You can only review timesheets of your direct reports',
            );
        }
    }
}
