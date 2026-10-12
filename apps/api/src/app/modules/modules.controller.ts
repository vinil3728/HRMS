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

import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { AnyPermissions, Permissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';

@Controller('modules')
@UseGuards(JwtAuthGuard)
export class ModulesController {
    constructor(private readonly modulesService: ModulesService) {}

    @Get()
    @UseGuards(PermissionGuard)
    @AnyPermissions(
        Permission.MODULE_VIEW,
        Permission.PERMISSION_VIEW,
        Permission.PERMISSION_CREATE,
        Permission.PERMISSION_UPDATE,
    )
    findAll(
        @Query('search') search?: string,
        @Query('all') all?: string,
    ) {
        return this.modulesService.findAll(search, all !== 'false');
    }

    @Get(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.MODULE_VIEW)
    findOne(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.modulesService.findOne(id);
    }

    @Post()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.MODULE_CREATE)
    create(@Body() dto: CreateModuleDto) {
        return this.modulesService.create(dto);
    }

    @Patch(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.MODULE_UPDATE)
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateModuleDto,
    ) {
        return this.modulesService.update(id, dto);
    }

    @Patch(':id/activate')
    @UseGuards(PermissionGuard)
    @AnyPermissions(Permission.MODULE_ACTIVATE, Permission.MODULE_UPDATE)
    activate(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.modulesService.activate(id);
    }

    @Patch(':id/deactivate')
    @UseGuards(PermissionGuard)
    @AnyPermissions(Permission.MODULE_DEACTIVATE, Permission.MODULE_UPDATE)
    deactivate(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.modulesService.deactivate(id);
    }

    @Delete(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.MODULE_DELETE)
    remove(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.modulesService.remove(id);
    }
}
