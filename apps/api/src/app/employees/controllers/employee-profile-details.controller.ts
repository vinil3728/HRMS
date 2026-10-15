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

import { EmployeeProfileDetailsService } from '../services/employee-profile-details.service';

import { CreateEmployeeProfileDetailsDto } from '../dto/create-employee-profile-details.dto';
import { UpdateEmployeeProfileDetailsDto } from '../dto/update-employee-profile-details.dto';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ScopeAccessGuard } from '../../../auth/guards/scope-access.guard';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { PermissionGuard } from '../../permissions/guards/permission.guard';
import { Permission } from '../../permissions/enums/permission.enum';

@Controller('employees/:employeeId/profile')
@UseGuards(JwtAuthGuard, PermissionGuard, ScopeAccessGuard)
export class EmployeeProfileDetailsController {
    constructor(
        private readonly profileService: EmployeeProfileDetailsService,
    ) {}

    @Post()
    @Permissions(Permission.EMPLOYEE_PROFILE_CREATE)
    create(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Body()
        dto: CreateEmployeeProfileDetailsDto,
    ) {
        return this.profileService.create(
            employeeId,
            dto,
        );
    }

    @Get()
    @Permissions(Permission.EMPLOYEE_PROFILE_VIEW)
    findOne(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
    ) {
        return this.profileService.findOne(
            employeeId,
        );
    }

    @Patch()
    @Permissions(Permission.EMPLOYEE_PROFILE_UPDATE)
    update(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Body()
        dto: UpdateEmployeeProfileDetailsDto,
    ) {
        return this.profileService.update(
            employeeId,
            dto,
        );
    }
}
