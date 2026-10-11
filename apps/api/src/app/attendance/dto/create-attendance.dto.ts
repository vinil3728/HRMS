import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from 'class-validator';

import { AttendanceStatus } from '../enums/attendance-status.enum';

export class CreateAttendanceDto {
    @IsDateString()
    @IsNotEmpty()
    attendanceDate!: string;

    @IsOptional()
    @IsDateString()
    checkIn?: string;

    @IsOptional()
    @IsDateString()
    checkOut?: string;

    @IsEnum(AttendanceStatus)
    status!: AttendanceStatus;

    @IsOptional()
    @IsString()
    remarks?: string;
}