import {
    IsDateString,
    IsNumber,
    IsOptional,
    IsString,
    IsNotEmpty,
    Max,
    Min,
} from 'class-validator';

export class UpdateReimbursementDto {
    @IsOptional()
    @IsDateString()
    expenseDate?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    category?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    @Max(10000000)
    amount?: number;

    @IsOptional()
    @IsString()
    currency?: string;
}