import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PerformanceGoal } from '../entities/performance-goal.entity';
import {
  PerformanceCycle,
  PerformanceCycleStatus,
} from '../entities/performance-cycle.entity';

import { PerformanceGoalStatus } from '../enums/performance-goal-status.enum';

import { CreatePerformanceGoalDto } from '../dto/create-performance-goal.dto';
import { UpdatePerformanceGoalDto } from '../dto/update-performance-goal.dto';

import { PerformanceCycleService } from './performance-cycle.service';
import { EmployeeService } from '../../employees/services/employee.service';

@Injectable()
export class PerformanceGoalService {
  constructor(
    @InjectRepository(PerformanceGoal)
    private readonly goalRepository: Repository<PerformanceGoal>,

    private readonly employeeService: EmployeeService,

    private readonly performanceCycleService: PerformanceCycleService,
  ) {}

  async create(
    employeeId: string,
    cycleId: string,
    dto: CreatePerformanceGoalDto,
  ): Promise<PerformanceGoal> {
    const employee =
      await this.employeeService.findOne(
        employeeId,
      );

    const cycle =
      await this.performanceCycleService.findOne(
        cycleId,
      );

    this.validateCycleStatus(cycle);

    const startDate =
      this.parseDate(dto.startDate);

    const endDate =
      this.parseDate(dto.endDate);

    this.validateDateRange(
      startDate,
      endDate,
    );

    if (
      startDate < cycle.startDate ||
      endDate > cycle.endDate
    ) {
      throw new BadRequestException(
        'Goal dates must be within the performance cycle dates',
      );
    }

    await this.validateWeight(
      employeeId,
      cycleId,
      dto.weight,
    );

    const goal =
      this.goalRepository.create({
        employee,
        cycle,
        title: dto.title,
        description:
          dto.description ?? null,
        target: dto.target ?? null,
        weight: dto.weight,
        progress: 0,
        status:
          PerformanceGoalStatus.NOT_STARTED,
        startDate,
        endDate,
      });

    return this.goalRepository.save(
      goal,
    );
  }

  async findAll(
    employeeId: string,
    cycleId: string,
  ): Promise<PerformanceGoal[]> {
    await this.employeeService.findOne(
      employeeId,
    );

    await this.performanceCycleService.findOne(
      cycleId,
    );

    return this.goalRepository.find({
      where: {
        employee: {
          id: employeeId,
        },
        cycle: {
          id: cycleId,
        },
      },
      relations: {
        employee: true,
        cycle: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findOne(
    employeeId: string,
    cycleId: string,
    goalId: string,
  ): Promise<PerformanceGoal> {
    const goal =
      await this.goalRepository.findOne({
        where: {
          id: goalId,
          employee: {
            id: employeeId,
          },
          cycle: {
            id: cycleId,
          },
        },
        relations: {
          employee: true,
          cycle: true,
        },
      });

    if (!goal) {
      throw new NotFoundException(
        'Performance goal not found',
      );
    }

    return goal;
  }

  async update(
    employeeId: string,
    cycleId: string,
    goalId: string,
    dto: UpdatePerformanceGoalDto,
  ): Promise<PerformanceGoal> {
    const goal =
      await this.findOne(
        employeeId,
        cycleId,
        goalId,
      );

    this.validateCycleStatus(
      goal.cycle,
    );

    const startDate = dto.startDate
      ? this.parseDate(dto.startDate)
      : goal.startDate;

    const endDate = dto.endDate
      ? this.parseDate(dto.endDate)
      : goal.endDate;

    this.validateDateRange(
      startDate,
      endDate,
    );

    if (
      startDate < goal.cycle.startDate ||
      endDate > goal.cycle.endDate
    ) {
      throw new BadRequestException(
        'Goal dates must be within the performance cycle dates',
      );
    }

    if (dto.weight !== undefined) {
      await this.validateWeight(
        employeeId,
        cycleId,
        dto.weight,
        goalId,
      );

      goal.weight = dto.weight;
    }

    if (dto.title !== undefined) {
      goal.title = dto.title;
    }

    if (dto.description !== undefined) {
      goal.description =
        dto.description;
    }

    if (dto.target !== undefined) {
      goal.target = dto.target;
    }

    if (dto.progress !== undefined) {
      goal.progress = dto.progress;

      if (
        dto.progress === 100 &&
        dto.status === undefined
      ) {
        goal.status =
          PerformanceGoalStatus.COMPLETED;
      }
    }

    if (dto.status !== undefined) {
      goal.status = dto.status;
    }

    goal.startDate = startDate;
    goal.endDate = endDate;

    return this.goalRepository.save(
      goal,
    );
  }

  async remove(
    employeeId: string,
    cycleId: string,
    goalId: string,
  ): Promise<void> {
    const goal =
      await this.findOne(
        employeeId,
        cycleId,
        goalId,
      );

    this.validateCycleStatus(
      goal.cycle,
    );

    await this.goalRepository.remove(
      goal,
    );
  }

  private async validateWeight(
    employeeId: string,
    cycleId: string,
    newWeight: number,
    excludeGoalId?: string,
  ): Promise<void> {
    const query =
      this.goalRepository
        .createQueryBuilder('goal')
        .select(
          'COALESCE(SUM(goal.weight), 0)',
          'totalWeight',
        )
        .where(
          'goal.employee_id = :employeeId',
          { employeeId },
        )
        .andWhere(
          'goal.cycle_id = :cycleId',
          { cycleId },
        );

    if (excludeGoalId) {
      query.andWhere(
        'goal.id != :excludeGoalId',
        {
          excludeGoalId,
        },
      );
    }

    const result =
      await query.getRawOne();

    const currentWeight =
      Number(result.totalWeight) || 0;

    if (
      currentWeight + newWeight > 100
    ) {
      throw new BadRequestException(
        `Total goal weight cannot exceed 100%. Current weight is ${currentWeight}%`,
      );
    }
  }

  private validateCycleStatus(
    cycle: PerformanceCycle,
  ): void {
    if (
      cycle.status ===
      PerformanceCycleStatus.CLOSED
    ) {
      throw new ConflictException(
        'Closed performance cycle cannot be modified',
      );
    }
  }

  private validateDateRange(
    startDate: Date,
    endDate: Date,
  ): void {
    if (endDate < startDate) {
      throw new BadRequestException(
        'Goal end date cannot be before start date',
      );
    }
  }

  private parseDate(
    value: string,
  ): Date {
    const date = new Date(
      `${value}T00:00:00`,
    );

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        'Invalid date',
      );
    }

    return date;
  }
}
