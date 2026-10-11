import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
} from 'class-validator';
import { HolidayType } from '../entities/company-holiday.entity';

export class CreateHolidayDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'date must be in YYYY-MM-DD format',
    })
    date: string;

    @IsOptional()
    @IsString()
    dayOfWeek?: string;

    @IsNotEmpty()
    @IsEnum(HolidayType)
    type: HolidayType;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
