import { IsOptional, IsString } from 'class-validator';

export class EmployeeDirectoryQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    departmentId?: string;

    @IsOptional()
    @IsString()
    designationId?: string;
}
