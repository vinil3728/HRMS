import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}