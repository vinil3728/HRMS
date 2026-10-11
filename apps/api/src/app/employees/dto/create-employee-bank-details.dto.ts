import {
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateEmployeeBankDetailsDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(150)
    accountHolderName!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(30)
    @Matches(/^\d+$/, {
        message:
            'Account number must contain only digits',
    })
    accountNumber!: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
        message:
            'IFSC code must be in valid format',
    })
    ifscCode!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    bankName!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    branchName!: string;
}
