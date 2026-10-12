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

import { AnyPermissions, Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { Permission } from '../../permissions/enums/permission.enum';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
    constructor(
        private readonly roleService: RoleService,
    ) {}

    @Get()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.ROLE_VIEW)
    findAll(@Query('all') all?: string) {
        return this.roleService.findAll(all !== 'false');
    }

    @Get(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.ROLE_VIEW)
    findById(
        @Param('id') id: string,
    ) {
        return this.roleService.findById(id);
    }

    @Post()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.ROLE_CREATE)
    create(
        @Body() dto: CreateRoleDto,
    ) {
        return this.roleService.create(dto);
    }

    @Patch(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.ROLE_UPDATE)
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
    @UseGuards(PermissionGuard)
    @AnyPermissions(Permission.ROLE_ACTIVATE, Permission.ROLE_UPDATE)
    activate(
        @Param('id') id: string,
    ) {
        return this.roleService.activate(id);
    }

    @Patch(':id/deactivate')
    @UseGuards(PermissionGuard)
    @AnyPermissions(Permission.ROLE_DEACTIVATE, Permission.ROLE_UPDATE)
    deactivate(
        @Param('id') id: string,
    ) {
        return this.roleService.deactivate(id);
    }

    @Delete(':id')
    @UseGuards(PermissionGuard)
    @AnyPermissions(Permission.ROLE_DELETE, Permission.ROLE_UPDATE)
    remove(
        @Param('id') id: string,
    ) {
        return this.roleService.remove(id);
    }

    @Put(':id/permissions')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.ROLE_PERMISSION_ASSIGN)
    assignPermissions(
        @Param('id') id: string,
        @Body() dto: AssignPermissionsDto,
    ) {
        return this.roleService.assignPermissions(
            id,
            dto.permissionIds,
        );
    }

    @Get(':id/permissions')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.ROLE_VIEW)
    getPermissions(
        @Param('id') id: string,
    ) {
        return this.roleService.getPermissions(id);
    }
}
