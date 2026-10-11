import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../../auth/entities/user.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { RolePermission } from '../../permissions/entities/role-permission.entity';
import { Permission } from '../../permissions/enums/permission.enum';
import { CreatePayrollRunDto } from '../dto/create-payroll-run.dto';
import { CreatePayslipDto } from '../dto/create-payslip.dto';
import { CreateSalaryStructureDto } from '../dto/create-salary-structure.dto';
import { MarkPaidDto } from '../dto/mark-paid.dto';
import { PayrollQueryDto } from '../dto/payroll-query.dto';
import { UpdatePayslipDto } from '../dto/update-payslip.dto';
import { PayrollRun } from '../entities/payroll-run.entity';
import { Payslip } from '../entities/payslip.entity';
import { SalaryStructure } from '../entities/salary-structure.entity';
import { PaymentMode } from '../enums/payment-mode.enum';
import { PayrollRunStatus } from '../enums/payroll-status.enum';
import { PayslipStatus } from '../enums/payslip-status.enum';

const ORG_PAYROLL_PERMISSIONS: string[] = [
    Permission.PAYROLL_SUMMARY_VIEW,
    Permission.PAYROLL_PROCESS,
    Permission.PAYROLL_CREATE,
    Permission.PAYROLL_UPDATE,
    Permission.PAYROLL_APPROVE,
    Permission.PAYROLL_REJECT,
    Permission.PAYROLL_DELETE,
];

@Injectable()
export class PayrollService {
    constructor(
        @InjectRepository(SalaryStructure)
        private readonly salaryStructureRepo: Repository<SalaryStructure>,

        @InjectRepository(PayrollRun)
        private readonly payrollRunRepo: Repository<PayrollRun>,

        @InjectRepository(Payslip)
        private readonly payslipRepo: Repository<Payslip>,

        @InjectRepository(Employee)
        private readonly employeeRepo: Repository<Employee>,

        @InjectRepository(RolePermission)
        private readonly rolePermissionRepo: Repository<RolePermission>,
    ) {}

    private async hasOrgWidePayrollAccess(userId?: string): Promise<boolean> {
        if (!userId) return false;
        const count = await this.rolePermissionRepo
            .createQueryBuilder('rolePermission')
            .innerJoin('rolePermission.role', 'role')
            .innerJoin('rolePermission.permission', 'permission')
            .innerJoin(User, 'user', 'user.role_id = role.id')
            .where('user.id = :userId', { userId })
            .andWhere('role.is_active = true')
            .andWhere('permission.is_active = true')
            .andWhere('permission.code IN (:...codes)', {
                codes: ORG_PAYROLL_PERMISSIONS,
            })
            .getCount();
        return count > 0;
    }

    // =========================================================
    // Payroll Summary Analytics
    // =========================================================
    async getSummary(month?: number, year?: number) {
        const query = this.payslipRepo.createQueryBuilder('p');

        if (month) {
            query.andWhere('p.month = :month', { month });
        }
        if (year) {
            query.andWhere('p.year = :year', { year });
        }

        const payslips = await query.getMany();

        const totalGross = payslips.reduce((sum, p) => sum + Number(p.grossEarnings || 0), 0);
        const totalNet = payslips.reduce((sum, p) => sum + Number(p.netPay || 0), 0);
        const totalDeductions = payslips.reduce((sum, p) => sum + Number(p.totalDeductions || 0), 0);

        const statusCounts = {
            DRAFT: payslips.filter((p) => p.status === PayslipStatus.DRAFT).length,
            PROCESSED: payslips.filter((p) => p.status === PayslipStatus.PROCESSED).length,
            APPROVED: payslips.filter((p) => p.status === PayslipStatus.APPROVED).length,
            PAID: payslips.filter((p) => p.status === PayslipStatus.PAID).length,
            REJECTED: payslips.filter((p) => p.status === PayslipStatus.REJECTED).length,
        };

        return {
            totalPayslips: payslips.length,
            totalGrossPay: Math.round(totalGross * 100) / 100,
            totalNetPay: Math.round(totalNet * 100) / 100,
            totalDeductions: Math.round(totalDeductions * 100) / 100,
            statusCounts,
            month: month || null,
            year: year || null,
        };
    }

    // =========================================================
    // Payroll Runs (Batch Processing)
    // =========================================================
    async getPayrollRuns(year?: number): Promise<PayrollRun[]> {
        const qb = this.payrollRunRepo.createQueryBuilder('run')
            .orderBy('run.year', 'DESC')
            .addOrderBy('run.month', 'DESC');

        if (year) {
            qb.where('run.year = :year', { year });
        }

        return qb.getMany();
    }

