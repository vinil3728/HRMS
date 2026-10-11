import {
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    Matches,
} from 'class-validator';
import { HolidayType } from '../entities/company-holiday.entity';

export class UpdateHolidayDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'date must be in YYYY-MM-DD format',
    })
    date?: string;

    @IsOptional()
    @IsString()
    dayOfWeek?: string;

    @IsOptional()
    @IsEnum(HolidayType)
    type?: HolidayType;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
