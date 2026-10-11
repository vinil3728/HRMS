import { Leave } from '../entities/leave.entity';

export class LeaveResponseDto {
    readonly data!: Leave[];
    readonly total!: number;
    readonly page!: number;
    readonly limit!: number;
    readonly totalPages!: number;
}