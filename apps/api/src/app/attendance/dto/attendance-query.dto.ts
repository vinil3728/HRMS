import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    Max,
    Min,
} from 'class-validator';

import { AttendanceStatus } from '../enums/attendance-status.enum';

export class AttendanceQueryDto {
    @IsOptional()
    @IsDateString()
    @IsNotEmpty()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    @IsNotEmpty()
    toDate?: string;

    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}