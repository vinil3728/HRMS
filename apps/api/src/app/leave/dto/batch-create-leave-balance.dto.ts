import { Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsInt,
    IsNumber,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';

import { LeaveType } from '../enums/leave-type.enum';

export class LeaveBalanceItemDto {
    @IsEnum(LeaveType)
    leaveType!: LeaveType;

    @IsNumber()
    @Min(0)
    totalDays!: number;
}

export class BatchCreateLeaveBalanceDto {
    @IsInt()
    @Min(2020)
    @Max(2100)
    year!: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LeaveBalanceItemDto)
    balances!: LeaveBalanceItemDto[];
}
