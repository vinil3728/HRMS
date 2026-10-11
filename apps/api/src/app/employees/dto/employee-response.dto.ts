import { Employee } from "../entities/employee.entity";

export class EmployeeResponseDto {
    readonly data!: Employee[];
    readonly total!: number;
    readonly page!: number;
    readonly limit!: number;
    readonly totalPages!: number;
}