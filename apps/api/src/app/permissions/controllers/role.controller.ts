import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';

import { RoleService } from '../services/role.service';

import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { Permission } from '../../permissions/enums/permission.enum';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RoleController {
    constructor(
        private readonly roleService: RoleService,
    ) {}

    @Get()
    @Permissions(Permission.ROL_VIEW)
    findAll(@Query('all') all?: string) {
        return this.roleService.findAll(all !== 'false');
    }

    @Get(':id')
    @Permissions(Permission.ROL_VIEW)
    findById(
        @Param('id') id: string,
    ) {
        return this.roleService.findById(id);
    }

    @Post()
    @Permissions(Permission.ROL_CREATE)
    create(
        @Body() dto: CreateRoleDto,
    ) {
        return this.roleService.create(dto);
    }

    @Patch(':id')
    @Permissions(Permission.ROL_UPDATE)
    update(
        @Param('id') id: string,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.roleService.update(
            id,
            dto,
        );
    }

    @Patch(':id/activate')
    @Permissions(Permission.ROL_ACTIVATE)
    activate(
        @Param('id') id: string,
    ) {
        return this.roleService.activate(id);
    }

    @Patch(':id/deactivate')
    @Permissions(Permission.ROL_DEACTIVATE)
    deactivate(
        @Param('id') id: string,
    ) {
        return this.roleService.deactivate(id);
    }

    @Delete(':id')
    @Permissions(Permission.ROL_DELETE)
    remove(
        @Param('id') id: string,
    ) {
        return this.roleService.remove(id);
    }

    @Put(':id/permissions')
    @Permissions(Permission.ROL_PRM_ASSIGN)
    assignPermissions(
        @Param('id') id: string,
        @Body() dto: AssignPermissionsDto,
    ) {
        return this.roleService.assignPermissions(
            id,
            dto.permissions || dto.permissionIds || [],
        );
    }

    @Get(':id/permissions')
    @Permissions(Permission.PRM_VIEW)
    getPermissions(
        @Param('id') id: string,
    ) {
        return this.roleService.getPermissions(id);
    }
}
