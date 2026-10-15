import {
    IsNotEmpty,
    IsNumber,
    IsString,
    MinLength,
} from 'class-validator';

export class AdjustLeaveBalanceDto {
    @IsNumber()
    @IsNotEmpty()
    adjustmentDays!: number;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    reason!: string;
}
