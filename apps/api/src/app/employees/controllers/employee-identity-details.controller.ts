import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { EmployeeIdentityDetailsService } from '../services/employee-identity-details.service';

import { CreateEmployeeIdentityDetailsDto } from '../dto/create-employee-identity-details.dto';
import { UpdateEmployeeIdentityDetailsDto } from '../dto/update-employee-identity-details.dto';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ScopeAccessGuard } from '../../../auth/guards/scope-access.guard';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { PermissionGuard } from '../../permissions/guards/permission.guard';
import { Permission } from '../../permissions/enums/permission.enum';

@Controller('employees/:employeeId/identity')
@UseGuards(JwtAuthGuard, PermissionGuard, ScopeAccessGuard)
export class EmployeeIdentityDetailsController {
    constructor(
        private readonly identityService: EmployeeIdentityDetailsService,
    ) {}

    @Post()
    @Permissions(
        Permission.EMPLOYEE_IDENTITY_CREATE,
    )
    create(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Body()
        dto: CreateEmployeeIdentityDetailsDto,
    ) {
        return this.identityService.create(
            employeeId,
            dto,
        );
    }

    @Get()
    @Permissions(
        Permission.EMPLOYEE_IDENTITY_VIEW,
    )
    findOne(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
    ) {
        return this.identityService.findOne(
            employeeId,
        );
    }

    @Patch()
    @Permissions(
        Permission.EMPLOYEE_IDENTITY_UPDATE,
    )
    update(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Body()
        dto: UpdateEmployeeIdentityDetailsDto,
    ) {
        return this.identityService.update(
            employeeId,
            dto,
        );
    }
}