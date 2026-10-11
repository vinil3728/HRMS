import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RepaymentMode } from '../enums/loan.enums';

export class RecordPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amountPaid!: number;

  @IsEnum(RepaymentMode)
  @IsNotEmpty()
  paymentMode!: RepaymentMode;

  @IsDateString()
  @IsNotEmpty()
  paidAt!: string;

  @IsString()
  @IsOptional()
  receiptUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
