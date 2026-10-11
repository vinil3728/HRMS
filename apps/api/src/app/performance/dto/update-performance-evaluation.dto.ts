import {
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class UpdatePerformanceEvaluationDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

    @IsOptional()
    @IsString()
    comments?: string | null;
}