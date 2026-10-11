import { IsEnum, IsOptional } from 'class-validator';

import { PolicyStatus } from '../enums/policy-status.enum';

export class PolicyQueryDto {
    @IsOptional()
    @IsEnum(PolicyStatus)
    status?: PolicyStatus;
}