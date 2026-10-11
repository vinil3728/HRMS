import {
    IsArray,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateRoleDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name!: string;

    @IsString()
    @MinLength(2)
    @MaxLength(100)
    code!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string | null;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    permissionIds?: string[];
}