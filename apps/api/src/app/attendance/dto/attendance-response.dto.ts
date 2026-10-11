import { Attendance } from '../entities/attendance.entity';

export class AttendanceResponseDto {
    readonly data!: Attendance[];
    readonly total!: number;
    readonly page!: number;
    readonly limit!: number;
    readonly totalPages!: number;
}