    async getPayrollRunById(id: string): Promise<PayrollRun> {
        const run = await this.payrollRunRepo.findOne({
            where: { id },
            relations: {
                payslips: {
                    employee: {
                        department: true,
                        designation: true,
                        bankDetails: true,
                    },
                },
            },
        });

        if (!run) {
            throw new NotFoundException(`Payroll run with ID "${id}" not found.`);
        }

        return run;
    }

    async createPayrollRun(dto: CreatePayrollRunDto, processedByUsername: string): Promise<PayrollRun> {
        let run = await this.payrollRunRepo.findOne({
            where: { month: dto.month, year: dto.year },
        });

        if (run && (run.status === PayrollRunStatus.APPROVED || run.status === PayrollRunStatus.PAID)) {
            throw new ConflictException(
                `Payroll run for ${dto.month}/${dto.year} is already ${run.status} and cannot be re-processed.`,
            );
        }

        if (!run) {
            run = this.payrollRunRepo.create({
                month: dto.month,
                year: dto.year,
                status: PayrollRunStatus.PROCESSING,
                processedBy: processedByUsername,
                notes: dto.notes || null,
                totalEmployees: 0,
                totalGrossPay: 0,
                totalDeductions: 0,
                totalNetPay: 0,
            });
            run = await this.payrollRunRepo.save(run);
        } else {
            run.status = PayrollRunStatus.PROCESSING;
            run.processedBy = processedByUsername;
            if (dto.notes) run.notes = dto.notes;
            await this.payrollRunRepo.save(run);
        }

        // Active employees
        const employees = await this.employeeRepo.find({
            where: { status: 'ACTIVE' },
            relations: {
                department: true,
                designation: true,
                bankDetails: true,
            },
        });

        const workingDays = 30;
        const startDate = new Date(dto.year, dto.month - 1, 1);
        const endDate = new Date(dto.year, dto.month, 0);
        const payDate = new Date(dto.year, dto.month, 1);

        let sumGross = 0;
        let sumDeductions = 0;
        let sumNet = 0;

        for (const emp of employees) {
            let structure = await this.salaryStructureRepo.findOne({
                where: { employee: { id: emp.id }, isActive: true },
            });

            if (!structure) {
                // Auto create baseline structure (e.g. 7.2 LPA CTC)
                const ctc = 720000;
                const monthlyGross = 60000;
                const basic = 27000;
                const hra = 15000;
                const conveyance = 2500;
                const medical = 1500;
                const special = monthlyGross - basic - hra - conveyance - medical;
                const pf = Math.round(basic * 0.12);
                const pt = 200;
                const tds = 3000;
                const totalDed = pf + pt + tds;
                const net = monthlyGross - totalDed;

                structure = this.salaryStructureRepo.create({
                    employee: emp,
                    ctc,
                    basicSalary: basic,
                    hra,
                    conveyanceAllowance: conveyance,
                    medicalAllowance: medical,
                    specialAllowance: special,
                    providentFund: pf,
                    professionalTax: pt,
                    tds,
                    grossSalary: monthlyGross,
                    totalDeductions: totalDed,
                    netSalary: net,
                    isActive: true,
                });
                structure = await this.salaryStructureRepo.save(structure);
            }

            // Check if payslip already exists for this employee, month, year
            let payslip = await this.payslipRepo.findOne({
                where: {
                    employee: { id: emp.id },
                    month: dto.month,
                    year: dto.year,
                },
            });

            const gross = Number(structure.grossSalary);
            const deductions = Number(structure.totalDeductions);
            const net = Number(structure.netSalary);

            if (!payslip) {
                payslip = this.payslipRepo.create({
                    payrollRun: run,
                    employee: emp,
                    month: dto.month,
                    year: dto.year,
                    payPeriodStart: startDate,
                    payPeriodEnd: endDate,
                    payDate,
                    workingDays,
                    paidDays: workingDays,
                    lossOfPayDays: 0,
                    basicSalary: Number(structure.basicSalary),
                    hra: Number(structure.hra),
                    conveyance: Number(structure.conveyanceAllowance),
                    medicalAllowance: Number(structure.medicalAllowance),
                    specialAllowance: Number(structure.specialAllowance),
                    bonus: 0,
                    overtimePay: 0,
                    reimbursements: 0,
                    grossEarnings: gross,
                    providentFund: Number(structure.providentFund),
                    professionalTax: Number(structure.professionalTax),
                    tds: Number(structure.tds),
                    lossOfPayDeduction: 0,
                    otherDeductions: 0,
                    totalDeductions: deductions,
                    netPay: net,
                    status: PayslipStatus.PROCESSED,
                    paymentMode: PaymentMode.BANK_TRANSFER,
                });
            } else {
                payslip.payrollRun = run;
                payslip.basicSalary = Number(structure.basicSalary);
                payslip.hra = Number(structure.hra);
                payslip.conveyance = Number(structure.conveyanceAllowance);
                payslip.medicalAllowance = Number(structure.medicalAllowance);
                payslip.specialAllowance = Number(structure.specialAllowance);
                payslip.grossEarnings = gross + Number(payslip.bonus || 0) + Number(payslip.overtimePay || 0);
                payslip.providentFund = Number(structure.providentFund);
                payslip.professionalTax = Number(structure.professionalTax);
                payslip.tds = Number(structure.tds);
                payslip.totalDeductions = deductions + Number(payslip.otherDeductions || 0) + Number(payslip.lossOfPayDeduction || 0);
                payslip.netPay = payslip.grossEarnings - payslip.totalDeductions;
                payslip.status = PayslipStatus.PROCESSED;
            }

            await this.payslipRepo.save(payslip);

            sumGross += Number(payslip.grossEarnings);
            sumDeductions += Number(payslip.totalDeductions);
            sumNet += Number(payslip.netPay);
        }

        run.totalEmployees = employees.length;
        run.totalGrossPay = Math.round(sumGross * 100) / 100;
        run.totalDeductions = Math.round(sumDeductions * 100) / 100;
        run.totalNetPay = Math.round(sumNet * 100) / 100;
        run.status = PayrollRunStatus.COMPLETED;

        await this.payrollRunRepo.save(run);
        return this.getPayrollRunById(run.id);
    }

