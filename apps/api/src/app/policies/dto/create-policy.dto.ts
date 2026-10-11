import {
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreatePolicyDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    content!: string;

    @IsOptional()
    @IsString()
    version?: string;

    @IsOptional()
    @IsDateString()
    effectiveDate?: string;
}