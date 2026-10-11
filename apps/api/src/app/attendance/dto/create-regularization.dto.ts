import {
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
} from 'class-validator';

export class CreateRegularizationDto {
    @IsNotEmpty()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'attendanceDate must be in YYYY-MM-DD format',
    })
    attendanceDate!: string;

    @IsOptional()
    @IsString()
    requestedCheckIn?: string;

    @IsOptional()
    @IsString()
    requestedCheckOut?: string;

    @IsNotEmpty()
    @IsString()
    reason!: string;
}
