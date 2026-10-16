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
import { RolePermission } from '../../permissions/entities/role-permission.entity';
import { User } from '../../../auth/entities/user.entity';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionScope } from '../../permissions/enums/permission-scope.enum';
import { CreateTimesheetDto } from '../dto/create-timesheet.dto';
import { RejectTimesheetDto } from '../dto/reject-timesheet.dto';
import { TimesheetQueryDto } from '../dto/timesheet-query.dto';
import { ScopedTimesheetQueryDto } from '../dto/scoped-timesheet-query.dto';
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

        @InjectRepository(RolePermission)
        private readonly rolePermissionRepository: Repository<RolePermission>,
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

    async getUserPermissionScopes(userId: string, permissionCode: string): Promise<string[]> {
        const rolePerms = await this.rolePermissionRepository
            .createQueryBuilder('rp')
            .innerJoin('rp.permission', 'permission')
            .innerJoin('rp.role', 'role')
            .innerJoin(User, 'user', 'user.role_id = role.id')
            .where('user.id = :userId', { userId })
            .andWhere('role.is_active = true')
            .andWhere('permission.is_active = true')
            .andWhere('permission.is_deleted = false')
            .andWhere('permission.code = :code', { code: permissionCode })
            .getMany();

        const scopes = new Set<string>();
        for (const rp of rolePerms) {
            if (rp.scopes && Array.isArray(rp.scopes)) {
                for (const s of rp.scopes) scopes.add(s);
            }
        }
        return Array.from(scopes);
    }

    async findAllScoped(
        currentUser: { userId: string; employeeId?: string; role: string },
        query: ScopedTimesheetQueryDto,
    ) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const scopes = await this.getUserPermissionScopes(currentUser.userId, Permission.TIMESHEET_VIEW);
        const hasOrgAccess =
            scopes.includes(PermissionScope.ORG) ||
            scopes.includes('ORGANIZATION') ||
            scopes.includes('GLOBAL') ||
            currentUser.role === 'ADMIN' ||
            currentUser.role === 'HR';
        const hasTeamAccess = hasOrgAccess || scopes.includes(PermissionScope.TEAM);
        const hasSelfAccess = hasTeamAccess || scopes.includes(PermissionScope.SELF);

        if (!hasSelfAccess) {
            throw new ForbiddenException('You do not have permission to view timesheet records');
        }

        const qb = this.timesheetRepository
            .createQueryBuilder('timesheet')
            .leftJoinAndSelect('timesheet.employee', 'employee')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.designation', 'designation')
            .leftJoinAndSelect('employee.manager', 'manager')
            .leftJoinAndSelect('timesheet.reviewedBy', 'reviewedBy');

        const requestedScope = query.scope;
        if (requestedScope === PermissionScope.SELF || (!hasOrgAccess && !hasTeamAccess)) {
            if (!currentUser.employeeId) {
                qb.andWhere('1 = 0');
            } else {
                qb.andWhere('employee.id = :selfEmpId', { selfEmpId: currentUser.employeeId });
            }
        } else if (requestedScope === PermissionScope.TEAM || (!hasOrgAccess && hasTeamAccess)) {
            if (!currentUser.employeeId) {
                qb.andWhere('1 = 0');
            } else if (query.employeeId) {
                qb.andWhere('employee.id = :targetEmpId AND (manager.id = :myEmpId OR employee.id = :myEmpId)', {
                    targetEmpId: query.employeeId,
                    myEmpId: currentUser.employeeId,
                });
            } else {
                qb.andWhere('(manager.id = :myEmpId OR employee.id = :myEmpId)', {
                    myEmpId: currentUser.employeeId,
                });
            }
        } else {
            // ORG scope
            if (query.employeeId) {
                qb.andWhere('employee.id = :targetEmpId', { targetEmpId: query.employeeId });
            }
        }

        if (query.status) {
            qb.andWhere('timesheet.status = :status', { status: query.status });
        }

        if (query.fromDate) {
            qb.andWhere('timesheet.work_date >= :fromDate', { fromDate: query.fromDate });
        }

        if (query.toDate) {
            qb.andWhere('timesheet.work_date <= :toDate', { toDate: query.toDate });
        }

        // Summary metrics before pagination
        const summaryQb = qb.clone()
            .select('timesheet.status', 'status')
            .addSelect('SUM(timesheet.hours)', 'totalHours')
            .addSelect('COUNT(timesheet.id)', 'count')
            .groupBy('timesheet.status');

        const rawSummary = await summaryQb.getRawMany();
        const summary = {
            totalHours: 0,
            draftHours: 0,
            submittedHours: 0,
            approvedHours: 0,
            rejectedHours: 0,
            totalCount: 0,
            pendingCount: 0,
        };

        for (const row of rawSummary) {
            const hrs = Number(row.totalHours) || 0;
            const cnt = Number(row.count) || 0;
            summary.totalHours += hrs;
            summary.totalCount += cnt;

            if (row.status === TimesheetStatus.DRAFT) summary.draftHours = hrs;
            if (row.status === TimesheetStatus.SUBMITTED) {
                summary.submittedHours = hrs;
                summary.pendingCount = cnt;
            }
            if (row.status === TimesheetStatus.APPROVED) summary.approvedHours = hrs;
            if (row.status === TimesheetStatus.REJECTED) summary.rejectedHours = hrs;
        }

        qb.orderBy('timesheet.work_date', 'DESC')
            .addOrderBy('timesheet.created_at', 'DESC')
            .skip(skip)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            summary,
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
        currentUserEmployeeId?: string,
    ) {
        if (currentUserEmployeeId && employeeId === currentUserEmployeeId) {
            throw new BadRequestException(
                'You cannot approve your own timesheet',
            );
        }

        const timesheet =
            await this.findOne(
                employeeId,
                timesheetId,
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

        if (currentUserEmployeeId) {
            timesheet.reviewedBy =
                await this.getEmployee(
                    currentUserEmployeeId,
                );
        }

        timesheet.rejectionReason =
            null;

        return this.timesheetRepository.save(
            timesheet,
        );
    }

    async reject(
        employeeId: string,
        timesheetId: string,
        currentUserEmployeeId: string | undefined,
        dto: RejectTimesheetDto,
    ) {
        if (currentUserEmployeeId && employeeId === currentUserEmployeeId) {
            throw new BadRequestException(
                'You cannot reject your own timesheet',
            );
        }

        const timesheet =
            await this.findOne(
                employeeId,
                timesheetId,
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

        if (currentUserEmployeeId) {
            timesheet.reviewedBy =
                await this.getEmployee(
                    currentUserEmployeeId,
                );
        }

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
}
