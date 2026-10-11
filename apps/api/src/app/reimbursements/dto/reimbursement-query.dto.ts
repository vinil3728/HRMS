import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    Max,
    Min,
} from 'class-validator';

import { ReimbursementStatus } from '../enums/reimbursement-status.enum';

export class ReimbursementQueryDto {
    @IsOptional()
    @IsEnum(ReimbursementStatus)
    status?: ReimbursementStatus;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}