import {
    IsDateString,
    IsEmail,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class CreateEmployeeProfileDetailsDto {
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    gender?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    maritalStatus?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    bloodGroup?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    nationality?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    personalEmail?: string;

    @IsOptional()
    @IsString()
    @MaxLength(30)
    alternatePhone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    addressLine1?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    addressLine2?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    state?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    postalCode?: string;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    emergencyContactName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    emergencyContactRelationship?: string;

    @IsOptional()
    @IsString()
    @MaxLength(30)
    emergencyContactPhone?: string;
}
