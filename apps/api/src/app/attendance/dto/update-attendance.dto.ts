import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
} from 'class-validator';

import { AttendanceStatus } from '../enums/attendance-status.enum';

export class UpdateAttendanceDto {
    @IsOptional()
    @IsDateString()
    attendanceDate?: string;

    @IsOptional()
    @IsDateString()
    checkIn?: string | null;

    @IsOptional()
    @IsDateString()
    checkOut?: string | null;

    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;

    @IsOptional()
    @IsString()
    remarks?: string | null;
}