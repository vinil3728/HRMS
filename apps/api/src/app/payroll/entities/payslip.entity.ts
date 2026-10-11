import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { PayrollRun } from './payroll-run.entity';
import { PayslipStatus } from '../enums/payslip-status.enum';
import { PaymentMode } from '../enums/payment-mode.enum';

@Entity('payslips')
export class Payslip {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => PayrollRun, (run) => run.payslips, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'payroll_run_id' })
    payrollRun!: PayrollRun | null;

    @ManyToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @Column({
        type: 'int',
    })
    month!: number;

    @Column({
        type: 'int',
    })
    year!: number;

    @Column({
        name: 'pay_period_start',
        type: 'date',
    })
    payPeriodStart!: Date;

    @Column({
        name: 'pay_period_end',
        type: 'date',
    })
    payPeriodEnd!: Date;

    @Column({
        name: 'pay_date',
        type: 'date',
    })
    payDate!: Date;

    @Column({
        name: 'working_days',
        type: 'decimal',
        precision: 4,
        scale: 1,
        default: 30,
    })
    workingDays!: number;

    @Column({
        name: 'paid_days',
        type: 'decimal',
        precision: 4,
        scale: 1,
        default: 30,
    })
    paidDays!: number;

    @Column({
        name: 'loss_of_pay_days',
        type: 'decimal',
        precision: 4,
        scale: 1,
        default: 0,
    })
    lossOfPayDays!: number;

    // --- Earnings Breakdown ---
    @Column({
        name: 'basic_salary',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    basicSalary!: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    hra!: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    conveyance!: number;

    @Column({
        name: 'medical_allowance',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    medicalAllowance!: number;

    @Column({
        name: 'special_allowance',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    specialAllowance!: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    bonus!: number;

    @Column({
        name: 'overtime_pay',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    overtimePay!: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    reimbursements!: number;

    @Column({
        name: 'gross_earnings',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    grossEarnings!: number;

    // --- Deductions Breakdown ---
    @Column({
        name: 'provident_fund',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    providentFund!: number;

    @Column({
        name: 'professional_tax',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    professionalTax!: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    tds!: number;

    @Column({
        name: 'loss_of_pay_deduction',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    lossOfPayDeduction!: number;

    @Column({
        name: 'other_deductions',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    otherDeductions!: number;

    @Column({
        name: 'total_deductions',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    totalDeductions!: number;

    // --- Net In-hand Pay ---
    @Column({
        name: 'net_pay',
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    netPay!: number;

    @Column({
        type: 'varchar',
        length: 50,
        default: PayslipStatus.DRAFT,
    })
    status!: PayslipStatus;

    @Column({
        name: 'payment_mode',
        type: 'varchar',
        length: 50,
        default: PaymentMode.BANK_TRANSFER,
    })
    paymentMode!: PaymentMode;

    @Column({
        name: 'payment_reference',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    paymentReference!: string | null;

    @Column({
        name: 'paid_at',
        type: 'timestamptz',
        nullable: true,
    })
    paidAt!: Date | null;

    @Column({
        name: 'rejection_reason',
        type: 'text',
        nullable: true,
    })
    rejectionReason!: string | null;

    @Column({
        type: 'text',
        nullable: true,
    })
    remarks!: string | null;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
    })
    updatedAt!: Date;
}
