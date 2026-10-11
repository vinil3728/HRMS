import {
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateEmployeeBankDetailsDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    accountHolderName?: string;

    @IsOptional()
    @IsString()
    @MinLength(5)
    @MaxLength(30)
    @Matches(/^\d+$/, {
        message:
            'Account number must contain only digits',
    })
    accountNumber?: string;

    @IsOptional()
    @IsString()
    @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
        message:
            'IFSC code must be in valid format',
    })
    ifscCode?: string;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    bankName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    branchName?: string;
}
