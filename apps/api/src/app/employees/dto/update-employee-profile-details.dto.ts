import {
    IsDateString,
    IsEmail,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class UpdateEmployeeProfileDetailsDto {
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    gender?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    maritalStatus?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    bloodGroup?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    nationality?: string | null;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    personalEmail?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(30)
    alternatePhone?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    addressLine1?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    addressLine2?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    state?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    postalCode?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    emergencyContactName?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    emergencyContactRelationship?: string | null;

    @IsOptional()
    @IsString()
    @MaxLength(30)
    emergencyContactPhone?: string | null;
}
