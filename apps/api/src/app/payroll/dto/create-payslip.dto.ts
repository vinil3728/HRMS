import {
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
} from 'class-validator';
import { PaymentMode } from '../enums/payment-mode.enum';
import { PayslipStatus } from '../enums/payslip-status.enum';

export class CreatePayslipDto {
    @IsUUID()
    employeeId!: string;

    @IsOptional()
    @IsUUID()
    payrollRunId?: string;

    @IsInt()
    @Min(1)
    @Max(12)
    month!: number;

    @IsInt()
    @Min(2000)
    @Max(2100)
    year!: number;

    @IsDateString()
    payPeriodStart!: string;

    @IsDateString()
    payPeriodEnd!: string;

    @IsDateString()
    payDate!: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    workingDays?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    paidDays?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    lossOfPayDays?: number;

    @IsNumber()
    @Min(0)
    basicSalary!: number;

    @IsNumber()
    @Min(0)
    hra!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    conveyance?: number;

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
    bonus?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    overtimePay?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    reimbursements?: number;

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
    @IsNumber()
    @Min(0)
    lossOfPayDeduction?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    otherDeductions?: number;

    @IsOptional()
    @IsEnum(PayslipStatus)
    status?: PayslipStatus;

    @IsOptional()
    @IsEnum(PaymentMode)
    paymentMode?: PaymentMode;

    @IsOptional()
    @IsString()
    remarks?: string;
}
