import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoanType } from '../enums/loan.enums';

export class CreateLoanDto {
  @IsEnum(LoanType)
  @IsNotEmpty()
  loanType!: LoanType;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Min(500)
  amount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  tenureMonths!: number;

  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
