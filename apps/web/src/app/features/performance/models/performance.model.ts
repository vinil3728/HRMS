export enum PerformanceCycleStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export interface PerformanceCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PerformanceCycleStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePerformanceCycleDto {
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdatePerformanceCycleDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: PerformanceCycleStatus;
}

export enum PerformanceGoalStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface PerformanceGoal {
  id: string;
  title: string;
  description: string | null;
  target: string | null;
  weight: number;
  progress: number;
  status: PerformanceGoalStatus;
  startDate: string;
  endDate: string;
  evaluations?: PerformanceEvaluation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePerformanceGoalDto {
  title: string;
  description?: string;
  target?: string;
  weight: number;
  startDate: string;
  endDate: string;
}

export interface UpdatePerformanceGoalDto {
  title?: string;
  description?: string | null;
  target?: string | null;
  weight?: number;
  progress?: number;
  status?: PerformanceGoalStatus;
  startDate?: string;
  endDate?: string;
}

export enum PerformanceEvaluationType {
  SELF = 'SELF',
  MANAGER = 'MANAGER',
}

export enum PerformanceEvaluationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
}

export interface PerformanceEvaluation {
  id: string;
  evaluationType: PerformanceEvaluationType;
  rating: number | null;
  comments: string | null;
  status: PerformanceEvaluationStatus;
  goal?: PerformanceGoal;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePerformanceEvaluationDto {
  evaluationType: PerformanceEvaluationType;
  rating?: number;
  comments?: string | null;
}

export interface UpdatePerformanceEvaluationDto {
  rating?: number;
  comments?: string | null;
}

export interface PerformanceSummary {
  id: string;
  finalRating: number | null;
  comments: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePerformanceSummaryDto {
  comments?: string | null;
}
