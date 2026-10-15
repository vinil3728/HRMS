import { Type } from 'class-transformer';
import {
    IsArray,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';

export class PermissionAssignmentItemDto {
    @IsUUID('4')
    permissionId!: string;

    @IsArray()
    @IsString({ each: true })
    scopes!: string[];
}

export class AssignPermissionsDto {
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