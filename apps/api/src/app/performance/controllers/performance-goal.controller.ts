import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CreatePerformanceGoalDto } from '../dto/create-performance-goal.dto';
import { UpdatePerformanceGoalDto } from '../dto/update-performance-goal.dto';
import { PerformanceGoalService } from '../services/performance-goal.service';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { EmployeeAccessGuard } from '../../../auth/guards/employee-access.guard';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller(
    'employees/:employeeId/performance-cycles/:cycleId/goals',
)
export class PerformanceGoalController {
    constructor(
        private readonly performanceGoalService: PerformanceGoalService,
    ) {}

    @Post()
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.PERFORMANCE_GOAL_CREATE,
    )
    create(
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
        dto: CreatePerformanceGoalDto,
    ) {
        return this.performanceGoalService.create(
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
        Permission.PERFORMANCE_GOAL_VIEW,
    )
    findAll(
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
        return this.performanceGoalService.findAll(
            employeeId,
            cycleId,
        );
    }

    @Get(':goalId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.PERFORMANCE_GOAL_VIEW,
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
        @Param(
            'goalId',
            new ParseUUIDPipe(),
        )
        goalId: string,
    ) {
        return this.performanceGoalService.findOne(
            employeeId,
            cycleId,
            goalId,
        );
    }

    @Patch(':goalId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.PERFORMANCE_GOAL_UPDATE,
    )
    update(
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
        @Param(
            'goalId',
            new ParseUUIDPipe(),
        )
        goalId: string,
        @Body()
        dto: UpdatePerformanceGoalDto,
    ) {
        return this.performanceGoalService.update(
            employeeId,
            cycleId,
            goalId,
            dto,
        );
    }

    @Delete(':goalId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.PERFORMANCE_GOAL_DELETE,
    )
    remove(
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
        @Param(
            'goalId',
            new ParseUUIDPipe(),
        )
        goalId: string,
    ) {
        return this.performanceGoalService.remove(
            employeeId,
            cycleId,
            goalId,
        );
    }
}
