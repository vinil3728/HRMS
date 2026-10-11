import {
    IsDateString,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsPhoneNumber,
    IsString,
    MinLength,
} from 'class-validator';

import { EmployeeStatus } from '../../app/employees/enums/employee-status.enum';

export class BootstrapAdminDto {
    // Department
    @IsString()
    @IsNotEmpty()
    departmentName!: string;

    @IsString()
    @IsNotEmpty()
    departmentCode!: string;

    // Designation
    @IsString()
    @IsNotEmpty()
    designationName!: string;

    @IsString()
    @IsNotEmpty()
    designationCode!: string;

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

    // Admin user
    @IsString()
    @IsNotEmpty()
    username!: string;

    @IsString()
    @MinLength(8)
    password!: string;
}
