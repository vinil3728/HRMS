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
import { ManagerAccessGuard } from '../../../auth/guards/manager-access.guard';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
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
    @Permissions(Permission.LEAVE_VIEW)
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
    @Permissions(
        Permission.LEAVE_SUMMARY_VIEW,
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
    @Permissions(Permission.LEAVE_VIEW)
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
    @Permissions(Permission.LEAVE_UPDATE)
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
    @Permissions(Permission.LEAVE_DELETE)
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
        ManagerAccessGuard,
    )
    @Permissions(Permission.LEAVE_APPROVE)
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
        ManagerAccessGuard,
    )
    @Permissions(Permission.LEAVE_REJECT)
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