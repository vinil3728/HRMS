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

import { ScopeAccessGuard } from '../../../auth/guards/scope-access.guard';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

import { Permissions, AnyPermissions } from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller('employees/:employeeId/leaves')
@UseGuards(
    JwtAuthGuard,
    PermissionGuard,
    ScopeAccessGuard,
)
export class LeaveController {
    constructor(
        private readonly leaveService: LeaveService,
    ) {}

    @Post()
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
    @Permissions(Permission.LEAVE_SUMMARY_VIEW)
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
    @AnyPermissions(
        Permission.LEAVE_UPDATE,
        Permission.LEAVE_EDIT
    )
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
    @AnyPermissions(
        Permission.LEAVE_CANCEL,
        Permission.LEAVE_DELETE
    )
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