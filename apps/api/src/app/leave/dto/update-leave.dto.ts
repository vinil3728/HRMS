import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
} from 'class-validator';

import { LeaveType } from '../enums/leave-type.enum';

export class UpdateLeaveDto {
    @IsOptional()
    @IsEnum(LeaveType)
    leaveType?: LeaveType;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    reason?: string | null;

    @IsOptional()
    isHalfDay?: boolean;

    @IsOptional()
    @IsString()
    halfDaySession?: string | null;
}