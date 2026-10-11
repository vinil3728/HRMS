import {
    IsDateString,
    IsOptional,
    IsString,
} from 'class-validator';

export class UpdateLeaveDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    reason?: string | null;
}