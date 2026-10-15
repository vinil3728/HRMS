import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { UpdateEmployeeStatusDto } from '../dto/update-employee-status.dto';
import { EmployeeQueryDto } from '../dto/employee-query.dto';
import { EmployeeDirectoryQueryDto } from '../dto/employee-directory-query.dto';
import { EmployeeService } from '../services/employee.service';

import {
    AuthenticatedRequest,
    JwtAuthGuard,
} from '../../../auth/guards/jwt-auth.guard';
import { EmployeeAccessGuard } from '../../../auth/guards/employee-access.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

import {
    AnyPermissions,
    Permissions,
} from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeeController {
    constructor(
        private readonly employeeService: EmployeeService,
    ) {}

    @Post()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.EMPLOYEE_CREATE)
    create(
        @Body() createEmployeeDto: CreateEmployeeDto,
    ) {
        return this.employeeService.create(
            createEmployeeDto,
        );
    }

    @Get()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.EMPLOYEE_VIEWS)
    findAll(
        @Query() query: EmployeeQueryDto,
    ) {
        return this.employeeService.findAll(
            query,
        );
    }

    @Get('me')
    findMyProfile(
        @CurrentUser() user: AuthenticatedRequest['user'],
    ) {
        return this.employeeService.findMyProfile(
            user.employeeId,
        );
    }

    @Get('directory')
    @UseGuards(PermissionGuard)
    @AnyPermissions(
        Permission.EMPLOYEE_DIRECTORY_VIEW,
        Permission.ATTENDANCE_ALL_VIEW,
        Permission.ATTENDANCE_TEAM_VIEW,
        Permission.ATTENDANCE_CREATE,
        Permission.ATTENDANCE_UPDATE,
        Permission.ATTENDANCE_DELETE,
        Permission.EMPLOYEE_VIEWS,
        Permission.EMPLOYEE_UPDATE,
        Permission.LEAVE_BALANCE_CREATE,
        Permission.MANAGE_ALL_LEAVES,
        Permission.MANAGE_TEAM_LEAVES,
        Permission.APPROVE_ALL_LEAVES,
        Permission.APPROVE_TEAM_LEAVES,
        Permission.REJECT_ALL_LEAVES,
        Permission.REJECT_TEAM_LEAVES,
        Permission.ALL_LEAVE_BALANCE_VIEW,
        Permission.TEAM_LEAVE_BALANCE_VIEW,
        Permission.TIMESHEET_APPROVE,
        Permission.TIMESHEET_REJECT,
        Permission.REIMBURSEMENT_APPROVE,
        Permission.REIMBURSEMENT_REJECT,
        Permission.REIMBURSEMENT_PAY,
        Permission.PAYROLL_SUMMARY_VIEW,
        Permission.PAYROLL_PROCESS,
        Permission.PAYROLL_CREATE,
        Permission.PAYROLL_UPDATE,
        Permission.PAYROLL_APPROVE,
        Permission.PERFORMANCE_EVALUATION_CREATE,
        Permission.PERFORMANCE_SUMMARY_FINALIZE,
    )
    findDirectory(
        @CurrentUser() user: AuthenticatedRequest['user'],
        @Query() query: EmployeeDirectoryQueryDto,
    ) {
        return this.employeeService.findDirectory(
            user.userId,
            user.employeeId,
            query,
        );
    }

    @Get(':id')
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.EMPLOYEE_VIEW)
    findOne(
        @Param(
            'id',
            new ParseUUIDPipe(),
        )
        id: string,
    ) {
        return this.employeeService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.EMPLOYEE_UPDATE)
    update(
        @Param(
            'id',
            new ParseUUIDPipe(),
        )
        id: string,
        @Body()
        updateEmployeeDto: UpdateEmployeeDto,
    ) {
        return this.employeeService.update(
            id,
            updateEmployeeDto,
        );
    }

    @Patch(':id/status')
    @UseGuards(PermissionGuard)
    @Permissions(
        Permission.EMPLOYEE_STATUS_UPDATE,
    )
    updateStatus(
        @Param(
            'id',
            new ParseUUIDPipe(),
        )
        id: string,
        @Body()
        updateEmployeeStatusDto: UpdateEmployeeStatusDto,
    ) {
        return this.employeeService.updateStatus(
            id,
            updateEmployeeStatusDto,
        );
    }
}