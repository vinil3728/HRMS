import {
    IsDateString,
    IsNotEmpty,
    IsNumber,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class CreateTimesheetDto {
    @IsDateString()
    @IsNotEmpty()
    workDate!: string;

    @IsString()
    @IsNotEmpty()
    project!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsNumber()
    @Min(0.25)
    @Max(24)
    hours!: number;
}
