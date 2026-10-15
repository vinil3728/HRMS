import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    ParseUUIDPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import { AdjustLeaveBalanceDto } from '../dto/adjust-leave-balance.dto';
import { CreateLeaveBalanceDto } from '../dto/create-leave-balance.dto';
import { LeaveBalanceService } from '../services/leave-balance.service';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ScopeAccessGuard } from '../../../auth/guards/scope-access.guard';

import { AnyPermissions, Permissions } from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller('employees/:employeeId/leave-balances')
@UseGuards(
    JwtAuthGuard,
    PermissionGuard,
    ScopeAccessGuard,
)
export class LeaveBalanceController {
    constructor(
        private readonly leaveBalanceService: LeaveBalanceService,
    ) {}

    @Post()
    @AnyPermissions(
        Permission.LEAVE_BALANCE_CREATE,
        Permission.LEAVE_BALANCE_ADJUST,
    )
    create(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Body()
        dto: CreateLeaveBalanceDto,
    ) {
        return this.leaveBalanceService.create(
            employeeId,
            dto,
        );
    }

    @Post(':balanceId/adjust')
    @Permissions(Permission.LEAVE_BALANCE_ADJUST)
    adjust(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'balanceId',
            new ParseUUIDPipe(),
        )
        balanceId: string,
        @Body()
        dto: AdjustLeaveBalanceDto,
    ) {
        return this.leaveBalanceService.adjust(
            employeeId,
            balanceId,
            dto,
        );
    }

    @Get()
    @Permissions(Permission.LEAVE_BALANCE_VIEW)
    findAll(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Query(
            'year',
            new ParseIntPipe({
                optional: true,
            }),
        )
        year?: number,
    ) {
        return this.leaveBalanceService.findAll(
            employeeId,
            year,
        );
    }

    @Get(':balanceId')
    @Permissions(Permission.LEAVE_BALANCE_VIEW)
    findOne(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'balanceId',
            new ParseUUIDPipe(),
        )
        balanceId: string,
    ) {
        return this.leaveBalanceService.findOne(
            employeeId,
            balanceId,
        );
    }
}
