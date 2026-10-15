import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import { PolicyService } from '../services/policy.service';

import { CreatePolicyDto } from '../dto/create-policy.dto';
import { PolicyQueryDto } from '../dto/policy-query.dto';
import { UpdatePolicyDto } from '../dto/update-policy.dto';

import {
    AuthenticatedRequest,
    JwtAuthGuard,
} from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller('policies')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PolicyController {
    constructor(
        private readonly policyService: PolicyService,
    ) {}

    @Post()
    @Permissions(Permission.POLICY_CREATE)
    create(
        @Body() dto: CreatePolicyDto,
    ) {
        return this.policyService.create(dto);
    }

    @Get()
    @Permissions(Permission.POLICY_VIEW)
    findAll(
        @Query() query: PolicyQueryDto,
        @CurrentUser() user: AuthenticatedRequest['user'],
    ) {
        return this.policyService.findAll(
            query,
            user.userId,
        );
    }

    @Get(':policyId')
    @Permissions(Permission.POLICY_VIEW)
    findOne(
        @Param('policyId')
        policyId: string,
        @CurrentUser() user: AuthenticatedRequest['user'],
    ) {
        return this.policyService.findOneForUser(
            policyId,
            user.userId,
        );
    }

    @Patch(':policyId')
    @Permissions(Permission.POLICY_UPDATE)
    update(
        @Param('policyId')
        policyId: string,
        @Body()
        dto: UpdatePolicyDto,
    ) {
        return this.policyService.update(
            policyId,
            dto,
        );
    }

    @Delete(':policyId')
    @Permissions(Permission.POLICY_DELETE)
    remove(
        @Param('policyId')
        policyId: string,
    ) {
        return this.policyService.remove(
            policyId,
        );
    }

    @Post(':policyId/publish')
    @Permissions(Permission.POLICY_PUBLISH)
    publish(
        @Param('policyId')
        policyId: string,
    ) {
        return this.policyService.publish(
            policyId,
        );
    }

    @Post(':policyId/archive')
    @Permissions(Permission.POLICY_ARCHIVE)
    archive(
        @Param('policyId')
        policyId: string,
    ) {
        return this.policyService.archive(
            policyId,
        );
    }
}