import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    Max,
    Min,
} from 'class-validator';

import { LeaveStatus } from '../enums/leave-status.enum';
import { LeaveType } from '../enums/leave-type.enum';

export class LeaveQueryDto {
    @IsOptional()
    @IsEnum(LeaveType)
    leaveType?: LeaveType;

    @IsOptional()
    @IsEnum(LeaveStatus)
    status?: LeaveStatus;

    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

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
