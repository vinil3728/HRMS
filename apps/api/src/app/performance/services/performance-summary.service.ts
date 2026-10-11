import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PerformanceSummary } from '../entities/performance-summary.entity';
import {
  PerformanceCycleStatus,
} from '../entities/performance-cycle.entity';

import { PerformanceGoal } from '../entities/performance-goal.entity';

import { PerformanceEvaluation } from '../entities/performance-evaluation.entity';

import { CreatePerformanceSummaryDto } from '../dto/create-performance-summary.dto';

import { PerformanceEvaluationType } from '../enums/performance-evaluation-type.enum';
import { PerformanceEvaluationStatus } from '../enums/performance-evaluation-status.enum';

import { PerformanceCycleService } from './performance-cycle.service';
import { EmployeeService } from '../../employees/services/employee.service';

@Injectable()
export class PerformanceSummaryService {
  constructor(
    @InjectRepository(PerformanceSummary)
    private readonly summaryRepository: Repository<PerformanceSummary>,

    @InjectRepository(PerformanceGoal)
    private readonly goalRepository: Repository<PerformanceGoal>,

    @InjectRepository(PerformanceEvaluation)
    private readonly evaluationRepository: Repository<PerformanceEvaluation>,

    private readonly employeeService: EmployeeService,

    private readonly performanceCycleService: PerformanceCycleService,
  ) {}

  async finalize(
    employeeId: string,
    cycleId: string,
    dto: CreatePerformanceSummaryDto,
  ) {
    const employee =
      await this.employeeService.findOne(
        employeeId,
      );

    const cycle =
      await this.performanceCycleService.findOne(
        cycleId,
      );

    if (
      cycle.status !==
      PerformanceCycleStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Performance cycle must be CLOSED before finalizing the summary',
      );
    }

    const existingSummary =
      await this.summaryRepository.findOne({
        where: {
          employee: {
            id: employeeId,
          },
          cycle: {
            id: cycleId,
          },
        },
      });

    if (existingSummary) {
      throw new ConflictException(
        'Performance summary has already been finalized',
      );
    }

    const goals =
      await this.goalRepository
        .createQueryBuilder('goal')
        .leftJoinAndSelect(
          'goal.employee',
          'employee',
        )
        .leftJoinAndSelect(
          'goal.cycle',
          'cycle',
        )
        .where(
          'employee.id = :employeeId',
          { employeeId },
        )
        .andWhere(
          'cycle.id = :cycleId',
          { cycleId },
        )
        .getMany();

    if (goals.length === 0) {
      throw new BadRequestException(
        'Cannot finalize summary because no performance goals exist',
      );
    }

    const totalWeight =
      goals.reduce(
        (sum, goal) =>
          sum + Number(goal.weight),
        0,
      );

    if (
      Math.abs(totalWeight - 100) >
      0.001
    ) {
      throw new BadRequestException(
        `Performance goal weights must total 100%. Current total: ${totalWeight}%`,
      );
    }

    const managerEvaluations =
      await this.evaluationRepository
        .createQueryBuilder('evaluation')
        .leftJoinAndSelect(
          'evaluation.goal',
          'goal',
        )
        .where(
          'evaluation.employee_id = :employeeId',
          { employeeId },
        )
        .andWhere(
          'evaluation.cycle_id = :cycleId',
          { cycleId },
        )
        .andWhere(
          'evaluation.evaluation_type = :evaluationType',
          {
            evaluationType:
              PerformanceEvaluationType.MANAGER,
          },
        )
        .getMany();

    const evaluationMap =
      new Map(
        managerEvaluations.map(
          (evaluation) => [
            evaluation.goal.id,
            evaluation,
          ],
        ),
      );

    for (const goal of goals) {
      const evaluation =
        evaluationMap.get(goal.id);

      if (!evaluation) {
        throw new BadRequestException(
          `Manager evaluation is missing for goal: ${goal.title}`,
        );
      }

      if (
        evaluation.status !==
        PerformanceEvaluationStatus.SUBMITTED
      ) {
        throw new BadRequestException(
          `Manager evaluation is not submitted for goal: ${goal.title}`,
        );
      }

      if (evaluation.rating === null) {
        throw new BadRequestException(
          `Manager rating is missing for goal: ${goal.title}`,
        );
      }
    }

    const finalRating =
      goals.reduce(
        (total, goal) => {
          const evaluation =
            evaluationMap.get(
              goal.id,
            )!;

          return (
            total +
            Number(evaluation.rating) *
              Number(goal.weight)
          );
        },
        0,
      ) / 100;

    const roundedRating =
      Number(
        finalRating.toFixed(2),
      );

    const summary =
      this.summaryRepository.create({
        employee,
        cycle,
        finalRating: roundedRating,
        comments:
          dto.comments ?? null,
      });

    return this.summaryRepository.save(
      summary,
    );
  }

  async findOne(
    employeeId: string,
    cycleId: string,
  ) {
    const summary =
      await this.summaryRepository.findOne({
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
      });

    if (!summary) {
      throw new NotFoundException(
        'Performance summary has not been finalized',
      );
    }

    return summary;
  }
}
