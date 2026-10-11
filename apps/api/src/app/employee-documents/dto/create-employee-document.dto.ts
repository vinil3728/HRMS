import {
    IsEnum,
    IsNotEmpty,
    IsString,
} from 'class-validator';

import { EmployeeDocumentType } from '../enums/employee-document-type.enum';

export class CreateEmployeeDocumentDto {
    @IsEnum(EmployeeDocumentType)
    documentType!: EmployeeDocumentType;

    @IsString()
    @IsNotEmpty()
    fileName!: string;

    @IsString()
    @IsNotEmpty()
    filePath!: string;

    @IsString()
    @IsNotEmpty()
    mimeType!: string;

    @IsNotEmpty()
    fileSize!: number;
}