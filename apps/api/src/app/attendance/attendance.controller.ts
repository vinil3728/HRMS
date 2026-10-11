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
    UseGuards,
} from '@nestjs/common';

import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { AttendanceService } from './attendance.service';

import { EmployeeAccessGuard } from '../../auth/guards/employee-access.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import {
    AnyPermissions,
    Permissions,
} from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';
import { PermissionGuard } from '../permissions/guards/permission.guard';

@Controller('employees/:employeeId/attendance')
export class AttendanceController {
    constructor(
        private readonly attendanceService: AttendanceService,
    ) {}

    @Post()
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.ATTENDANCE_CREATE)
    create(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Body()
        dto: CreateAttendanceDto,
    ) {
        return this.attendanceService.create(
            employeeId,
            dto,
        );
    }

    @Get()
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @AnyPermissions(
        Permission.ATTENDANCE_VIEW,
        Permission.ATTENDANCE_TEAM_VIEW,
        Permission.ATTENDANCE_ALL_VIEW,
    )
    findAll(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Query()
        query: AttendanceQueryDto,
    ) {
        return this.attendanceService.findAll(
            employeeId,
            query,
        );
    }

    @Get('summary')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.ATTENDANCE_SUMMARY_VIEW,
    )
    getMonthlySummary(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Query('month')
        month: string,
    ) {
        return this.attendanceService.getMonthlySummary(
            employeeId,
            month,
        );
    }

    @Post('check-in')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.ATTENDANCE_CHECK_IN,
    )
    checkIn(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
    ) {
        return this.attendanceService.checkIn(
            employeeId,
        );
    }

    @Post('check-out')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.ATTENDANCE_CHECK_OUT,
    )
    checkOut(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
    ) {
        return this.attendanceService.checkOut(
            employeeId,
        );
    }

    @Get(':attendanceId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @AnyPermissions(
        Permission.ATTENDANCE_VIEW,
        Permission.ATTENDANCE_TEAM_VIEW,
        Permission.ATTENDANCE_ALL_VIEW,
    )
    findOne(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'attendanceId',
            new ParseUUIDPipe(),
        )
        attendanceId: string,
    ) {
        return this.attendanceService.findOne(
            employeeId,
            attendanceId,
        );
    }

    @Patch(':attendanceId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.ATTENDANCE_UPDATE)
    update(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'attendanceId',
            new ParseUUIDPipe(),
        )
        attendanceId: string,
        @Body()
        dto: UpdateAttendanceDto,
    ) {
        return this.attendanceService.update(
            employeeId,
            attendanceId,
            dto,
        );
    }

    @Delete(':attendanceId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.ATTENDANCE_DELETE)
    remove(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'attendanceId',
            new ParseUUIDPipe(),
        )
        attendanceId: string,
    ) {
        return this.attendanceService.remove(
            employeeId,
            attendanceId,
        );
    }
}
