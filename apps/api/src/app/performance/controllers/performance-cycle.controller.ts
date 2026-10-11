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

import { CreatePerformanceCycleDto } from '../dto/create-performance-cycle.dto';
import { UpdatePerformanceCycleDto } from '../dto/update-performance-cycle.dto';
import { PerformanceCycleService } from '../services/performance-cycle.service';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller('performance-cycles')
@UseGuards(JwtAuthGuard)
export class PerformanceCycleController {
    constructor(
        private readonly performanceCycleService: PerformanceCycleService,
    ) {}

    @Post()
    @UseGuards(PermissionGuard)
    @Permissions(
        Permission.PERFORMANCE_CYCLE_CREATE,
    )
    create(
        @Body() dto: CreatePerformanceCycleDto,
    ) {
        return this.performanceCycleService.create(
            dto,
        );
    }

    @Get()
    @UseGuards(PermissionGuard)
    @Permissions(
        Permission.PERFORMANCE_CYCLE_VIEW,
    )
    findAll() {
        return this.performanceCycleService.findAll();
    }

    @Get(':cycleId')
    @UseGuards(PermissionGuard)
    @Permissions(
        Permission.PERFORMANCE_CYCLE_VIEW,
    )
    findOne(
        @Param(
            'cycleId',
            new ParseUUIDPipe(),
        )
        cycleId: string,
    ) {
        return this.performanceCycleService.findOne(
            cycleId,
        );
    }

    @Patch(':cycleId')
    @UseGuards(PermissionGuard)
    @Permissions(
        Permission.PERFORMANCE_CYCLE_UPDATE,
    )
    update(
        @Param(
            'cycleId',
            new ParseUUIDPipe(),
        )
        cycleId: string,
        @Body() dto: UpdatePerformanceCycleDto,
    ) {
        return this.performanceCycleService.update(
            cycleId,
            dto,
        );
    }

    @Delete(':cycleId')
    @UseGuards(PermissionGuard)
    @Permissions(
        Permission.PERFORMANCE_CYCLE_DELETE,
    )
    remove(
        @Param(
            'cycleId',
            new ParseUUIDPipe(),
        )
        cycleId: string,
    ) {
        return this.performanceCycleService.remove(
            cycleId,
        );
    }
}