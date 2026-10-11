import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';

import { PerformanceSummaryService } from '../services/performance-summary.service';
import { CreatePerformanceSummaryDto } from '../dto/create-performance-summary.dto';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { EmployeeAccessGuard } from '../../../auth/guards/employee-access.guard';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller(
    'employees/:employeeId/performance-cycles/:cycleId/summary',
)
export class PerformanceSummaryController {
    constructor(
        private readonly performanceSummaryService: PerformanceSummaryService,
    ) {}

    @Post('finalize')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
    )
    @Permissions(
        Permission.PERFORMANCE_SUMMARY_FINALIZE,
    )
    finalize(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'cycleId',
            new ParseUUIDPipe(),
        )
        cycleId: string,
        @Body()
        dto: CreatePerformanceSummaryDto,
    ) {
        return this.performanceSummaryService.finalize(
            employeeId,
            cycleId,
            dto,
        );
    }

    @Get()
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.PERFORMANCE_SUMMARY_VIEW,
    )
    findOne(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'cycleId',
            new ParseUUIDPipe(),
        )
        cycleId: string,
    ) {
        return this.performanceSummaryService.findOne(
            employeeId,
            cycleId,
        );
    }
}