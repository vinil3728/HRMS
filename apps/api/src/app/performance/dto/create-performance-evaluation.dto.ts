import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

import { PerformanceEvaluationType } from '../enums/performance-evaluation-type.enum';

export class CreatePerformanceEvaluationDto {
    @IsEnum(PerformanceEvaluationType)
    evaluationType!: PerformanceEvaluationType;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

    @IsOptional()
    @IsString()
    comments?: string | null;
}