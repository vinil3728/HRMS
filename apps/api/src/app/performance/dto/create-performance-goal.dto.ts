import {
    IsDateString,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreatePerformanceGoalDto {
    @IsString()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    target?: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    weight!: number;

    @IsDateString()
    startDate!: string;

    @IsDateString()
    endDate!: string;
}