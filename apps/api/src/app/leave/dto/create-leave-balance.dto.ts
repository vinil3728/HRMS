import {
    IsEnum,
    IsInt,
    IsNumber,
    Max,
    Min,
} from 'class-validator';

import { LeaveType } from '../enums/leave-type.enum';

export class CreateLeaveBalanceDto {
    @IsEnum(LeaveType)
    leaveType!: LeaveType;

    @IsInt()
    @Min(2020)
    @Max(2100)
    year!: number;

    @IsNumber()
    @Min(0)
    totalDays!: number;
}

