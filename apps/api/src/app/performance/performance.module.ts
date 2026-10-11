import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PerformanceCycle } from '../performance/entities/performance-cycle.entity';
import { PerformanceGoal } from '../performance/entities/performance-goal.entity';
import { PerformanceEvaluation } from '../performance/entities/performance-evaluation.entity';
import { PerformanceSummary } from '../performance/entities/performance-summary.entity';
import { Employee } from '../employees/entities/employee.entity';

import { PerformanceCycleController } from '../performance/controllers/performance-cycle.controller';
import { PerformanceGoalController } from '../performance/controllers/performance-goal.controller';
import { PerformanceEvaluationController } from '../performance/controllers/performance-evaluation.controller';
import { PerformanceSummaryController } from '../performance/controllers/performance-summary.controller';

import { PerformanceCycleService } from '../performance/services/performance-cycle.service';
import { PerformanceGoalService } from '../performance/services/performance-goal.service';
import { PerformanceEvaluationService } from '../performance/services/performance-evaluation.service';
import { PerformanceSummaryService } from '../performance/services/performance-summary.service';

import { EmployeesModule } from '../employees/employees.module';
import { AuthModule } from '../../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PerformanceCycle,
      PerformanceGoal,
      PerformanceEvaluation,
      PerformanceSummary,
      Employee,
    ]),

    EmployeesModule,
    AuthModule,
    PermissionsModule
  ],

  controllers: [
    PerformanceCycleController,
    PerformanceGoalController,
    PerformanceEvaluationController,
    PerformanceSummaryController,
  ],

  providers: [
    PerformanceCycleService,
    PerformanceGoalService,
    PerformanceEvaluationService,
    PerformanceSummaryService,
  ],

  exports: [
    PerformanceCycleService,
    PerformanceGoalService,
    PerformanceEvaluationService,
    PerformanceSummaryService,
  ],
})
export class PerformanceModule {}
