import { IsOptional, IsString } from 'class-validator';

export class CreatePerformanceSummaryDto {
    @IsOptional()
    @IsString()
    comments?: string | null;
}