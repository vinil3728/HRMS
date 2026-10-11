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

import { EmployeeBankDetailsService } from '../services/employee-bank-details.service';

import { CreateEmployeeBankDetailsDto } from '../dto/create-employee-bank-details.dto';
import { UpdateEmployeeBankDetailsDto } from '../dto/update-employee-bank-details.dto';

import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { EmployeeAccessGuard } from '../../../auth/guards/employee-access.guard';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller('employees/:employeeId/bank-details')
@UseGuards(JwtAuthGuard)
export class EmployeeBankDetailsController {
    constructor(
        private readonly bankDetailsService: EmployeeBankDetailsService,
    ) {}

    @Post()
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        'EMPLOYEE_BANK_CREATE',
    )
    create(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Body()
        dto: CreateEmployeeBankDetailsDto,
    ) {
        return this.bankDetailsService.create(
            employeeId,
            dto,
        );
    }

    @Get()
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        'EMPLOYEE_BANK_VIEW',
    )
    findOne(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
    ) {
        return this.bankDetailsService.findOne(
            employeeId,
        );
    }

    @Patch()
    @UseGuards(
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(
        'EMPLOYEE_BANK_UPDATE',
    )
    update(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Body()
        dto: UpdateEmployeeBankDetailsDto,
    ) {
        return this.bankDetailsService.update(
            employeeId,
            dto,
        );
    }
}
