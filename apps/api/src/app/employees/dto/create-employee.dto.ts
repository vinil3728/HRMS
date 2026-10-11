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

export class CreateEmployeeDto {

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsPhoneNumber('IN')
  phone!: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfJoining!: string;

  @IsNotEmpty()
  @IsEnum(EmployeeStatus)
  status!: EmployeeStatus;

  @IsUUID()
  departmentId!: string;

  @IsUUID()
  designationId!: string;

  @IsOptional()
  @IsUUID()
  managerId?: string | null;
}
