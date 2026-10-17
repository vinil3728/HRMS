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

import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentService } from './department.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { Permissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';
import { PermissionGuard } from '../permissions/guards/permission.guard';

@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DepartmentController {
    constructor(
        private readonly departmentService: DepartmentService,
    ) {}

    @Post()
    @Permissions(Permission.DPT_CREATE)
    create(
        @Body() dto: CreateDepartmentDto,
    ) {
        return this.departmentService.create(dto);
    }

    @Get()
    @Permissions(Permission.DPT_VIEW)
    findAll(
        @Query('branchId') branchId?: string,
    ) {
        return this.departmentService.findAll(branchId);
    }

    @Get(':id')
    @Permissions(Permission.DPT_VIEW)
    findOne(
        @Param(
            'id',
            new ParseUUIDPipe(),
        )
        id: string,
    ) {
        return this.departmentService.findOne(id);
    }

    @Patch(':id')
    @Permissions(Permission.DPT_UPDATE)
    update(
        @Param(
            'id',
            new ParseUUIDPipe(),
        )
        id: string,
        @Body() dto: UpdateDepartmentDto,
    ) {
        return this.departmentService.update(
            id,
            dto,
        );
    }
}