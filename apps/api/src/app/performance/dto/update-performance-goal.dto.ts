import {
    IsDateString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

import { PerformanceGoalStatus } from '../enums/performance-goal-status.enum';

export class UpdatePerformanceGoalDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsString()
    target?: string | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    weight?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    progress?: number;

    @IsOptional()
    @IsEnum(PerformanceGoalStatus)
    status?: PerformanceGoalStatus;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}