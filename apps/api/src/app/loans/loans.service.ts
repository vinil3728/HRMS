import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join, extname } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { CompanyLoan } from './entities/company-loan.entity';
import { LoanRepayment } from './entities/loan-repayment.entity';
import { Employee } from '../employees/entities/employee.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ApproveLoanDto } from './dto/approve-loan.dto';
import { RejectLoanDto } from './dto/reject-loan.dto';
import { DisburseLoanDto } from './dto/disburse-loan.dto';
import { ConfigureRepaymentDto } from './dto/configure-repayment.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { LoanQueryDto } from './dto/loan-query.dto';
import { InstallmentStatus, LoanStatus, RepaymentMode } from './enums/loan.enums';

export type LoanUploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(CompanyLoan)
    private readonly loanRepository: Repository<CompanyLoan>,
    @InjectRepository(LoanRepayment)
    private readonly repaymentRepository: Repository<LoanRepayment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async apply(employeeId: string, dto: CreateLoanDto): Promise<CompanyLoan> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee #${employeeId} not found`);
    }

    const loan = this.loanRepository.create({
      employeeId,
      loanType: dto.loanType,
      amount: dto.amount,
      approvedAmount: dto.amount,
      tenureMonths: dto.tenureMonths,
      purpose: dto.purpose,
      notes: dto.notes ?? null,
      status: LoanStatus.PENDING,
      totalRepaid: 0,
      remainingBalance: dto.amount,
    });

    return this.loanRepository.save(loan);
  }

  async findAll(query: LoanQueryDto): Promise<{ data: CompanyLoan[]; total: number }> {
    const qb = this.loanRepository
      .createQueryBuilder('loan')
      .leftJoinAndSelect('loan.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.designation', 'designation')
      .leftJoinAndSelect('loan.approvedBy', 'approvedBy')
      .leftJoinAndSelect('loan.disbursedBy', 'disbursedBy')
      .leftJoinAndSelect('loan.repayments', 'repayments');

    if (query.status) {
      qb.andWhere('loan.status = :status', { status: query.status });
    }

    if (query.employeeId) {
      qb.andWhere('loan.employeeId = :employeeId', { employeeId: query.employeeId });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(employee.firstName) LIKE LOWER(:search) OR LOWER(employee.lastName) LIKE LOWER(:search) OR LOWER(employee.employeeCode) LIKE LOWER(:search) OR LOWER(loan.purpose) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('loan.createdAt', 'DESC');

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findMyLoans(employeeId: string): Promise<CompanyLoan[]> {
    return this.loanRepository.find({
      where: { employeeId },
      relations: {
        employee: true,
        approvedBy: true,
        disbursedBy: true,
        repayments: true,
      },
      order: {
        createdAt: 'DESC',
        repayments: { installmentNumber: 'ASC' },
      },
    });
  }

  async findOne(id: string): Promise<CompanyLoan> {
    const loan = await this.loanRepository.findOne({
      where: { id },
      relations: {
        employee: true,
        approvedBy: true,
        disbursedBy: true,
        repayments: true,
      },
      order: {
        repayments: { installmentNumber: 'ASC' },
      },
    });

    if (!loan) {
      throw new NotFoundException(`Company loan #${id} not found`);
    }

    return loan;
  }

  async approve(id: string, hrEmployeeId: string, dto: ApproveLoanDto): Promise<CompanyLoan> {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.PENDING) {
      throw new BadRequestException(`Only PENDING loans can be approved (Current: ${loan.status})`);
    }

    const approvedAmount = dto.approvedAmount !== undefined ? Number(dto.approvedAmount) : Number(loan.amount);
    const tenureMonths = dto.tenureMonths !== undefined ? dto.tenureMonths : loan.tenureMonths;

    loan.status = LoanStatus.APPROVED;
    loan.approvedById = hrEmployeeId;
    loan.approvedAt = new Date();
    loan.approvedAmount = approvedAmount;
    loan.tenureMonths = tenureMonths;
    loan.remainingBalance = approvedAmount;
    if (dto.notes) {
      loan.notes = dto.notes;
    }

    return this.loanRepository.save(loan);
  }

  async reject(id: string, hrEmployeeId: string, dto: RejectLoanDto): Promise<CompanyLoan> {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.PENDING) {
      throw new BadRequestException(`Only PENDING loans can be rejected (Current: ${loan.status})`);
    }

    loan.status = LoanStatus.REJECTED;
    loan.approvedById = hrEmployeeId;
    loan.approvedAt = new Date();
    loan.rejectionReason = dto.rejectionReason;

    return this.loanRepository.save(loan);
  }

  async disburse(id: string, hrEmployeeId: string, dto: DisburseLoanDto): Promise<CompanyLoan> {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.APPROVED) {
      throw new BadRequestException(`Only APPROVED loans can be disbursed (Current: ${loan.status})`);
    }

    loan.status = LoanStatus.DISBURSED;
    loan.disbursedById = hrEmployeeId;
    loan.disbursedAt = new Date(dto.disbursedAt);
    loan.disbursementReference = dto.disbursementReference;
    if (dto.disbursementReceiptUrl) {
      loan.disbursementReceiptUrl = dto.disbursementReceiptUrl;
    }
    if (dto.notes) {
      loan.notes = dto.notes;
    }

    return this.loanRepository.save(loan);
  }

  async configureRepayment(id: string, hrEmployeeId: string, dto: ConfigureRepaymentDto): Promise<CompanyLoan> {
    const loan = await this.findOne(id);
    if (
      loan.status !== LoanStatus.DISBURSED &&
      loan.status !== LoanStatus.REPAYMENT_INITIATED &&
      loan.status !== LoanStatus.ACTIVE
    ) {
      throw new BadRequestException(
        `Repayment can only be configured for disbursed or active loans (Current: ${loan.status})`,
      );
    }

    const principal = Number(loan.approvedAmount || loan.amount);
    const tenure = dto.tenureMonths || loan.tenureMonths || 6;

    let cashAmount = 0;
    let salaryDeductionAmount = 0;

    if (dto.repaymentMode === RepaymentMode.SPLIT) {
      if (dto.cashAmount !== undefined && dto.salaryDeductionAmount !== undefined) {
        cashAmount = Number(dto.cashAmount);
        salaryDeductionAmount = Number(dto.salaryDeductionAmount);
      } else if (dto.cashAmount !== undefined) {
        cashAmount = Number(dto.cashAmount);
        salaryDeductionAmount = Number((principal - cashAmount).toFixed(2));
      } else if (dto.salaryDeductionAmount !== undefined) {
        salaryDeductionAmount = Number(dto.salaryDeductionAmount);
        cashAmount = Number((principal - salaryDeductionAmount).toFixed(2));
      } else {
        // Default 50/50 split
        cashAmount = Number((principal / 2).toFixed(2));
        salaryDeductionAmount = Number((principal - cashAmount).toFixed(2));
      }

      if (Math.abs(cashAmount + salaryDeductionAmount - principal) > 1.0) {
        throw new BadRequestException(
          `Sum of cash (${cashAmount}) and salary deduction (${salaryDeductionAmount}) must equal total loan amount (${principal})`,
        );
      }
    } else if (dto.repaymentMode === RepaymentMode.SALARY_DEDUCTION) {
      salaryDeductionAmount = principal;
      cashAmount = 0;
    } else {
      cashAmount = principal;
      salaryDeductionAmount = 0;
    }

    const monthlyInstallment = Number((principal / tenure).toFixed(2));

    loan.repaymentMode = dto.repaymentMode;
    loan.cashAmount = cashAmount;
    loan.salaryDeductionAmount = salaryDeductionAmount;
    loan.monthlyInstallment = monthlyInstallment;
    loan.tenureMonths = tenure;
    loan.repaymentStartDate = new Date(dto.repaymentStartDate);
    loan.status = LoanStatus.REPAYMENT_INITIATED;
    if (dto.notes) {
      loan.notes = dto.notes;
    }

    // Remove existing pending/unpaid repayments to regenerate clean schedule
    if (loan.repayments && loan.repayments.length > 0) {
      const unpaidRepayments = loan.repayments.filter((r) => Number(r.amountPaid) === 0);
      if (unpaidRepayments.length > 0) {
        await this.repaymentRepository.remove(unpaidRepayments);
      }
    }

    // Generate repayment schedule
    const newRepayments: LoanRepayment[] = [];
    const baseDate = new Date(dto.repaymentStartDate);

    for (let i = 1; i <= tenure; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(baseDate.getMonth() + (i - 1));

      // Handle last installment rounding difference
      let installmentAmount = monthlyInstallment;
      if (i === tenure) {
        installmentAmount = Number((principal - monthlyInstallment * (tenure - 1)).toFixed(2));
      }

      const repayment = this.repaymentRepository.create({
        loanId: loan.id,
        installmentNumber: i,
        dueDate: dueDate.toISOString().slice(0, 10),
        amountDue: installmentAmount,
        amountPaid: 0,
        paymentMode:
          dto.repaymentMode === RepaymentMode.SPLIT
            ? RepaymentMode.SALARY_DEDUCTION
            : dto.repaymentMode,
        status: InstallmentStatus.PENDING,
        notes: `Installment ${i} of ${tenure}`,
      });

      newRepayments.push(repayment);
    }

    await this.loanRepository.save(loan);
    await this.repaymentRepository.save(newRepayments);

    return this.findOne(loan.id);
  }

  async startRepayment(id: string): Promise<CompanyLoan> {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.REPAYMENT_INITIATED) {
      throw new BadRequestException(
        `Loan repayment can only be started from REPAYMENT_INITIATED state (Current: ${loan.status})`,
      );
    }

    loan.status = LoanStatus.ACTIVE;
    return this.loanRepository.save(loan);
  }

  async recordPayment(
    loanId: string,
    installmentId: string,
    dto: RecordPaymentDto,
  ): Promise<CompanyLoan> {
    const loan = await this.findOne(loanId);
    const repayment = await this.repaymentRepository.findOne({
      where: { id: installmentId, loanId },
    });

    if (!repayment) {
      throw new NotFoundException(`Installment #${installmentId} not found on loan #${loanId}`);
    }

    const previousPaid = Number(repayment.amountPaid || 0);
    const addedAmount = Number(dto.amountPaid);
    const totalPaidOnInstallment = Number((previousPaid + addedAmount).toFixed(2));
    const amountDue = Number(repayment.amountDue);

    repayment.amountPaid = totalPaidOnInstallment;
    repayment.paymentMode = dto.paymentMode;
    repayment.paidAt = new Date(dto.paidAt);
    if (dto.receiptUrl) {
      repayment.receiptUrl = dto.receiptUrl;
    }
    if (dto.notes) {
      repayment.notes = dto.notes;
    }

    if (totalPaidOnInstallment >= amountDue) {
      repayment.status = InstallmentStatus.PAID;
    } else {
      repayment.status = InstallmentStatus.PARTIAL;
    }

    await this.repaymentRepository.save(repayment);

    // Recalculate loan total repaid & remaining balance
    const allRepayments = await this.repaymentRepository.find({
      where: { loanId },
    });

    const totalRepaid = allRepayments.reduce(
      (sum, r) => sum + Number(r.amountPaid || 0),
      0,
    );
    const principal = Number(loan.approvedAmount || loan.amount);
    const remainingBalance = Math.max(0, Number((principal - totalRepaid).toFixed(2)));

    loan.totalRepaid = Number(totalRepaid.toFixed(2));
    loan.remainingBalance = remainingBalance;

    if (remainingBalance <= 0) {
      loan.status = LoanStatus.FULLY_REPAID;
    } else if (loan.status === LoanStatus.REPAYMENT_INITIATED) {
      loan.status = LoanStatus.ACTIVE;
    }

    await this.loanRepository.save(loan);
    return this.findOne(loanId);
  }

  async saveReceiptFile(file: LoanUploadedFile): Promise<string> {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPG, PNG and WebP files are allowed');
    }

    const maxSize = 8 * 1024 * 1024; // 8MB
    if (file.size > maxSize) {
      throw new BadRequestException('Receipt file size must not exceed 8 MB');
    }

    const uploadDirectory = join(process.cwd(), 'uploads', 'loans', 'receipts');
    await mkdir(uploadDirectory, { recursive: true });

    const extension = extname(file.originalname);
    const storedFileName = `${randomUUID()}${extension}`;
    const filePath = join(uploadDirectory, storedFileName);

    await writeFile(filePath, file.buffer);
    return `/uploads/loans/receipts/${storedFileName}`;
  }

  async getMetrics(): Promise<{
    totalDisbursed: number;
    totalRepaid: number;
    outstandingBalance: number;
    activeLoansCount: number;
    pendingCount: number;
  }> {
    const loans = await this.loanRepository.find();
    let totalDisbursed = 0;
    let totalRepaid = 0;
    let outstandingBalance = 0;
    let activeLoansCount = 0;
    let pendingCount = 0;

    for (const loan of loans) {
      if (
        loan.status === LoanStatus.DISBURSED ||
        loan.status === LoanStatus.REPAYMENT_INITIATED ||
        loan.status === LoanStatus.ACTIVE ||
        loan.status === LoanStatus.FULLY_REPAID
      ) {
        totalDisbursed += Number(loan.approvedAmount || loan.amount || 0);
        totalRepaid += Number(loan.totalRepaid || 0);
        outstandingBalance += Number(loan.remainingBalance || 0);
      }

      if (loan.status === LoanStatus.ACTIVE || loan.status === LoanStatus.REPAYMENT_INITIATED) {
        activeLoansCount++;
      }

      if (loan.status === LoanStatus.PENDING) {
        pendingCount++;
      }
    }

    return {
      totalDisbursed: Number(totalDisbursed.toFixed(2)),
      totalRepaid: Number(totalRepaid.toFixed(2)),
      outstandingBalance: Number(outstandingBalance.toFixed(2)),
      activeLoansCount,
      pendingCount,
    };
  }
}
