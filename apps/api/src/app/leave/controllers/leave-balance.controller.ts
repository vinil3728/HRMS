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

import { CreateLeaveBalanceDto } from '../dto/create-leave-balance.dto';
import { LeaveBalanceService } from '../services/leave-balance.service';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { EmployeeAccessGuard } from '../../../auth/guards/employee-access.guard';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller('employees/:employeeId/leave-balances')
export class LeaveBalanceController {
    constructor(
        private readonly leaveBalanceService: LeaveBalanceService,
    ) {}

    @Post()
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.LEAVE_BALANCE_CREATE,
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

    @Get()
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.LEAVE_BALANCE_VIEW,
    )
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
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.LEAVE_BALANCE_VIEW,
    )
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
