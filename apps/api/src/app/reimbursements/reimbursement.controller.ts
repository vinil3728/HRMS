import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

import { ReimbursementService } from './reimbursement.service';

import { CreateReimbursementDto } from './dto/create-reimbursement.dto';
import { ReimbursementQueryDto } from './dto/reimbursement-query.dto';
import { UpdateReimbursementDto } from './dto/update-reimbursement.dto';
import { RejectReimbursementDto } from './dto/reject-reimbursement.dto';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScopeAccessGuard } from '../../auth/guards/scope-access.guard';

import { Permissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';
import { PermissionGuard } from '../permissions/guards/permission.guard';

type UploadedFile = {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
};

@Controller('employees/:employeeId/reimbursements')
@UseGuards(
    JwtAuthGuard,
    PermissionGuard,
    ScopeAccessGuard,
)
export class ReimbursementController {
    constructor(
        private readonly reimbursementService: ReimbursementService,
    ) {}

    @Post()
    @Permissions(
        Permission.REIMBURSEMENT_CREATE,
    )
    create(
        @Param('employeeId')
        employeeId: string,
        @Body()
        dto: CreateReimbursementDto,
    ) {
        return this.reimbursementService.create(
            employeeId,
            dto,
        );
    }

    @Get()
    @Permissions(
        Permission.REIMBURSEMENT_VIEW,
    )
    findAll(
        @Param('employeeId')
        employeeId: string,
        @Query()
        query: ReimbursementQueryDto,
    ) {
        return this.reimbursementService.findAll(
            employeeId,
            query,
        );
    }

    @Get(':reimbursementId')
    @Permissions(
        Permission.REIMBURSEMENT_VIEW,
    )
    findOne(
        @Param('employeeId')
        employeeId: string,
        @Param('reimbursementId')
        reimbursementId: string,
    ) {
        return this.reimbursementService.findOne(
            employeeId,
            reimbursementId,
        );
    }

    @Patch(':reimbursementId')
    @Permissions(
        Permission.REIMBURSEMENT_UPDATE,
    )
    update(
        @Param('employeeId')
        employeeId: string,
        @Param('reimbursementId')
        reimbursementId: string,
        @Body()
        dto: UpdateReimbursementDto,
    ) {
        return this.reimbursementService.update(
            employeeId,
            reimbursementId,
            dto,
        );
    }

    @Delete(':reimbursementId')
    @Permissions(
        Permission.REIMBURSEMENT_DELETE,
    )
    remove(
        @Param('employeeId')
        employeeId: string,
        @Param('reimbursementId')
        reimbursementId: string,
    ) {
        return this.reimbursementService.remove(
            employeeId,
            reimbursementId,
        );
    }

    @Post(':reimbursementId/submit')
    @Permissions(
        Permission.REIMBURSEMENT_SUBMIT,
    )
    submit(
        @Param('employeeId')
        employeeId: string,
        @Param('reimbursementId')
        reimbursementId: string,
    ) {
        return this.reimbursementService.submit(
            employeeId,
            reimbursementId,
        );
    }

    @Post(':reimbursementId/receipt')
    @Permissions(
        Permission.REIMBURSEMENT_RECEIPT_UPLOAD,
    )
    @UseInterceptors(
        FileInterceptor('file'),
    )
    uploadReceipt(
        @Param('employeeId')
        employeeId: string,
        @Param('reimbursementId')
        reimbursementId: string,
        @UploadedFile()
        file: UploadedFile,
    ) {
        if (!file) {
            throw new BadRequestException(
                'Receipt file is required',
            );
        }

        return this.reimbursementService.uploadReceipt(
            employeeId,
            reimbursementId,
            file,
        );
    }

    @Get(':reimbursementId/receipt')
    @Permissions(
        Permission.REIMBURSEMENT_VIEW,
    )
    downloadReceipt(
        @Param('employeeId')
        employeeId: string,
        @Param('reimbursementId')
        reimbursementId: string,
        @Res()
        response: Response,
    ) {
        return this.reimbursementService.downloadReceipt(
            employeeId,
            reimbursementId,
            response,
        );
    }

    @Post(':reimbursementId/approve')
    @Permissions(
        Permission.REIMBURSEMENT_APPROVE,
    )
    approve(
        @Param('employeeId')
        employeeId: string,
        @Param('reimbursementId')
        reimbursementId: string,
    ) {
        return this.reimbursementService.approve(
            employeeId,
            reimbursementId,
        );
    }

    @Post(':reimbursementId/reject')
    @Permissions(
        Permission.REIMBURSEMENT_REJECT,
    )
    reject(
        @Param('employeeId')
        employeeId: string,
        @Param('reimbursementId')
        reimbursementId: string,
        @Body()
        dto: RejectReimbursementDto,
    ) {
        return this.reimbursementService.reject(
            employeeId,
            reimbursementId,
            dto.rejectionReason,
        );
    }

    @Post(':reimbursementId/pay')
    @Permissions(
        Permission.REIMBURSEMENT_PAY,
    )
    markAsPaid(
        @Param('employeeId')
        employeeId: string,
        @Param('reimbursementId')
        reimbursementId: string,
    ) {
        return this.reimbursementService.markAsPaid(
            employeeId,
            reimbursementId,
        );
    }
}