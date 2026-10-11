import {
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdatePermissionDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    code?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    module?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string | null;
}
