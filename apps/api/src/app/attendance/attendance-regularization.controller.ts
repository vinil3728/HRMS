import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AttendanceRegularizationService } from './attendance-regularization.service';
import { CreateRegularizationDto } from './dto/create-regularization.dto';
import { RejectRegularizationDto } from './dto/reject-regularization.dto';
import { RegularizationQueryDto } from './dto/regularization-query.dto';
import { JwtAuthGuard, AuthenticatedRequest } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { EmployeeAccessGuard } from '../../auth/guards/employee-access.guard';
import { ManagerAccessGuard } from '../../auth/guards/manager-access.guard';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';

@Controller('employees/:employeeId/attendance-regularizations')
export class AttendanceRegularizationController {
    constructor(
        private readonly regularizationService: AttendanceRegularizationService,
    ) {}

    @Post()
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.ATTENDANCE_REGULARIZATION_CREATE)
    create(
        @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
        @Body() dto: CreateRegularizationDto,
    ) {
        return this.regularizationService.create(employeeId, dto);
    }

    @Get()
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.ATTENDANCE_REGULARIZATION_VIEW)
    findAll(
        @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
        @Query() query: RegularizationQueryDto,
    ) {
        return this.regularizationService.findAll(employeeId, query);
    }

    @Get(':id')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.ATTENDANCE_REGULARIZATION_VIEW)
    findOne(
        @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.regularizationService.findOne(employeeId, id);
    }

    @Post(':id/cancel')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        EmployeeAccessGuard,
    )
    @Permissions(Permission.ATTENDANCE_REGULARIZATION_CANCEL)
    cancel(
        @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.regularizationService.cancel(employeeId, id);
    }

    @Post(':id/approve')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        ManagerAccessGuard,
    )
    @Permissions(Permission.ATTENDANCE_REGULARIZATION_APPROVE)
    approve(
        @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
        @Param('id', new ParseUUIDPipe()) id: string,
        @Req() req: AuthenticatedRequest,
        @Body('decisionNotes') decisionNotes?: string,
    ) {
        const approverEmployeeId = req.user?.employeeId;
        return this.regularizationService.approve(
            employeeId,
            id,
            approverEmployeeId,
            decisionNotes,
        );
    }

    @Post(':id/reject')
    @UseGuards(
        JwtAuthGuard,
        PermissionGuard,
        ManagerAccessGuard,
    )
    @Permissions(Permission.ATTENDANCE_REGULARIZATION_REJECT)
    reject(
        @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: RejectRegularizationDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const approverEmployeeId = req.user?.employeeId;
        return this.regularizationService.reject(
            employeeId,
            id,
            dto.rejectionReason,
            approverEmployeeId,
        );
    }
}
