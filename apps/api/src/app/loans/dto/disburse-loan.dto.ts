import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class DisburseLoanDto {
  @IsDateString()
  @IsNotEmpty()
  disbursedAt!: string;

  @IsString()
  @IsNotEmpty()
  disbursementReference!: string;

  @IsString()
  @IsOptional()
  disbursementReceiptUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
