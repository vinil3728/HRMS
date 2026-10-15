import {
    Controller,
    ForbiddenException,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';

import { PolicyAcknowledgementService } from '../services/policy-acknowledgement.service';

import {
    AuthenticatedRequest,
    JwtAuthGuard,
} from '../../../auth/guards/jwt-auth.guard';

import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { Permission } from '../../permissions/enums/permission.enum';
import { PermissionGuard } from '../../permissions/guards/permission.guard';

@Controller('policy-acknowledgements')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PolicyAcknowledgementController {
    constructor(
        private readonly policyAcknowledgementService: PolicyAcknowledgementService,
    ) {}

    @Post('employees/:employeeId/policies/:policyId')
    @Permissions(
        Permission.POLICY_ACKNOWLEDGEMENT_CREATE,
    )
    acknowledge(
        @Param('employeeId')
        employeeId: string,
        @Param('policyId')
        policyId: string,
        @CurrentUser()
        user: AuthenticatedRequest['user'],
    ) {
        this.validateEmployeeAccess(
            user,
            employeeId,
        );

        return this.policyAcknowledgementService.acknowledge(
            employeeId,
            policyId,
        );
    }

    @Get('employees/:employeeId')
    @Permissions(
        Permission.POLICY_ACKNOWLEDGEMENT_VIEW,
    )
    getEmployeeAcknowledgements(
        @Param('employeeId')
        employeeId: string,
        @CurrentUser()
        user: AuthenticatedRequest['user'],
    ) {
        this.validateEmployeeAccess(
            user,
            employeeId,
        );

        return this.policyAcknowledgementService
            .getEmployeeAcknowledgements(
                employeeId,
            );
    }

    @Get('policies/:policyId')
    @Permissions(
        Permission.POLICY_ACKNOWLEDGEMENT_POLICY_VIEW,
    )
    getPolicyAcknowledgements(
        @Param('policyId')
        policyId: string,
    ) {
        return this.policyAcknowledgementService
            .getPolicyAcknowledgements(
                policyId,
            );
    }

    @Get(
        'employees/:employeeId/policies/:policyId/status',
    )
    @Permissions(
        Permission.POLICY_ACKNOWLEDGEMENT_STATUS_VIEW,
    )
    getEmployeePolicyStatus(
        @Param('employeeId')
        employeeId: string,
        @Param('policyId')
        policyId: string,
        @CurrentUser()
        user: AuthenticatedRequest['user'],
    ) {
        this.validateEmployeeAccess(
            user,
            employeeId,
        );

        return this.policyAcknowledgementService
            .getEmployeePolicyStatus(
                employeeId,
                policyId,
            );
    }

    private validateEmployeeAccess(
        user: AuthenticatedRequest['user'],
        employeeId: string,
    ): void {
        /*
         * Employee-specific access is intentionally
         * restricted to the current employee here.
         *
         * Global access for HR/Admin should ultimately
         * be represented by the permission assigned to
         * their role rather than by checking the role
         * name in this controller.
         */
        if (user.employeeId !== employeeId) {
            throw new ForbiddenException(
                'You do not have access to this employee',
            );
        }
    }
}