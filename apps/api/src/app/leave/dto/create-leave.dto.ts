import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

import { LeaveType } from '../enums/leave-type.enum';

export class CreateLeaveDto {
    @IsEnum(LeaveType)
    leaveType!: LeaveType;

    @IsDateString()
    @IsNotEmpty()
    startDate!: string;

    @IsDateString()
    @IsNotEmpty()
    endDate!: string;

    @IsOptional()
    @IsString()
    reason?: string;
}