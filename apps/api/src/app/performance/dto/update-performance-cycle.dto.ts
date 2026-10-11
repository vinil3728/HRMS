import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
} from 'class-validator';

import { PerformanceCycleStatus } from '../entities/performance-cycle.entity';

export class UpdatePerformanceCycleDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsEnum(PerformanceCycleStatus)
    status?: PerformanceCycleStatus;
}