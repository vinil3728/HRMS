import { Type } from 'class-transformer';
import {
    IsArray,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { PermissionAssignmentItemDto } from './assign-permissions.dto';

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

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PermissionAssignmentItemDto)
    permissions?: PermissionAssignmentItemDto[];
}