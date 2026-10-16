import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  Repository,
} from 'typeorm';

import { Leave } from '../entities/leave.entity';
import { LeaveBalance } from '../entities/leave-balance.entity';
import { RolePermission } from '../../permissions/entities/role-permission.entity';
import { User } from '../../../auth/entities/user.entity';

import { CreateLeaveDto } from '../dto/create-leave.dto';
import { UpdateLeaveDto } from '../dto/update-leave.dto';
import { LeaveQueryDto } from '../dto/leave-query.dto';
import { ScopedLeaveQueryDto } from '../dto/scoped-leave-query.dto';
import { LeaveResponseDto } from '../dto/leave-response.dto';
import { LeaveSummaryResponseDto } from '../dto/leave-summary-response.dto';

import { LeaveStatus } from '../enums/leave-status.enum';
import { LeaveType } from '../enums/leave-type.enum';
import { PermissionScope } from '../../permissions/enums/permission-scope.enum';
import { Permission } from '../../permissions/enums/permission.enum';
import { EmployeeService } from '../../employees/services/employee.service';

import { CompanyHoliday } from '../../holidays/entities/company-holiday.entity';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,

    @InjectRepository(LeaveBalance)
    private readonly leaveBalanceRepository: Repository<LeaveBalance>,

    @InjectRepository(CompanyHoliday)
    private readonly companyHolidayRepository: Repository<CompanyHoliday>,

    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,

    private readonly dataSource: DataSource,

    private readonly employeeService: EmployeeService,
  ) {}

  async create(
    employeeId: string,
    dto: CreateLeaveDto,
  ): Promise<Leave> {
    const employee =
      await this.employeeService.findOne(
        employeeId,
      );

    const startDate =
      this.parseDate(dto.startDate);

    const endDate =
      this.parseDate(dto.endDate);

    this.validateDateRange(
      startDate,
      endDate,
    );

    const isHalfDay = Boolean(dto.isHalfDay);
    const numberOfDays =
      await this.calculateDays(
        startDate,
        endDate,
        isHalfDay,
      );

    await this.validateOverlap(
      employeeId,
      startDate,
      endDate,
    );

    if (dto.leaveType !== LeaveType.UNPAID) {
      const yearDays = await this.calculateDaysByYear(
        startDate,
        endDate,
        isHalfDay,
      );

      for (const [year, days] of yearDays.entries()) {
        const balance =
          await this.leaveBalanceRepository.findOne({
            where: {
              employee: {
                id: employeeId,
              },
              leaveType: dto.leaveType,
              year,
            },
          });

        if (!balance) {
          throw new BadRequestException(
            `No ${dto.leaveType} leave balance configured for year ${year}`,
          );
        }

        if (
          Number(balance.availableDays) <
          days
        ) {
          throw new BadRequestException(
            `Insufficient ${dto.leaveType} leave balance for year ${year} (Requested: ${days}, Available: ${balance.availableDays})`,
          );
        }
      }
    }

    const leave =
      this.leaveRepository.create({
        employee,
        leaveType: dto.leaveType,
        startDate,
        endDate,
        numberOfDays,
        isHalfDay,
        halfDaySession: dto.halfDaySession ?? null,
        status: LeaveStatus.PENDING,
        reason: dto.reason ?? null,
        rejectionReason: null,
      });

    return this.leaveRepository.save(
      leave,
    );
  }

  async findAll(
    employeeId: string,
    query: LeaveQueryDto,
  ): Promise<LeaveResponseDto> {
    await this.employeeService.findOne(
      employeeId,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.leaveRepository
        .createQueryBuilder('leave')
        .leftJoinAndSelect(
          'leave.employee',
          'employee',
        )
        .where(
          'employee.id = :employeeId',
          {
            employeeId,
          },
        );

    if (query.leaveType) {
      queryBuilder.andWhere(
        'leave.leave_type = :leaveType',
        {
          leaveType: query.leaveType,
        },
      );
    }

    if (query.status) {
      queryBuilder.andWhere(
        'leave.status = :status',
        {
          status: query.status,
        },
      );
    }

    if (query.fromDate) {
      queryBuilder.andWhere(
        'leave.end_date >= :fromDate',
        {
          fromDate: query.fromDate,
        },
      );
    }

    if (query.toDate) {
      queryBuilder.andWhere(
        'leave.start_date <= :toDate',
        {
          toDate: query.toDate,
        },
      );
    }

    queryBuilder
      .orderBy(
        'leave.created_at',
        'DESC',
      )
      .skip(skip)
      .take(limit);

    const [leaves, total] =
      await queryBuilder.getManyAndCount();

    return {
      data: leaves,
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
    query: ScopedLeaveQueryDto,
  ): Promise<{
    data: Leave[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      cancelled: number;
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const skip = (page - 1) * limit;

    const scopes = await this.getUserPermissionScopes(currentUser.userId, Permission.LEAVE_VIEW);
    const hasOrgAccess =
      scopes.includes(PermissionScope.ORG) ||
      scopes.includes('ORGANIZATION') ||
      scopes.includes('GLOBAL') ||
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'HR';
    const hasTeamAccess = hasOrgAccess || scopes.includes(PermissionScope.TEAM);
    const hasSelfAccess = hasTeamAccess || scopes.includes(PermissionScope.SELF);

    if (!hasSelfAccess) {
      throw new ForbiddenException('You do not have permission to view leave records');
    }

    const qb = this.leaveRepository
      .createQueryBuilder('leave')
      .leftJoinAndSelect('leave.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.designation', 'designation')
      .leftJoinAndSelect('employee.manager', 'manager');

    // Effective scope resolution
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
      qb.andWhere('leave.status = :status', { status: query.status });
    }

    if (query.leaveType) {
      qb.andWhere('leave.leave_type = :leaveType', { leaveType: query.leaveType });
    }

    if (query.fromDate) {
      qb.andWhere('leave.end_date >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      qb.andWhere('leave.start_date <= :toDate', { toDate: query.toDate });
    }

    // Calculate status summary before pagination
    const summaryQb = qb.clone()
      .select('leave.status', 'status')
      .addSelect('COUNT(leave.id)', 'count')
      .groupBy('leave.status');

    const rawSummary = await summaryQb.getRawMany();
    const summary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };
    for (const row of rawSummary) {
      const cnt = Number(row.count) || 0;
      summary.total += cnt;
      if (row.status === LeaveStatus.PENDING) summary.pending = cnt;
      if (row.status === LeaveStatus.APPROVED) summary.approved = cnt;
      if (row.status === LeaveStatus.REJECTED) summary.rejected = cnt;
      if (row.status === LeaveStatus.CANCELLED) summary.cancelled = cnt;
    }

    qb.orderBy('leave.createdAt', 'DESC')
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
    leaveId: string,
  ): Promise<Leave> {
    const leave =
      await this.leaveRepository.findOne({
        where: {
          id: leaveId,
          employee: {
            id: employeeId,
          },
        },
        relations: {
          employee: true,
        },
      });

    if (!leave) {
      throw new NotFoundException(
        'Leave request not found',
      );
    }

    return leave;
  }

  async update(
    employeeId: string,
    leaveId: string,
    dto: UpdateLeaveDto,
  ): Promise<Leave> {
    const leave =
      await this.findOne(
        employeeId,
        leaveId,
      );

    if (
      leave.status !== LeaveStatus.PENDING
    ) {
      throw new ConflictException(
        'Only pending leave requests can be updated',
      );
    }

    const startDate = dto.startDate
      ? this.parseDate(dto.startDate)
      : this.parseDate(leave.startDate);

    const endDate = dto.endDate
      ? this.parseDate(dto.endDate)
      : this.parseDate(leave.endDate);

    this.validateDateRange(
      startDate,
      endDate,
    );

    await this.validateOverlap(
      employeeId,
      startDate,
      endDate,
      leaveId,
    );

    const isHalfDay =
      dto.isHalfDay !== undefined
        ? Boolean(dto.isHalfDay)
        : leave.isHalfDay;

    const numberOfDays =
      await this.calculateDays(
        startDate,
        endDate,
        isHalfDay,
      );

    const targetLeaveType =
      dto.leaveType || leave.leaveType;

    if (
      targetLeaveType !== LeaveType.UNPAID
    ) {
      const yearDays = await this.calculateDaysByYear(
        startDate,
        endDate,
        isHalfDay,
      );

      for (const [year, days] of yearDays.entries()) {
        const balance =
          await this.leaveBalanceRepository.findOne({
            where: {
              employee: {
                id: employeeId,
              },
              leaveType: targetLeaveType,
              year,
            },
          });

        if (!balance) {
          throw new BadRequestException(
            `No ${targetLeaveType} leave balance configured for year ${year}`,
          );
        }

        if (
          Number(balance.availableDays) <
          days
        ) {
          throw new BadRequestException(
            `Insufficient ${targetLeaveType} leave balance for year ${year} (Requested: ${days}, Available: ${balance.availableDays})`,
          );
        }
      }
    }

    leave.startDate = startDate;
    leave.endDate = endDate;
    leave.numberOfDays = numberOfDays;
    leave.leaveType = targetLeaveType;
    leave.isHalfDay = isHalfDay;

    if (dto.halfDaySession !== undefined) {
      leave.halfDaySession = dto.halfDaySession;
    }

    if (dto.reason !== undefined) {
      leave.reason =
        dto.reason ?? null;
    }

    return this.leaveRepository.save(
      leave,
    );
  }

  async cancel(
    employeeId: string,
    leaveId: string,
  ): Promise<Leave> {
    return this.dataSource.transaction(
      async (manager) => {
        const leave =
          await manager.findOne(
            Leave,
            {
              where: {
                id: leaveId,
                employee: {
                  id: employeeId,
                },
              },
              relations: {
                employee: true,
              },
            },
          );

        if (!leave) {
          throw new NotFoundException(
            'Leave request not found',
          );
        }

        if (
          leave.status !==
            LeaveStatus.PENDING &&
          leave.status !==
            LeaveStatus.APPROVED
        ) {
          throw new ConflictException(
            'Only pending or approved leave requests can be cancelled',
          );
        }

        // Pending leave has not consumed balance.
        // Approved leave has already consumed balance,
        // so restore it.
        if (
          leave.status ===
          LeaveStatus.APPROVED
        ) {
          if (
            leave.leaveType !==
            LeaveType.UNPAID
          ) {
            const yearDays =
              await this.calculateDaysByYear(
                this.parseDate(leave.startDate),
                this.parseDate(leave.endDate),
                leave.isHalfDay,
              );

            for (const [year, days] of yearDays.entries()) {
              const balance =
                await manager.findOne(
                  LeaveBalance,
                  {
                    where: {
                      employee: {
                        id: employeeId,
                      },
                      leaveType:
                        leave.leaveType,
                      year,
                    },
                    lock: {
                      mode: 'pessimistic_write',
                    },
                  },
                );

              if (balance) {
                const usedDays =
                  Number(balance.usedDays) -
                  days;

                balance.usedDays =
                  Math.max(0, usedDays);

                balance.availableDays =
                  Number(
                    balance.totalDays,
                  ) -
                  Number(
                    balance.usedDays,
                  );

                await manager.save(
                  LeaveBalance,
                  balance,
                );
              }
            }
          }
        }

        leave.status =
          LeaveStatus.CANCELLED;

        return manager.save(
          Leave,
          leave,
        );
      },
    );
  }

  private async validateOverlap(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeLeaveId?: string,
  ): Promise<void> {
    const query =
      this.leaveRepository
        .createQueryBuilder('leave')
        .where(
          'leave.employee_id = :employeeId',
          {
            employeeId,
          },
        )
        .andWhere(
          'leave.status IN (:...statuses)',
          {
            statuses: [
              LeaveStatus.PENDING,
              LeaveStatus.APPROVED,
            ],
          },
        )
        .andWhere(
          'leave.start_date <= :endDate',
          {
            endDate,
          },
        )
        .andWhere(
          'leave.end_date >= :startDate',
          {
            startDate,
          },
        );

    if (excludeLeaveId) {
      query.andWhere(
        'leave.id != :excludeLeaveId',
        {
          excludeLeaveId,
        },
      );
    }

    const existing =
      await query.getOne();

    if (existing) {
      throw new ConflictException(
        'Leave dates overlap with an existing leave request',
      );
    }
  }

  async approve(
    employeeId: string,
    leaveId: string,
  ): Promise<Leave> {
    return this.dataSource.transaction(
      async (manager) => {
        const leave =
          await manager.findOne(
            Leave,
            {
              where: {
                id: leaveId,
                employee: {
                  id: employeeId,
                },
              },
              relations: {
                employee: true,
              },
            },
          );

        if (!leave) {
          throw new NotFoundException(
            'Leave request not found',
          );
        }

        if (
          leave.status !==
          LeaveStatus.PENDING
        ) {
          throw new ConflictException(
            'Only pending leave requests can be approved',
          );
        }

        if (
          leave.leaveType !==
          LeaveType.UNPAID
        ) {
          const yearDays =
            await this.calculateDaysByYear(
              this.parseDate(leave.startDate),
              this.parseDate(leave.endDate),
              leave.isHalfDay,
            );

          for (const [year, days] of yearDays.entries()) {
            const balance =
              await manager.findOne(
                LeaveBalance,
                {
                  where: {
                    employee: {
                      id: employeeId,
                    },
                    leaveType:
                      leave.leaveType,
                    year,
                  },
                  lock: {
                    mode: 'pessimistic_write',
                  },
                },
              );

            if (!balance) {
              throw new BadRequestException(
                `No ${leave.leaveType} leave balance configured for year ${year}`,
              );
            }

            if (
              Number(
                balance.availableDays,
              ) < days
            ) {
              throw new BadRequestException(
                `Insufficient ${leave.leaveType} leave balance for year ${year} (Requested: ${days}, Available: ${balance.availableDays})`,
              );
            }

            balance.usedDays =
              Number(
                balance.usedDays,
              ) + days;

            balance.availableDays =
              Number(
                balance.availableDays,
              ) - days;

            await manager.save(
              LeaveBalance,
              balance,
            );
          }
        }

        leave.status =
          LeaveStatus.APPROVED;

        return manager.save(
          Leave,
          leave,
        );
      },
    );
  }

  async reject(
    employeeId: string,
    leaveId: string,
    rejectionReason: string,
  ): Promise<Leave> {
    const leave =
      await this.findOne(
        employeeId,
        leaveId,
      );

    if (
      leave.status !==
      LeaveStatus.PENDING
    ) {
      throw new ConflictException(
        'Only pending leave requests can be rejected',
      );
    }

    leave.status =
      LeaveStatus.REJECTED;

    leave.rejectionReason =
      rejectionReason;

    return this.leaveRepository.save(
      leave,
    );
  }

  async getSummary(
    employeeId: string,
    year: number,
  ): Promise<LeaveSummaryResponseDto> {
    await this.employeeService.findOne(
      employeeId,
    );

    const leaves =
      await this.leaveRepository
        .createQueryBuilder('leave')
        .where(
          'leave.employee_id = :employeeId',
          {
            employeeId,
          },
        )
        .andWhere(
          `EXTRACT(YEAR FROM leave.start_date) = :year`,
          { year },
        )
        .getMany();

    const balances =
      await this.leaveBalanceRepository.find({
        where: {
          employee: {
            id: employeeId,
          },
          year,
        },
      });

    const statusSummary =
      Object.values(LeaveStatus).map(
        (status) => ({
          status,
          count: leaves.filter(
            (leave) =>
              leave.status === status,
          ).length,
        }),
      );

    const leaveTypeSummary =
      balances.map(
        (balance) => ({
          leaveType:
            balance.leaveType,
          allocatedDays:
            Number(
              balance.totalDays,
            ),
          usedDays:
            Number(
              balance.usedDays,
            ),
          availableDays:
            Number(
              balance.availableDays,
            ),
        }),
      );

    // Include UNPAID usage because it has no balance record.
    const unpaidUsedDays =
      leaves
        .filter(
          (leave) =>
            leave.leaveType ===
              LeaveType.UNPAID &&
            leave.status ===
              LeaveStatus.APPROVED,
        )
        .reduce(
          (total, leave) =>
            total +
            Number(
              leave.numberOfDays,
            ),
          0,
        );

    if (unpaidUsedDays > 0) {
      leaveTypeSummary.push({
        leaveType: LeaveType.UNPAID,
        allocatedDays: 0,
        usedDays: unpaidUsedDays,
        availableDays: 0,
      });
    }

    return {
      year,
      totalRequests: leaves.length,
      statusSummary,
      leaveTypeSummary,
    };
  }

  private validateDateRange(
    startDate: Date,
    endDate: Date,
  ): void {
    if (endDate < startDate) {
      throw new BadRequestException(
        'End date cannot be before start date',
      );
    }
  }

  private async calculateDaysByYear(
    startDate: Date,
    endDate: Date,
    isHalfDay?: boolean,
  ): Promise<Map<number, number>> {
    const yearDays = new Map<number, number>();

    if (isHalfDay) {
      yearDays.set(startDate.getFullYear(), 0.5);
      return yearDays;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const startStr = start.toISOString().substring(0, 10);
    const endStr = end.toISOString().substring(0, 10);

    const holidays = await this.companyHolidayRepository
      .createQueryBuilder('holiday')
      .where('holiday.is_active = true')
      .andWhere('holiday.date >= :startStr AND holiday.date <= :endStr', {
        startStr,
        endStr,
      })
      .getMany();

    const holidayDates = new Set(
      holidays.map((h) => String(h.date).substring(0, 10)),
    );

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
      const currentStr = current.toISOString().substring(0, 10);
      const year = current.getFullYear();

      // Skip weekends and approved company holidays
      if (
        dayOfWeek !== 0 &&
        dayOfWeek !== 6 &&
        !holidayDates.has(currentStr)
      ) {
        yearDays.set(year, (yearDays.get(year) || 0) + 1);
      }
      current.setDate(current.getDate() + 1);
    }

    // Default to at least 1 day if range consists entirely of non-working days
    if (yearDays.size === 0) {
      yearDays.set(startDate.getFullYear(), 1);
    }

    return yearDays;
  }

  private async calculateDays(
    startDate: Date,
    endDate: Date,
    isHalfDay?: boolean,
  ): Promise<number> {
    const yearDays = await this.calculateDaysByYear(
      startDate,
      endDate,
      isHalfDay,
    );

    let total = 0;
    for (const days of yearDays.values()) {
      total += days;
    }
    return Number(total.toFixed(1));
  }

  private parseDate(
    value: string | Date,
  ): Date {
    if (value instanceof Date) {
      return value;
    }

    const str = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, d));
    }

    const date = str.includes('T') ? new Date(str) : new Date(`${str}T00:00:00Z`);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Invalid date format',
      );
    }

    return date;
  }
}
