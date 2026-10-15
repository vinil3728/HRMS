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

import { CreateLeaveDto } from '../dto/create-leave.dto';
import { UpdateLeaveDto } from '../dto/update-leave.dto';
import { LeaveQueryDto } from '../dto/leave-query.dto';
import { RejectLeaveDto } from '../dto/reject-leave.dto';

import { LeaveService } from '../services/leave.service';

import { EmployeeAccessGuard } from '../../../auth/guards/employee-access.guard';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

import { Permissions, AnyPermissions } from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller('employees/:employeeId/leaves')
export class LeaveController {
    constructor(
        private readonly leaveService: LeaveService,
    ) {}

    @Post()
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.LEAVE_CREATE)
    create(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Body()
        dto: CreateLeaveDto,
    ) {
        return this.leaveService.create(
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
        Permission.LEAVE_VIEW,
        Permission.MANAGE_TEAM_LEAVES,
        Permission.MANAGE_ALL_LEAVES,
    )
    findAll(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Query()
        query: LeaveQueryDto,
    ) {
        return this.leaveService.findAll(
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
    @AnyPermissions(
        Permission.LEAVE_SUMMARY_VIEW,
        Permission.MANAGE_TEAM_LEAVE_SUMMARY,
        Permission.MANAGE_ALL_LEAVE_SUMMARY,
    )
    getSummary(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Query('year')
        year: number,
    ) {
        return this.leaveService.getSummary(
            employeeId,
            Number(year),
        );
    }

    @Get(':leaveId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @AnyPermissions(
        Permission.LEAVE_VIEW,
        Permission.MANAGE_TEAM_LEAVES,
        Permission.MANAGE_ALL_LEAVES,
    )
    findOne(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'leaveId',
            new ParseUUIDPipe(),
        )
        leaveId: string,
    ) {
        return this.leaveService.findOne(
            employeeId,
            leaveId,
        );
    }

    @Patch(':leaveId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.LEAVE_EDIT)
    update(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'leaveId',
            new ParseUUIDPipe(),
        )
        leaveId: string,
        @Body()
        dto: UpdateLeaveDto,
    ) {
        return this.leaveService.update(
            employeeId,
            leaveId,
            dto,
        );
    }

    @Delete(':leaveId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.LEAVE_CANCEL)
    cancel(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'leaveId',
            new ParseUUIDPipe(),
        )
        leaveId: string,
    ) {
        return this.leaveService.cancel(
            employeeId,
            leaveId,
        );
    }

    @Post(':leaveId/approve')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @AnyPermissions(
        Permission.APPROVE_ALL_LEAVES,
        Permission.APPROVE_TEAM_LEAVES
    )
    approve(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'leaveId',
            new ParseUUIDPipe(),
        )
        leaveId: string,
    ) {
        return this.leaveService.approve(
            employeeId,
            leaveId,
        );
    }

    @Post(':leaveId/reject')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @AnyPermissions(
        Permission.REJECT_ALL_LEAVES,
        Permission.REJECT_TEAM_LEAVES
    )
    reject(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'leaveId',
            new ParseUUIDPipe(),
        )
        leaveId: string,
        @Body()
        dto: RejectLeaveDto,
    ) {
        return this.leaveService.reject(
            employeeId,
            leaveId,
            dto.rejectionReason,
        );
    }
}