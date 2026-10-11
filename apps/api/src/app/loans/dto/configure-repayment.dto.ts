import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RepaymentMode } from '../enums/loan.enums';

export class ConfigureRepaymentDto {
  @IsEnum(RepaymentMode)
  @IsNotEmpty()
  repaymentMode!: RepaymentMode;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cashAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salaryDeductionAmount?: number;

  @IsDateString()
  @IsNotEmpty()
  repaymentStartDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenureMonths?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
