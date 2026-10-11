import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Reimbursement } from './entities/reimbursement.entity';

import { CreateReimbursementDto } from './dto/create-reimbursement.dto';
import { UpdateReimbursementDto } from './dto/update-reimbursement.dto';
import { ReimbursementQueryDto } from './dto/reimbursement-query.dto';

import { ReimbursementStatus } from './enums/reimbursement-status.enum';

import { extname, join } from 'path';
import { createReadStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { EmployeeService } from '../employees/services/employee.service';

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class ReimbursementService {
  constructor(
    @InjectRepository(Reimbursement)
    private readonly reimbursementRepository: Repository<Reimbursement>,

    private readonly employeeService: EmployeeService,
  ) {}

  async create(
    employeeId: string,
    dto: CreateReimbursementDto,
  ) {
    const employee =
      await this.employeeService.findOne(employeeId);

    const reimbursement =
      this.reimbursementRepository.create({
        employee,
        expenseDate: new Date(dto.expenseDate),
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        status: ReimbursementStatus.DRAFT,
        rejectionReason: null,
        paidAt: null,
      });

    return this.reimbursementRepository.save(
      reimbursement,
    );
  }

  async findAll(
    employeeId: string,
    query: ReimbursementQueryDto,
  ) {
    await this.employeeService.findOne(employeeId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const queryBuilder =
      this.reimbursementRepository
        .createQueryBuilder('reimbursement')
        .leftJoinAndSelect(
          'reimbursement.employee',
          'employee',
        )
        .where(
          'employee.id = :employeeId',
          { employeeId },
        );

    if (query.status) {
      queryBuilder.andWhere(
        'reimbursement.status = :status',
        {
          status: query.status,
        },
      );
    }

    queryBuilder
      .orderBy(
        'reimbursement.createdAt',
        'DESC',
      )
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] =
      await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    employeeId: string,
    reimbursementId: string,
  ) {
    const reimbursement =
      await this.reimbursementRepository.findOne({
        where: {
          id: reimbursementId,
          employee: {
            id: employeeId,
          },
        },
        relations: {
          employee: true,
        },
      });

    if (!reimbursement) {
      throw new NotFoundException(
        'Reimbursement not found',
      );
    }

    return reimbursement;
  }

  async update(
    employeeId: string,
    reimbursementId: string,
    dto: UpdateReimbursementDto,
  ) {
    const reimbursement =
      await this.findOne(
        employeeId,
        reimbursementId,
      );

    if (
      reimbursement.status !==
      ReimbursementStatus.DRAFT
    ) {
      throw new BadRequestException(
        'Only DRAFT reimbursements can be updated',
      );
    }

    if (dto.expenseDate !== undefined) {
      reimbursement.expenseDate =
        new Date(dto.expenseDate);
    }

    if (dto.category !== undefined) {
      reimbursement.category = dto.category;
    }

    if (dto.description !== undefined) {
      reimbursement.description =
        dto.description;
    }

    if (dto.amount !== undefined) {
      reimbursement.amount = dto.amount;
    }

    if (dto.currency !== undefined) {
      reimbursement.currency = dto.currency;
    }

    return this.reimbursementRepository.save(
      reimbursement,
    );
  }

  async remove(
    employeeId: string,
    reimbursementId: string,
  ) {
    const reimbursement =
      await this.findOne(
        employeeId,
        reimbursementId,
      );

    if (
      reimbursement.status !==
      ReimbursementStatus.DRAFT
    ) {
      throw new BadRequestException(
        'Only DRAFT reimbursements can be deleted',
      );
    }

    await this.reimbursementRepository.remove(
      reimbursement,
    );

    return {
      message:
        'Reimbursement deleted successfully',
    };
  }

  async submit(
    employeeId: string,
    reimbursementId: string,
  ) {
    const reimbursement =
      await this.findOne(
        employeeId,
        reimbursementId,
      );

    if (
      reimbursement.status !==
      ReimbursementStatus.DRAFT
    ) {
      throw new BadRequestException(
        'Only DRAFT reimbursements can be submitted',
      );
    }

    if (reimbursement.amount <= 0) {
      throw new BadRequestException(
        'Reimbursement amount must be greater than zero',
      );
    }

    reimbursement.status =
      ReimbursementStatus.SUBMITTED;

    reimbursement.rejectionReason = null;

    return this.reimbursementRepository.save(
      reimbursement,
    );
  }

  async uploadReceipt(
    employeeId: string,
    reimbursementId: string,
    file: UploadedFile,
  ) {
    const reimbursement =
      await this.findOne(
        employeeId,
        reimbursementId,
      );

    if (
      reimbursement.status !==
      ReimbursementStatus.DRAFT
    ) {
      throw new BadRequestException(
        'Receipt can only be uploaded for DRAFT reimbursements',
      );
    }

    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (
      !allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new BadRequestException(
        'Only PDF, JPG and PNG files are allowed',
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new BadRequestException(
        'Receipt file size must not exceed 5 MB',
      );
    }

    const uploadDirectory = join(
      process.cwd(),
      'uploads',
      'reimbursements',
      reimbursementId,
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const extension =
      extname(file.originalname);

    const storedFileName =
      `${randomUUID()}${extension}`;

    const filePath = join(
      uploadDirectory,
      storedFileName,
    );

    await writeFile(
      filePath,
      file.buffer,
    );

    reimbursement.receiptFileName =
      file.originalname;

    reimbursement.receiptFilePath =
      filePath;

    reimbursement.receiptMimeType =
      file.mimetype;

    reimbursement.receiptFileSize =
      file.size;

    return this.reimbursementRepository.save(
      reimbursement,
    );
  }

  async downloadReceipt(
    employeeId: string,
    reimbursementId: string,
    response: Response,
  ): Promise<void> {
    const reimbursement =
      await this.findOne(
        employeeId,
        reimbursementId,
      );

    if (
      !reimbursement.receiptFilePath ||
      !reimbursement.receiptFileName
    ) {
      throw new NotFoundException(
        'Receipt file not found for this reimbursement',
      );
    }

    const fileStream = createReadStream(
      reimbursement.receiptFilePath,
    );

    fileStream.on('error', () => {
      if (!response.headersSent) {
        response.status(404).json({
          message: 'Receipt file not found on storage',
        });
      }
    });

    response.setHeader(
      'Content-Type',
      reimbursement.receiptMimeType || 'application/octet-stream',
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${reimbursement.receiptFileName}"`,
    );

    fileStream.pipe(response);
  }

  async approve(
    employeeId: string,
    reimbursementId: string,
  ) {
    const reimbursement =
      await this.findOne(
        employeeId,
        reimbursementId,
      );

    if (
      reimbursement.status !==
      ReimbursementStatus.SUBMITTED
    ) {
      throw new BadRequestException(
        'Only SUBMITTED reimbursements can be approved',
      );
    }

    reimbursement.status =
      ReimbursementStatus.APPROVED;

    reimbursement.rejectionReason = null;

    return this.reimbursementRepository.save(
      reimbursement,
    );
  }

  async reject(
    employeeId: string,
    reimbursementId: string,
    rejectionReason: string,
  ) {
    const reimbursement =
      await this.findOne(
        employeeId,
        reimbursementId,
      );

    if (
      reimbursement.status !==
      ReimbursementStatus.SUBMITTED
    ) {
      throw new BadRequestException(
        'Only SUBMITTED reimbursements can be rejected',
      );
    }

    reimbursement.status =
      ReimbursementStatus.REJECTED;

    reimbursement.rejectionReason =
      rejectionReason;

    return this.reimbursementRepository.save(
      reimbursement,
    );
  }

  async markAsPaid(
    employeeId: string,
    reimbursementId: string,
  ) {
    const reimbursement =
      await this.findOne(
        employeeId,
        reimbursementId,
      );

    if (
      reimbursement.status !==
      ReimbursementStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Only APPROVED reimbursements can be marked as PAID',
      );
    }

    reimbursement.status =
      ReimbursementStatus.PAID;

    reimbursement.paidAt = new Date();

    return this.reimbursementRepository.save(
      reimbursement,
    );
  }
}
