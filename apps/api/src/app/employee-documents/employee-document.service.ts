import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';

import { Response } from 'express';
import { EmployeeDocument } from './entities/employee-document.entity';
import { EmployeeService } from '../employees/services/employee.service';
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class EmployeeDocumentService {
  constructor(
    @InjectRepository(EmployeeDocument)
    private readonly documentRepository: Repository<EmployeeDocument>,

    private readonly employeeService: EmployeeService,
  ) {}

  async create(
    employeeId: string,
    dto: CreateEmployeeDocumentDto,
  ): Promise<EmployeeDocument> {
    const employee =
      await this.employeeService.findOne(
        employeeId,
      );

    const document =
      this.documentRepository.create({
        employee,
        documentType: dto.documentType,
        fileName: dto.fileName,
        filePath: dto.filePath,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
      });

    return this.documentRepository.save(
      document,
    );
  }

  async upload(
    employeeId: string,
    file: UploadedFile,
    documentType: string,
  ): Promise<EmployeeDocument> {
    const employee =
      await this.employeeService.findOne(
        employeeId,
      );

    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (
      !allowedMimeTypes.includes(
        file.mimetype,
      )
    ) {
      throw new BadRequestException(
        'Only PDF, JPG and PNG files are allowed',
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size cannot exceed 5 MB',
      );
    }

    const uploadDirectory = join(
      process.cwd(),
      'uploads',
      'employees',
      employeeId,
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const extension =
      file.originalname.split('.').pop() ?? '';

    const storedFileName =
      `${randomUUID()}.${extension}`;

    const filePath = join(
      uploadDirectory,
      storedFileName,
    );

    await writeFile(
      filePath,
      file.buffer,
    );

    const document =
      this.documentRepository.create({
        employee,
        documentType,
        fileName: file.originalname,
        filePath,
        mimeType: file.mimetype,
        fileSize: file.size,
      });

    return this.documentRepository.save(
      document,
    );
  }

  async download(
    document: EmployeeDocument,
    response: Response,
  ): Promise<void> {
    const fileStream =
      createReadStream(
        document.filePath,
      );

    fileStream.on('error', () => {
      if (!response.headersSent) {
        response.status(404).json({
          message: 'Document file not found',
        });
      }
    });

    response.setHeader(
      'Content-Type',
      document.mimeType,
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.fileName}"`,
    );

    fileStream.pipe(response);
  }

  async findAll(
    employeeId: string,
  ): Promise<EmployeeDocument[]> {
    await this.employeeService.findOne(
      employeeId,
    );

    return this.documentRepository.find({
      where: {
        employee: {
          id: employeeId,
        },
      },

      order: {
        uploadedAt: 'DESC',
      },
    });
  }

  async findOne(
    employeeId: string,
    documentId: string,
  ): Promise<EmployeeDocument> {
    const document =
      await this.documentRepository.findOne({
        where: {
          id: documentId,
          employee: {
            id: employeeId,
          },
        },
      });

    if (!document) {
      throw new NotFoundException(
        'Employee document not found',
      );
    }

    return document;
  }

  async remove(
    employeeId: string,
    documentId: string,
  ): Promise<{ message: string }> {
    const document =
      await this.findOne(
        employeeId,
        documentId,
      );

    try {
      await unlink(
        document.filePath,
      );
    } catch (error: any) {
      // File may already have been deleted.
      // We still remove the DB record.
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    await this.documentRepository.remove(
      document,
    );

    return {
      message:
        'Employee document deleted successfully',
    };
  }
}
