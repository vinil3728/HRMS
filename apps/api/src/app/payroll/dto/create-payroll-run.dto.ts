import {
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreatePayrollRunDto {
    @IsInt()
    @Min(1)
    @Max(12)
    month!: number;

    @IsInt()
    @Min(2000)
    @Max(2100)
    year!: number;

    @IsOptional()
    @IsString()
    notes?: string;
}
