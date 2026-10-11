import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { LoansService, LoanUploadedFile } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ApproveLoanDto } from './dto/approve-loan.dto';
import { RejectLoanDto } from './dto/reject-loan.dto';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import { ConfigureRepaymentDto } from './dto/configure-repayment.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { LoanQueryDto } from './dto/loan-query.dto';
import { JwtAuthGuard, AuthenticatedRequest } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { Permissions } from '../permissions/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';

@Controller('loans')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post('apply')
  @Permissions(Permission.LOAN_APPLY)
  apply(@Req() req: AuthenticatedRequest, @Body() dto: CreateLoanDto) {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      throw new BadRequestException('User is not associated with an employee record');
    }
    return this.loansService.apply(employeeId, dto);
  }

  @Get('my-loans')
  @Permissions(Permission.LOAN_VIEW_OWN)
  findMyLoans(@Req() req: AuthenticatedRequest) {
    const employeeId = req.user.employeeId;
    if (!employeeId) {
      throw new BadRequestException('User is not associated with an employee record');
    }
    return this.loansService.findMyLoans(employeeId);
  }

  @Get('metrics')
  @Permissions(Permission.LOAN_VIEW_ALL)
  getMetrics() {
    return this.loansService.getMetrics();
  }

  @Get()
  @Permissions(Permission.LOAN_VIEW_ALL)
  findAll(@Query() query: LoanQueryDto) {
    return this.loansService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const loan = await this.loansService.findOne(id);
    // Allow viewing if applicant or HR/Admin
    const userRole = req.user.role;
    const isOwner = loan.employeeId === req.user.employeeId;
    const isHrOrAdmin = userRole === 'ADMIN' || userRole === 'HR';

    if (!isOwner && !isHrOrAdmin) {
      throw new ForbiddenException('You do not have permission to view this loan');
    }

    return loan;
  }

  @Post(':id/approve')
  @Permissions(Permission.LOAN_APPROVE)
  approve(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: ApproveLoanDto,
  ) {
    const hrEmployeeId = req.user.employeeId;
    return this.loansService.approve(id, hrEmployeeId, dto);
  }

  @Post(':id/reject')
  @Permissions(Permission.LOAN_REJECT)
  reject(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: RejectLoanDto,
  ) {
    const hrEmployeeId = req.user.employeeId;
    return this.loansService.reject(id, hrEmployeeId, dto);
  }

  @Post(':id/disburse')
  @Permissions(Permission.LOAN_DISBURSE)
  disburse(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: DisburseLoanDto,
  ) {
    const hrEmployeeId = req.user.employeeId;
    return this.loansService.disburse(id, hrEmployeeId, dto);
  }

  @Post(':id/configure-repayment')
  @Permissions(Permission.LOAN_CONFIGURE_REPAYMENT)
  configureRepayment(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: ConfigureRepaymentDto,
  ) {
    const hrEmployeeId = req.user.employeeId;
    return this.loansService.configureRepayment(id, hrEmployeeId, dto);
  }

  @Post(':id/start-repayment')
  @Permissions(Permission.LOAN_CONFIGURE_REPAYMENT)
  startRepayment(@Param('id') id: string) {
    return this.loansService.startRepayment(id);
  }

  @Post(':id/repayments/:installmentId/pay')
  @Permissions(Permission.LOAN_MANAGE_PAYMENT)
  recordPayment(
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.loansService.recordPayment(id, installmentId, dto);
  }

  @Post('upload-receipt')
  @Permissions(Permission.LOAN_DISBURSE, Permission.LOAN_MANAGE_PAYMENT)
  @UseInterceptors(FileInterceptor('file'))
  async uploadReceipt(@UploadedFile() file: LoanUploadedFile) {
    if (!file) {
      throw new BadRequestException('Receipt file is required');
    }
    const fileUrl = await this.loansService.saveReceiptFile(file);
    return { fileUrl, originalName: file.originalname };
  }

  @Get('receipts/:filename')
  serveReceipt(@Param('filename') filename: string, @Res() res: Response) {
    // Basic sanitization
    const sanitized = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filePath = join(process.cwd(), 'uploads', 'loans', 'receipts', sanitized);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Receipt file not found');
    }
    return res.sendFile(filePath);
  }
}
