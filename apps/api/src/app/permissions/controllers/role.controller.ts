import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Put,
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
@UseGuards(JwtAuthGuard)
export class RoleController {
    constructor(
        private readonly roleService: RoleService,
    ) {}

    @Get()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.ROLE_VIEW)
    findAll() {
        return this.roleService.findAll();
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
    @Permissions(Permission.ROLE_ACTIVATE)
    activate(
        @Param('id') id: string,
    ) {
        return this.roleService.activate(id);
    }

    @Patch(':id/deactivate')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.ROLE_DEACTIVATE)
    deactivate(
        @Param('id') id: string,
    ) {
        return this.roleService.deactivate(id);
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
