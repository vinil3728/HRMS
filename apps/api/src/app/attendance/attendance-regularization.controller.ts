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
import { ScopeAccessGuard } from '../../auth/guards/scope-access.guard';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';

@Controller('employees/:employeeId/attendance-regularizations')
@UseGuards(
    JwtAuthGuard,
    PermissionGuard,
    ScopeAccessGuard,
)
export class AttendanceRegularizationController {
    constructor(
        private readonly regularizationService: AttendanceRegularizationService,
    ) {}

    @Post()
    @Permissions(Permission.ATTENDANCE_REGULARIZATION_CREATE)
    create(
        @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
        @Body() dto: CreateRegularizationDto,
    ) {
        return this.regularizationService.create(employeeId, dto);
    }

    @Get()
    @Permissions(Permission.ATTENDANCE_REGULARIZATION_VIEW)
    findAll(
        @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
        @Query() query: RegularizationQueryDto,
    ) {
        return this.regularizationService.findAll(employeeId, query);
    }

    @Get(':id')
    @Permissions(Permission.ATTENDANCE_REGULARIZATION_VIEW)
    findOne(
        @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.regularizationService.findOne(employeeId, id);
    }

    @Post(':id/cancel')
    @Permissions(Permission.ATTENDANCE_REGULARIZATION_CANCEL)
    cancel(
        @Param('employeeId', new ParseUUIDPipe()) employeeId: string,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.regularizationService.cancel(employeeId, id);
    }

    @Post(':id/approve')
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
