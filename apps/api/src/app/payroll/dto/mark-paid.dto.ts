import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
} from 'class-validator';
import { PaymentMode } from '../enums/payment-mode.enum';

export class MarkPaidDto {
    @IsOptional()
    @IsEnum(PaymentMode)
    paymentMode?: PaymentMode;

    @IsOptional()
    @IsString()
    paymentReference?: string;

    @IsOptional()
    @IsDateString()
    paidAt?: string;
}
