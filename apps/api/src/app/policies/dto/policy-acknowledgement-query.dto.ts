import { IsOptional, IsUUID } from 'class-validator';

export class PolicyAcknowledgementQueryDto {
    @IsOptional()
    @IsUUID()
    policyId?: string;
}