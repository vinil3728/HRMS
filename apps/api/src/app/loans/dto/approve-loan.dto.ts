import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveLoanDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  approvedAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  tenureMonths?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
