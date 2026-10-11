import {
    IsBoolean,
    IsDateString,
    IsNumber,
    IsOptional,
    IsUUID,
    Min,
} from 'class-validator';

export class CreateSalaryStructureDto {
    @IsUUID()
    employeeId!: string;

    @IsNumber()
    @Min(0)
    ctc!: number;

    @IsNumber()
    @Min(0)
    basicSalary!: number;

    @IsNumber()
    @Min(0)
    hra!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    conveyanceAllowance?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    medicalAllowance?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    specialAllowance?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    providentFund?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    professionalTax?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    tds?: number;

    @IsOptional()
    @IsDateString()
    effectiveFrom?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
