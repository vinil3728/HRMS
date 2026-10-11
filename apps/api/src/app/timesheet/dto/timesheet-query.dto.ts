import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    Max,
    Min,
} from 'class-validator';

import { TimesheetStatus } from '../enums/timesheet-status.enum';

export class TimesheetQueryDto {
    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @IsEnum(TimesheetStatus)
    status?: TimesheetStatus;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Max(100)
    @Min(1)
    limit?: number;
}
