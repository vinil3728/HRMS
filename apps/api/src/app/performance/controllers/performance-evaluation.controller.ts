import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CreatePerformanceEvaluationDto } from '../dto/create-performance-evaluation.dto';
import { UpdatePerformanceEvaluationDto } from '../dto/update-performance-evaluation.dto';
import { PerformanceEvaluationService } from '../services/performance-evaluation.service';
import { PerformanceEvaluationType } from '../enums/performance-evaluation-type.enum';

import {
    AuthenticatedRequest,
    JwtAuthGuard,
} from '../../../auth/guards/jwt-auth.guard';

import { EmployeeAccessGuard } from '../../../auth/guards/employee-access.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller(
    'employees/:employeeId/performance-cycles/:cycleId/goals/:goalId/evaluations',
)
export class PerformanceEvaluationController {
    constructor(
        private readonly performanceEvaluationService: PerformanceEvaluationService,
    ) {}

    @Post()
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
    )
    @Permissions(
        Permission.PERFORMANCE_EVALUATION_CREATE,
    )
    async create(
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
        dto: CreatePerformanceEvaluationDto,
        @CurrentUser()
        user: AuthenticatedRequest['user'],
    ) {
        await this.performanceEvaluationService.validateEvaluationAccess(
            user,
            employeeId,
            dto.evaluationType as PerformanceEvaluationType,
        );

        return this.performanceEvaluationService.create(
            employeeId,
            cycleId,
            goalId,
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
        Permission.PERFORMANCE_EVALUATION_VIEW,
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
        @Param(
            'goalId',
            new ParseUUIDPipe(),
        )
        goalId: string,
    ) {
        return this.performanceEvaluationService.findAll(
            employeeId,
            cycleId,
            goalId,
        );
    }

    @Get(':evaluationId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.PERFORMANCE_EVALUATION_VIEW,
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
        @Param(
            'evaluationId',
            new ParseUUIDPipe(),
        )
        evaluationId: string,
    ) {
        return this.performanceEvaluationService.findOne(
            employeeId,
            cycleId,
            goalId,
            evaluationId,
        );
    }

    @Patch(':evaluationId')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
    )
    @Permissions(
        Permission.PERFORMANCE_EVALUATION_UPDATE,
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
        @Param(
            'evaluationId',
            new ParseUUIDPipe(),
        )
        evaluationId: string,
        @Body()
        dto: UpdatePerformanceEvaluationDto,
        @CurrentUser()
        user: AuthenticatedRequest['user'],
    ) {
        return this.performanceEvaluationService.update(
            employeeId,
            cycleId,
            goalId,
            evaluationId,
            dto,
            user,
        );
    }

    @Post(':evaluationId/submit')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        Permission.PERFORMANCE_EVALUATION_SUBMIT,
    )
    submit(
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
        @Param(
            'evaluationId',
            new ParseUUIDPipe(),
        )
        evaluationId: string,
        @CurrentUser()
        user: AuthenticatedRequest['user'],
    ) {
        return this.performanceEvaluationService.submit(
            employeeId,
            cycleId,
            goalId,
            evaluationId,
            user,
        );
    }
}