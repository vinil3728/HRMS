import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min} from "class-validator";
import { Type } from "class-transformer";
import { EmployeeStatus } from "../enums/employee-status.enum";

export class EmployeeQueryDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @Min(1)
    @IsInt()
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @Min(1)
    @Max(100)
    @IsInt()
    limit?: number;

    @IsOptional()
    @IsEnum(EmployeeStatus)
    status?: string
}