    async approvePayrollRun(id: string, approverUsername: string): Promise<PayrollRun> {
        const run = await this.getPayrollRunById(id);

        run.status = PayrollRunStatus.APPROVED;
        run.approvedBy = approverUsername;
        await this.payrollRunRepo.save(run);

        // Mark all non-rejected payslips as approved
        await this.payslipRepo.createQueryBuilder()
            .update(Payslip)
            .set({ status: PayslipStatus.APPROVED })
            .where('payroll_run_id = :runId AND status != :rejected', {
                runId: id,
                rejected: PayslipStatus.REJECTED,
            })
            .execute();

        return this.getPayrollRunById(id);
    }

    async markPayrollRunPaid(id: string, dto: MarkPaidDto): Promise<PayrollRun> {
        const run = await this.getPayrollRunById(id);

        const paidDate = dto.paidAt ? new Date(dto.paidAt) : new Date();
        const ref = dto.paymentReference || `TX-REF-${Date.now()}`;
        const mode = dto.paymentMode || PaymentMode.BANK_TRANSFER;

        run.status = PayrollRunStatus.PAID;
        run.paidAt = paidDate;
        run.paymentReference = ref;
        await this.payrollRunRepo.save(run);

        // Mark associated payslips as PAID
        await this.payslipRepo.createQueryBuilder()
            .update(Payslip)
            .set({
                status: PayslipStatus.PAID,
                paidAt: paidDate,
                paymentReference: ref,
                paymentMode: mode,
            })
            .where('payroll_run_id = :runId AND status != :rejected', {
                runId: id,
                rejected: PayslipStatus.REJECTED,
            })
            .execute();

        return this.getPayrollRunById(id);
    }

    async deletePayrollRun(id: string): Promise<{ deleted: boolean }> {
        const run = await this.getPayrollRunById(id);
        if (run.status === PayrollRunStatus.PAID) {
            throw new BadRequestException('Cannot delete a disbursed / paid payroll batch.');
        }
        await this.payslipRepo.delete({ payrollRun: { id } });
        await this.payrollRunRepo.remove(run);
        return { deleted: true };
    }

