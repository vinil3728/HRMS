import {
    Controller,
    Get,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { AuthenticatedRequest, JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { ScopedTimesheetQueryDto } from '../dto/scoped-timesheet-query.dto';
import { TimesheetService } from '../services/timesheet.service';

@Controller('timesheets')
@UseGuards(
    JwtAuthGuard,
    PermissionGuard,
)
export class TimesheetOverviewController {
    constructor(
        private readonly timesheetService: TimesheetService,
    ) {}

    @Get()
    @Permissions(Permission.TIMESHEET_VIEW)
    findAll(
        @Req() request: AuthenticatedRequest,
        @Query() query: ScopedTimesheetQueryDto,
    ) {
        return this.timesheetService.findAllScoped(
            request.user,
            query,
        );
    }
}
