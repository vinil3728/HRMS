import {
    Controller,
    Get,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { AuthenticatedRequest, JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { ScopedLeaveQueryDto } from '../dto/scoped-leave-query.dto';
import { LeaveService } from '../services/leave.service';

@Controller('leaves')
@UseGuards(
    JwtAuthGuard,
    PermissionGuard,
)
export class LeaveOverviewController {
    constructor(
        private readonly leaveService: LeaveService,
    ) {}

    @Get()
    @Permissions(Permission.LEAVE_VIEW)
    findAll(
        @Req() request: AuthenticatedRequest,
        @Query() query: ScopedLeaveQueryDto,
    ) {
        return this.leaveService.findAllScoped(
            request.user,
            query,
        );
    }
}
