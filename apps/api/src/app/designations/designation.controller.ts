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

import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';
import { DesignationService } from './designation.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { Permissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';
import { PermissionGuard } from '../permissions/guards/permission.guard';

@Controller('designations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DesignationController {
    constructor(
        private readonly designationService: DesignationService,
    ) {}

    @Post()
    @Permissions(Permission.DSG_CREATE)
    create(
        @Body() dto: CreateDesignationDto,
    ) {
        return this.designationService.create(dto);
    }

    @Get()
    @Permissions(Permission.DSG_VIEW)
    findAll(
        @Query('departmentId') departmentId?: string,
    ) {
        return this.designationService.findAll(departmentId);
    }

    @Get(':id')
    @Permissions(Permission.DSG_VIEW)
    findOne(
        @Param(
            'id',
            new ParseUUIDPipe(),
        )
        id: string,
    ) {
        return this.designationService.findOne(id);
    }

    @Patch(':id')
    @Permissions(Permission.DSG_UPDATE)
    update(
        @Param(
            'id',
            new ParseUUIDPipe(),
        )
        id: string,
        @Body() dto: UpdateDesignationDto,
    ) {
        return this.designationService.update(
            id,
            dto,
        );
    }

    @Delete(':id')
    @Permissions(Permission.DSG_DELETE)
    remove(
        @Param(
            'id',
            new ParseUUIDPipe(),
        )
        id: string,
    ) {
        return this.designationService.remove(id);
    }
}