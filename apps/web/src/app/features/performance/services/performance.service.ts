import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_CONFIG } from '../../../core/config/api.config';
import {
  CreatePerformanceCycleDto,
  CreatePerformanceEvaluationDto,
  CreatePerformanceGoalDto,
  CreatePerformanceSummaryDto,
  PerformanceCycle,
  PerformanceEvaluation,
  PerformanceGoal,
  PerformanceSummary,
  UpdatePerformanceCycleDto,
  UpdatePerformanceEvaluationDto,
  UpdatePerformanceGoalDto,
} from '../models/performance.model';

@Injectable({
  providedIn: 'root',
})
export class PerformanceService {
  private readonly api = inject(ApiService);
  private readonly endpoints = API_CONFIG.endpoints.performance;

  // --- Cycles ---
  getCycles(): Observable<PerformanceCycle[]> {
    return this.api.get<PerformanceCycle[]>(this.endpoints.cycles);
  }

  getCycle(id: string): Observable<PerformanceCycle> {
    return this.api.get<PerformanceCycle>(this.endpoints.cycleDetail(id));
  }

  createCycle(dto: CreatePerformanceCycleDto): Observable<PerformanceCycle> {
    return this.api.post<PerformanceCycle>(this.endpoints.cycles, dto);
  }

  updateCycle(
    id: string,
    dto: UpdatePerformanceCycleDto
  ): Observable<PerformanceCycle> {
    return this.api.patch<PerformanceCycle>(
      this.endpoints.cycleDetail(id),
      dto
    );
  }

  deleteCycle(id: string): Observable<{ message: string } | void> {
    return this.api.delete(this.endpoints.cycleDetail(id));
  }

  // --- Goals ---
  getGoals(
    employeeId: string,
    cycleId: string
  ): Observable<PerformanceGoal[]> {
    return this.api.get<PerformanceGoal[]>(
      this.endpoints.goals(employeeId, cycleId)
    );
  }

  getGoal(
    employeeId: string,
    cycleId: string,
    goalId: string
  ): Observable<PerformanceGoal> {
    return this.api.get<PerformanceGoal>(
      this.endpoints.goalDetail(employeeId, cycleId, goalId)
    );
  }

  createGoal(
    employeeId: string,
    cycleId: string,
    dto: CreatePerformanceGoalDto
  ): Observable<PerformanceGoal> {
    return this.api.post<PerformanceGoal>(
      this.endpoints.goals(employeeId, cycleId),
      dto
    );
  }

  updateGoal(
    employeeId: string,
    cycleId: string,
    goalId: string,
    dto: UpdatePerformanceGoalDto
  ): Observable<PerformanceGoal> {
    return this.api.patch<PerformanceGoal>(
      this.endpoints.goalDetail(employeeId, cycleId, goalId),
      dto
    );
  }

  deleteGoal(
    employeeId: string,
    cycleId: string,
    goalId: string
  ): Observable<{ message: string } | void> {
    return this.api.delete(
      this.endpoints.goalDetail(employeeId, cycleId, goalId)
    );
  }

  // --- Evaluations ---
  getEvaluations(
    employeeId: string,
    cycleId: string,
    goalId: string
  ): Observable<PerformanceEvaluation[]> {
    return this.api.get<PerformanceEvaluation[]>(
      this.endpoints.evaluations(employeeId, cycleId, goalId)
    );
  }

  createEvaluation(
    employeeId: string,
    cycleId: string,
    goalId: string,
    dto: CreatePerformanceEvaluationDto
  ): Observable<PerformanceEvaluation> {
    return this.api.post<PerformanceEvaluation>(
      this.endpoints.evaluations(employeeId, cycleId, goalId),
      dto
    );
  }

  updateEvaluation(
    employeeId: string,
    cycleId: string,
    goalId: string,
    evaluationId: string,
    dto: UpdatePerformanceEvaluationDto
  ): Observable<PerformanceEvaluation> {
    return this.api.patch<PerformanceEvaluation>(
      this.endpoints.evaluationDetail(employeeId, cycleId, goalId, evaluationId),
      dto
    );
  }

  submitEvaluation(
    employeeId: string,
    cycleId: string,
    goalId: string,
    evaluationId: string
  ): Observable<PerformanceEvaluation> {
    return this.api.post<PerformanceEvaluation>(
      this.endpoints.submitEvaluation(employeeId, cycleId, goalId, evaluationId),
      {}
    );
  }

  // --- Summary ---
  getSummary(
    employeeId: string,
    cycleId: string
  ): Observable<PerformanceSummary> {
    return this.api.get<PerformanceSummary>(
      this.endpoints.summary(employeeId, cycleId)
    );
  }

  finalizeSummary(
    employeeId: string,
    cycleId: string,
    dto: CreatePerformanceSummaryDto
  ): Observable<PerformanceSummary> {
    return this.api.post<PerformanceSummary>(
      this.endpoints.finalizeSummary(employeeId, cycleId),
      dto
    );
  }
}
