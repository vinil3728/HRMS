import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  code?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}