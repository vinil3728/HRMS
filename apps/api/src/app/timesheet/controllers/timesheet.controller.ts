import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import {
    AuthenticatedRequest,
    JwtAuthGuard,
} from '../../../auth/guards/jwt-auth.guard';
import { EmployeeAccessGuard } from '../../../auth/guards/employee-access.guard';

import { CreateTimesheetDto } from '../dto/create-timesheet.dto';
import { RejectTimesheetDto } from '../dto/reject-timesheet.dto';
import { TimesheetQueryDto } from '../dto/timesheet-query.dto';
import { UpdateTimesheetDto } from '../dto/update-timesheet.dto';
import { TimesheetService } from '../services/timesheet.service';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';
import { Permissions } from '../../permissions/decorators/permissions.decorator';

@Controller('employees/:employeeId/timesheets')
@UseGuards(JwtAuthGuard)
export class TimesheetController {
    constructor(
        private readonly timesheetService: TimesheetService,
    ) { }

    @Post()
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.TIMESHEET_CREATE)
    create(
        @Param('employeeId', ParseUUIDPipe)
        employeeId: string,
        @Body() dto: CreateTimesheetDto,
    ) {
        return this.timesheetService.create(
            employeeId,
            dto,
        );
    }

    @Get()
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.TIMESHEET_VIEW)
    findAll(
        @Param('employeeId', ParseUUIDPipe)
        employeeId: string,
        @Query() query: TimesheetQueryDto,
    ) {
        return this.timesheetService.findAll(
            employeeId,
            query,
        );
    }

    @Get('summary')
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.TIMESHEET_SUMMARY_VIEW,
    )
    getSummary(
        @Param('employeeId', ParseUUIDPipe)
        employeeId: string,
    ) {
        return this.timesheetService.getSummary(
            employeeId,
        );
    }

    @Get(':timesheetId')
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.TIMESHEET_VIEW)
    findOne(
        @Param('employeeId', ParseUUIDPipe)
        employeeId: string,
        @Param('timesheetId', ParseUUIDPipe)
        timesheetId: string,
    ) {
        return this.timesheetService.findOne(
            employeeId,
            timesheetId,
        );
    }

    @Patch(':timesheetId')
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.TIMESHEET_UPDATE)
    update(
        @Param('employeeId', ParseUUIDPipe)
        employeeId: string,
        @Param('timesheetId', ParseUUIDPipe)
        timesheetId: string,
        @Body() dto: UpdateTimesheetDto,
    ) {
        return this.timesheetService.update(
            employeeId,
            timesheetId,
            dto,
        );
    }

    @Delete(':timesheetId')
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.TIMESHEET_DELETE)
    remove(
        @Param('employeeId', ParseUUIDPipe)
        employeeId: string,
        @Param('timesheetId', ParseUUIDPipe)
        timesheetId: string,
    ) {
        return this.timesheetService.remove(
            employeeId,
            timesheetId,
        );
    }

    @Post(':timesheetId/submit')
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.TIMESHEET_SUBMIT)
    submit(
        @Param('employeeId', ParseUUIDPipe)
        employeeId: string,
        @Param('timesheetId', ParseUUIDPipe)
        timesheetId: string,
    ) {
        return this.timesheetService.submit(
            employeeId,
            timesheetId,
        );
    }

    @Post(':timesheetId/approve')
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.TIMESHEET_APPROVE)
    approve(
        @Param('employeeId', ParseUUIDPipe)
        employeeId: string,
        @Param('timesheetId', ParseUUIDPipe)
        timesheetId: string,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.timesheetService.approve(
            employeeId,
            timesheetId,
            request.user.employeeId,
            request.user.role,
        );
    }

    @Post(':timesheetId/reject')
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.TIMESHEET_REJECT)
    reject(
        @Param('employeeId', ParseUUIDPipe)
        employeeId: string,
        @Param('timesheetId', ParseUUIDPipe)
        timesheetId: string,
        @Body() dto: RejectTimesheetDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.timesheetService.reject(
            employeeId,
            timesheetId,
            request.user.employeeId,
            dto,
            request.user.role,
        );
    }
}
