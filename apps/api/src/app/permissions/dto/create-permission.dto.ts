import {
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreatePermissionDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    code!: string;

    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name!: string;

    @IsOptional()
    @IsUUID()
    moduleId?: string;

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
