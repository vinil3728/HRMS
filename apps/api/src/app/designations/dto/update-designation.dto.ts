import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateDesignationDto {
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
  departmentId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}