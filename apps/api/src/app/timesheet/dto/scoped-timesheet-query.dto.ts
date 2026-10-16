import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
} from 'class-validator';

import { TimesheetStatus } from '../enums/timesheet-status.enum';
import { PermissionScope } from '../../permissions/enums/permission-scope.enum';

export class ScopedTimesheetQueryDto {
    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @IsOptional()
    @IsDateString()
    toDate?: string;

    @IsOptional()
    @IsEnum(TimesheetStatus)
    status?: TimesheetStatus;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Max(100)
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @IsUUID()
    employeeId?: string;

    @IsOptional()
    @IsEnum(PermissionScope)
    scope?: PermissionScope;
}