    // =========================================================
    // Payslips Management
    // =========================================================
    async getPayslips(
        query: PayrollQueryDto,
        userId?: string,
        userEmployeeId?: string,
    ) {
        const isElevated = await this.hasOrgWidePayrollAccess(userId);
        const page = query.page || 1;
        const limit = query.limit || 50;

        if (!isElevated && !userEmployeeId) {
            return {
                items: [],
                total: 0,
                page,
                limit,
                totalPages: 1,
            };
        }

        const qb = this.payslipRepo.createQueryBuilder('p')
            .leftJoinAndSelect('p.employee', 'emp')
            .leftJoinAndSelect('emp.department', 'dept')
            .leftJoinAndSelect('emp.designation', 'desig')
            .leftJoinAndSelect('emp.bankDetails', 'bank')
            .leftJoinAndSelect('p.payrollRun', 'run')
            .orderBy('p.year', 'DESC')
            .addOrderBy('p.month', 'DESC')
            .addOrderBy('emp.firstName', 'ASC');

        if (!isElevated) {
            qb.andWhere('emp.id = :empId', { empId: userEmployeeId });
        } else if (query.employeeId) {
            qb.andWhere('emp.id = :empId', { empId: query.employeeId });
        }

        if (query.departmentId) {
            qb.andWhere('dept.id = :deptId', { deptId: query.departmentId });
        }

        if (query.payrollRunId) {
            qb.andWhere('run.id = :runId', { runId: query.payrollRunId });
        }

        if (query.month) {
            qb.andWhere('p.month = :month', { month: query.month });
        }

        if (query.year) {
            qb.andWhere('p.year = :year', { year: query.year });
        }

        if (query.status) {
            qb.andWhere('p.status = :status', { status: query.status });
        }

        if (query.search?.trim()) {
            const s = `%${query.search.trim().toLowerCase()}%`;
            qb.andWhere(
                '(LOWER(emp.firstName) LIKE :s OR LOWER(emp.lastName) LIKE :s OR LOWER(emp.employeeCode) LIKE :s OR LOWER(emp.email) LIKE :s)',
                { s },
            );
        }

        qb.skip((page - 1) * limit).take(limit);

        const [items, total] = await qb.getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getPayslipById(id: string): Promise<Payslip> {
        const payslip = await this.payslipRepo.findOne({
            where: { id },
            relations: {
                employee: {
                    department: true,
                    designation: true,
                    bankDetails: true,
                },
                payrollRun: true,
            },
        });

        if (!payslip) {
            throw new NotFoundException(`Payslip with ID "${id}" not found.`);
        }

        return payslip;
    }

    async getPayslipByIdForUser(
        id: string,
        userId?: string,
        userEmployeeId?: string,
    ): Promise<Payslip> {
        const payslip = await this.getPayslipById(id);
        const isElevated = await this.hasOrgWidePayrollAccess(userId);

        if (!isElevated && payslip.employee?.id !== userEmployeeId) {
            throw new ForbiddenException('You do not have access to this payslip.');
        }

        return payslip;
    }

    async createPayslip(dto: CreatePayslipDto): Promise<Payslip> {
        const emp = await this.employeeRepo.findOne({
            where: { id: dto.employeeId },
        });

        if (!emp) {
            throw new NotFoundException(`Employee with ID "${dto.employeeId}" not found.`);
        }

        const existing = await this.payslipRepo.findOne({
            where: {
                employee: { id: dto.employeeId },
                month: dto.month,
                year: dto.year,
            },
        });

        if (existing) {
            throw new ConflictException(
                `Payslip for employee "${emp.firstName} ${emp.lastName}" for ${dto.month}/${dto.year} already exists.`,
            );
        }

        const gross =
            Number(dto.basicSalary || 0) +
            Number(dto.hra || 0) +
            Number(dto.conveyance || 0) +
            Number(dto.medicalAllowance || 0) +
            Number(dto.specialAllowance || 0) +
            Number(dto.bonus || 0) +
            Number(dto.overtimePay || 0) +
            Number(dto.reimbursements || 0);

        const deductions =
            Number(dto.providentFund || 0) +
            Number(dto.professionalTax || 0) +
            Number(dto.tds || 0) +
            Number(dto.lossOfPayDeduction || 0) +
            Number(dto.otherDeductions || 0);

        const net = gross - deductions;

        let payrollRun: PayrollRun | null = null;
        if (dto.payrollRunId) {
            payrollRun = await this.payrollRunRepo.findOne({ where: { id: dto.payrollRunId } });
        }

        const payslip = this.payslipRepo.create({
            employee: emp,
            payrollRun,
            month: dto.month,
            year: dto.year,
            payPeriodStart: new Date(dto.payPeriodStart),
            payPeriodEnd: new Date(dto.payPeriodEnd),
            payDate: new Date(dto.payDate),
            workingDays: dto.workingDays ?? 30,
            paidDays: dto.paidDays ?? 30,
            lossOfPayDays: dto.lossOfPayDays ?? 0,
            basicSalary: dto.basicSalary,
            hra: dto.hra,
            conveyance: dto.conveyance ?? 0,
            medicalAllowance: dto.medicalAllowance ?? 0,
            specialAllowance: dto.specialAllowance ?? 0,
            bonus: dto.bonus ?? 0,
            overtimePay: dto.overtimePay ?? 0,
            reimbursements: dto.reimbursements ?? 0,
            grossEarnings: gross,
            providentFund: dto.providentFund ?? 0,
            professionalTax: dto.professionalTax ?? 0,
            tds: dto.tds ?? 0,
            lossOfPayDeduction: dto.lossOfPayDeduction ?? 0,
            otherDeductions: dto.otherDeductions ?? 0,
            totalDeductions: deductions,
            netPay: net,
            status: dto.status || PayslipStatus.DRAFT,
            paymentMode: dto.paymentMode || PaymentMode.BANK_TRANSFER,
            remarks: dto.remarks || null,
        });

        const saved = await this.payslipRepo.save(payslip);
        return this.getPayslipById(saved.id);
    }

    async updatePayslip(id: string, dto: UpdatePayslipDto): Promise<Payslip> {
        const payslip = await this.getPayslipById(id);

        if (dto.workingDays !== undefined) payslip.workingDays = dto.workingDays;
        if (dto.paidDays !== undefined) payslip.paidDays = dto.paidDays;
        if (dto.lossOfPayDays !== undefined) payslip.lossOfPayDays = dto.lossOfPayDays;

        if (dto.basicSalary !== undefined) payslip.basicSalary = dto.basicSalary;
        if (dto.hra !== undefined) payslip.hra = dto.hra;
        if (dto.conveyance !== undefined) payslip.conveyance = dto.conveyance;
        if (dto.medicalAllowance !== undefined) payslip.medicalAllowance = dto.medicalAllowance;
        if (dto.specialAllowance !== undefined) payslip.specialAllowance = dto.specialAllowance;
        if (dto.bonus !== undefined) payslip.bonus = dto.bonus;
        if (dto.overtimePay !== undefined) payslip.overtimePay = dto.overtimePay;
        if (dto.reimbursements !== undefined) payslip.reimbursements = dto.reimbursements;

        if (dto.providentFund !== undefined) payslip.providentFund = dto.providentFund;
        if (dto.professionalTax !== undefined) payslip.professionalTax = dto.professionalTax;
        if (dto.tds !== undefined) payslip.tds = dto.tds;
        if (dto.lossOfPayDeduction !== undefined) payslip.lossOfPayDeduction = dto.lossOfPayDeduction;
        if (dto.otherDeductions !== undefined) payslip.otherDeductions = dto.otherDeductions;

        if (dto.status !== undefined) payslip.status = dto.status;
        if (dto.paymentMode !== undefined) payslip.paymentMode = dto.paymentMode;
        if (dto.paymentReference !== undefined) payslip.paymentReference = dto.paymentReference;
        if (dto.remarks !== undefined) payslip.remarks = dto.remarks;

        const gross =
            Number(payslip.basicSalary || 0) +
            Number(payslip.hra || 0) +
            Number(payslip.conveyance || 0) +
            Number(payslip.medicalAllowance || 0) +
            Number(payslip.specialAllowance || 0) +
            Number(payslip.bonus || 0) +
            Number(payslip.overtimePay || 0) +
            Number(payslip.reimbursements || 0);

        const deductions =
            Number(payslip.providentFund || 0) +
            Number(payslip.professionalTax || 0) +
            Number(payslip.tds || 0) +
            Number(payslip.lossOfPayDeduction || 0) +
            Number(payslip.otherDeductions || 0);

        payslip.grossEarnings = Math.round(gross * 100) / 100;
        payslip.totalDeductions = Math.round(deductions * 100) / 100;
        payslip.netPay = Math.round((gross - deductions) * 100) / 100;

        await this.payslipRepo.save(payslip);
        return this.getPayslipById(id);
    }

    async approvePayslip(id: string): Promise<Payslip> {
        const payslip = await this.getPayslipById(id);
        payslip.status = PayslipStatus.APPROVED;
        await this.payslipRepo.save(payslip);
        return this.getPayslipById(id);
    }

    async rejectPayslip(id: string, reason: string): Promise<Payslip> {
        const payslip = await this.getPayslipById(id);
        payslip.status = PayslipStatus.REJECTED;
        payslip.rejectionReason = reason;
        await this.payslipRepo.save(payslip);
        return this.getPayslipById(id);
    }

    async markPayslipPaid(id: string, dto: MarkPaidDto): Promise<Payslip> {
        const payslip = await this.getPayslipById(id);
        payslip.status = PayslipStatus.PAID;
        payslip.paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
        if (dto.paymentMode) payslip.paymentMode = dto.paymentMode;
        if (dto.paymentReference) payslip.paymentReference = dto.paymentReference;
        await this.payslipRepo.save(payslip);
        return this.getPayslipById(id);
    }

    async deletePayslip(id: string): Promise<{ deleted: boolean }> {
        const payslip = await this.getPayslipById(id);
        if (payslip.status === PayslipStatus.PAID) {
            throw new BadRequestException('Cannot delete already disbursed / paid payslip.');
        }
        await this.payslipRepo.remove(payslip);
        return { deleted: true };
    }

    // =========================================================
    // Salary Structures
    // =========================================================
    async getSalaryStructures(): Promise<SalaryStructure[]> {
        return this.salaryStructureRepo.find({
            relations: {
                employee: {
                    department: true,
                    designation: true,
                },
            },
            order: {
                employee: { firstName: 'ASC' },
            },
        });
    }

    async getSalaryStructureByEmployee(employeeId: string): Promise<SalaryStructure> {
        const struct = await this.salaryStructureRepo.findOne({
            where: { employee: { id: employeeId }, isActive: true },
            relations: {
                employee: {
                    department: true,
                    designation: true,
                    bankDetails: true,
                },
            },
        });

        if (!struct) {
            throw new NotFoundException(`Active salary structure for employee "${employeeId}" not found.`);
        }

        return struct;
    }

    async createOrUpdateSalaryStructure(dto: CreateSalaryStructureDto): Promise<SalaryStructure> {
        const emp = await this.employeeRepo.findOne({ where: { id: dto.employeeId } });
        if (!emp) {
            throw new NotFoundException(`Employee with ID "${dto.employeeId}" not found.`);
        }

        let struct = await this.salaryStructureRepo.findOne({
            where: { employee: { id: dto.employeeId } },
        });

        const gross =
            Number(dto.basicSalary || 0) +
            Number(dto.hra || 0) +
            Number(dto.conveyanceAllowance || 0) +
            Number(dto.medicalAllowance || 0) +
            Number(dto.specialAllowance || 0);

        const deductions =
            Number(dto.providentFund || 0) +
            Number(dto.professionalTax || 0) +
            Number(dto.tds || 0);

        const net = gross - deductions;

        if (!struct) {
            struct = this.salaryStructureRepo.create({
                employee: emp,
                ctc: dto.ctc,
                basicSalary: dto.basicSalary,
                hra: dto.hra,
                conveyanceAllowance: dto.conveyanceAllowance ?? 0,
                medicalAllowance: dto.medicalAllowance ?? 0,
                specialAllowance: dto.specialAllowance ?? 0,
                providentFund: dto.providentFund ?? 0,
                professionalTax: dto.professionalTax ?? 0,
                tds: dto.tds ?? 0,
                grossSalary: gross,
                totalDeductions: deductions,
                netSalary: net,
                effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
                isActive: dto.isActive !== undefined ? dto.isActive : true,
            });
        } else {
            struct.ctc = dto.ctc;
            struct.basicSalary = dto.basicSalary;
            struct.hra = dto.hra;
            struct.conveyanceAllowance = dto.conveyanceAllowance ?? struct.conveyanceAllowance;
            struct.medicalAllowance = dto.medicalAllowance ?? struct.medicalAllowance;
            struct.specialAllowance = dto.specialAllowance ?? struct.specialAllowance;
            struct.providentFund = dto.providentFund ?? struct.providentFund;
            struct.professionalTax = dto.professionalTax ?? struct.professionalTax;
            struct.tds = dto.tds ?? struct.tds;
            struct.grossSalary = gross;
            struct.totalDeductions = deductions;
            struct.netSalary = net;
            if (dto.effectiveFrom) struct.effectiveFrom = new Date(dto.effectiveFrom);
            if (dto.isActive !== undefined) struct.isActive = dto.isActive;
        }

        const saved = await this.salaryStructureRepo.save(struct);
        return this.getSalaryStructureByEmployee(saved.employee.id);
    }
}
