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
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';

@Controller('modules')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ModulesController {
    constructor(private readonly modulesService: ModulesService) {}

    @Get()
    @Permissions(Permission.MOD_VIEW)
    findAll(
        @Query('search') search?: string,
        @Query('all') all?: string,
    ) {
        return this.modulesService.findAll(search, all !== 'false');
    }

    @Get(':id')
    @Permissions(Permission.MOD_VIEW)
    findOne(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.modulesService.findOne(id);
    }

    @Post()
    @Permissions(Permission.MOD_CREATE)
    create(@Body() dto: CreateModuleDto) {
        return this.modulesService.create(dto);
    }

    @Patch(':id')
    @Permissions(Permission.MOD_UPDATE)
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateModuleDto,
    ) {
        return this.modulesService.update(id, dto);
    }

    @Patch(':id/activate')
    @Permissions(Permission.MOD_ACTIVATE)
    activate(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.modulesService.activate(id);
    }

    @Patch(':id/deactivate')
    @Permissions(Permission.MOD_DEACTIVATE)
    deactivate(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.modulesService.deactivate(id);
    }

    @Delete(':id')
    @Permissions(Permission.MOD_DELETE)
    remove(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.modulesService.remove(id);
    }
}
