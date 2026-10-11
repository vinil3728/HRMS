import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateDesignationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}