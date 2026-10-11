import {
    IsDateString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreateReimbursementDto {
    @IsDateString()
    expenseDate!: string;

    @IsString()
    @IsNotEmpty()
    category!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsNumber()
    @Min(0.01)
    @Max(10000000)
    amount!: number;

    @IsOptional()
    @IsString()
    currency?: string;
}