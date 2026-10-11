import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import { PermissionService } from '../services/permission.service';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { UpdatePermissionDto } from '../dto/update-permission.dto';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionController {
    constructor(
        private readonly permissionService: PermissionService,
    ) {}

    @Get()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.PERMISSION_VIEW)
    findAll(@Query('all') all?: string) {
        return this.permissionService.findAll(all === 'true');
    }

    @Get(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.PERMISSION_VIEW)
    findById(
        @Param('id') id: string,
    ) {
        return this.permissionService.findById(id);
    }

    @Post()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.PERMISSION_CREATE)
    create(
        @Body() dto: CreatePermissionDto,
    ) {
        return this.permissionService.create(dto);
    }

    @Patch(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.PERMISSION_UPDATE)
    update(
        @Param('id') id: string,
        @Body() dto: UpdatePermissionDto,
    ) {
        return this.permissionService.update(id, dto);
    }

    @Patch(':id/activate')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.PERMISSION_ACTIVATE)
    activate(
        @Param('id') id: string,
    ) {
        return this.permissionService.activate(id);
    }

    @Patch(':id/deactivate')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.PERMISSION_DEACTIVATE)
    deactivate(
        @Param('id') id: string,
    ) {
        return this.permissionService.deactivate(id);
    }
}