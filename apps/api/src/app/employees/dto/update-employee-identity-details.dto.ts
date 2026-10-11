import {
    IsOptional,
    IsString,
    Matches,
} from 'class-validator';

export class UpdateEmployeeIdentityDetailsDto {
    @IsOptional()
    @IsString()
    @Matches(/^\d{12}$/, {
        message:
            'Aadhaar number must contain exactly 12 digits',
    })
    aadhaarNumber?: string | null;

    @IsOptional()
    @IsString()
    @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, {
        message:
            'PAN number must be in valid format',
    })
    panNumber?: string | null;
}