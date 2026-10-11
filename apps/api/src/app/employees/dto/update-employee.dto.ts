import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
} from 'class-validator';

import { EmployeeStatus } from '../enums/employee-status.enum';

export class UpdateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsPhoneNumber('IN')
  @IsOptional()
  phone?: string;

  @IsDateString()
  @IsOptional()
  dateOfJoining?: string;

  @IsEnum(EmployeeStatus)
  @IsOptional()
  status?: EmployeeStatus;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @IsUUID()
  @IsOptional()
  designationId?: string;

  @IsOptional()
  @IsUUID()
  managerId?: string | null;
}