import {
    IsDateString,
    IsOptional,
    IsString,
    IsNotEmpty,
} from 'class-validator';

export class UpdatePolicyDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    code?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    content?: string;

    @IsOptional()
    @IsString()
    version?: string | null;

    @IsOptional()
    @IsDateString()
    effectiveDate?: string | null;
}