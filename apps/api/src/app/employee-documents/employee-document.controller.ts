import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EmployeeDocumentService } from './employee-document.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { ScopeAccessGuard } from '../../auth/guards/scope-access.guard';
import { Permission } from '../permissions/enums/permission.enum';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { EmployeeDocumentType } from './enums/employee-document-type.enum';
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';

@Controller('employees/:employeeId/documents')
@UseGuards(
    JwtAuthGuard,
    PermissionGuard,
    ScopeAccessGuard,
)
export class EmployeeDocumentController {
    constructor(
        private readonly documentService: EmployeeDocumentService,
    ) {}

    @Post()
    @Permissions(
        Permission.EMPLOYEE_DOCUMENT_CREATE,
    )
    create(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Body()
        dto: CreateEmployeeDocumentDto,
    ) {
        return this.documentService.create(
            employeeId,
            dto,
        );
    }

    @Post('upload')
    @Permissions(
        Permission.EMPLOYEE_DOCUMENT_UPLOAD,
    )
    @UseInterceptors(
        FileInterceptor('file'),
    )
    upload(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @UploadedFile()
        file: {
            originalname: string;
            mimetype: string;
            size: number;
            buffer: Buffer;
        },
        @Body('documentType')
        documentType: EmployeeDocumentType,
    ) {
        if (!file) {
            throw new BadRequestException(
                'File is required',
            );
        }

        if (
            !Object.values(
                EmployeeDocumentType,
            ).includes(documentType)
        ) {
            throw new BadRequestException(
                'Invalid document type',
            );
        }

        return this.documentService.upload(
            employeeId,
            file,
            documentType,
        );
    }

    @Get()
    @Permissions(
        Permission.EMPLOYEE_DOCUMENT_VIEW,
    )
    findAll(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
    ) {
        return this.documentService.findAll(
            employeeId,
        );
    }

    @Get(':documentId/download')
    @Permissions(
        Permission.EMPLOYEE_DOCUMENT_DOWNLOAD,
    )
    async download(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'documentId',
            new ParseUUIDPipe(),
        )
        documentId: string,
        @Res()
        response: Response,
    ) {
        const document =
            await this.documentService.findOne(
                employeeId,
                documentId,
            );

        return this.documentService.download(
            document,
            response,
        );
    }

    @Get(':documentId')
    @Permissions(
        Permission.EMPLOYEE_DOCUMENT_VIEW,
    )
    findOne(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'documentId',
            new ParseUUIDPipe(),
        )
        documentId: string,
    ) {
        return this.documentService.findOne(
            employeeId,
            documentId,
        );
    }

    @Delete(':documentId')
    @Permissions(
        Permission.EMPLOYEE_DOCUMENT_DELETE,
    )
    remove(
        @Param(
            'employeeId',
            new ParseUUIDPipe(),
        )
        employeeId: string,
        @Param(
            'documentId',
            new ParseUUIDPipe(),
        )
        documentId: string,
    ) {
        return this.documentService.remove(
            employeeId,
            documentId,
        );
    }
}
