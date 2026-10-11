import {
  BadRequestException,
  ConflictException,
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

import { CreateLeaveDto } from '../dto/create-leave.dto';
import { UpdateLeaveDto } from '../dto/update-leave.dto';
import { LeaveQueryDto } from '../dto/leave-query.dto';
import { LeaveResponseDto } from '../dto/leave-response.dto';
import { LeaveSummaryResponseDto } from '../dto/leave-summary-response.dto';

import { LeaveStatus } from '../enums/leave-status.enum';
import { LeaveType } from '../enums/leave-type.enum';
import { EmployeeService } from '../../employees/services/employee.service';


@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(Leave)
    private readonly leaveRepository: Repository<Leave>,

    @InjectRepository(LeaveBalance)
    private readonly leaveBalanceRepository: Repository<LeaveBalance>,

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

    const numberOfDays =
      this.calculateDays(
        startDate,
        endDate,
      );

    await this.validateOverlap(
      employeeId,
      startDate,
      endDate,
    );

    if (dto.leaveType !== LeaveType.UNPAID) {
      const balance =
        await this.leaveBalanceRepository.findOne({
          where: {
            employee: {
              id: employeeId,
            },
            leaveType: dto.leaveType,
            year: startDate.getFullYear(),
          },
        });

      if (!balance) {
        throw new BadRequestException(
          `No ${dto.leaveType} leave balance configured for ${startDate.getFullYear()}`,
        );
      }

      if (
        Number(balance.availableDays) <
        numberOfDays
      ) {
        throw new BadRequestException(
          `Insufficient ${dto.leaveType} leave balance`,
        );
      }
    }

    const leave =
      this.leaveRepository.create({
        employee,
        leaveType: dto.leaveType,
        startDate,
        endDate,
        numberOfDays,
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

    const numberOfDays =
      this.calculateDays(
        startDate,
        endDate,
      );

    if (
      leave.leaveType !== LeaveType.UNPAID
    ) {
      const balance =
        await this.leaveBalanceRepository.findOne({
          where: {
            employee: {
              id: employeeId,
            },
            leaveType: leave.leaveType,
            year: startDate.getFullYear(),
          },
        });

      if (!balance) {
        throw new BadRequestException(
          `No ${leave.leaveType} leave balance configured`,
        );
      }

      if (
        Number(balance.availableDays) <
        numberOfDays
      ) {
        throw new BadRequestException(
          `Insufficient ${leave.leaveType} leave balance`,
        );
      }
    }

    leave.startDate = startDate;
    leave.endDate = endDate;
    leave.numberOfDays = numberOfDays;

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
                    year:
                      this.parseDate(leave.startDate).getFullYear(),
                  },
                },
              );

            if (!balance) {
              throw new BadRequestException(
                `No ${leave.leaveType} leave balance configured`,
              );
            }

            const usedDays =
              Number(balance.usedDays) -
              Number(
                leave.numberOfDays,
              );

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
                  year:
                    this.parseDate(leave.startDate).getFullYear(),
                },
              },
            );

          if (!balance) {
            throw new BadRequestException(
              `No ${leave.leaveType} leave balance configured`,
            );
          }

          if (
            Number(
              balance.availableDays,
            ) <
            Number(
              leave.numberOfDays,
            )
          ) {
            throw new BadRequestException(
              `Insufficient ${leave.leaveType} leave balance`,
            );
          }

          balance.usedDays =
            Number(
              balance.usedDays,
            ) +
            Number(
              leave.numberOfDays,
            );

          balance.availableDays =
            Number(
              balance.availableDays,
            ) -
            Number(
              leave.numberOfDays,
            );

          await manager.save(
            LeaveBalance,
            balance,
          );
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

  private calculateDays(
    startDate: Date,
    endDate: Date,
  ): number {
    const millisecondsPerDay =
      1000 * 60 * 60 * 24;

    const difference =
      endDate.getTime() -
      startDate.getTime();

    return Number(
      (
        difference /
          millisecondsPerDay +
        1
      ).toFixed(1),
    );
  }

  private parseDate(
    value: string | Date,
  ): Date {
    if (value instanceof Date) {
      return value;
    }

    const str = String(value).trim();
    const date = str.includes('T') ? new Date(str) : new Date(`${str}T00:00:00`);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Invalid date',
      );
    }

    return date;
  }
}
