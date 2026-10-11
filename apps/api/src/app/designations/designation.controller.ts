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

import { CreateDesignationDto } from './dto/create-designation.dto';
import { UpdateDesignationDto } from './dto/update-designation.dto';
import { DesignationService } from './designation.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { Permissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';
import { PermissionGuard } from '../permissions/guards/permission.guard';

@Controller('designations')
@UseGuards(JwtAuthGuard)
export class DesignationController {
    constructor(
        private readonly designationService: DesignationService,
    ) {}

    @Post()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.DESIGNATION_CREATE)
    create(
        @Body() dto: CreateDesignationDto,
    ) {
        return this.designationService.create(dto);
    }

    @Get()
    @UseGuards(PermissionGuard)
    @Permissions(Permission.DESIGNATION_VIEW)
    findAll(
        @Query('departmentId') departmentId?: string,
    ) {
        return this.designationService.findAll(departmentId);
    }

    @Get(':id')
    @UseGuards(PermissionGuard)
    @Permissions(Permission.DESIGNATION_VIEW)
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
    @UseGuards(PermissionGuard)
    @Permissions(Permission.DESIGNATION_UPDATE)
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
}