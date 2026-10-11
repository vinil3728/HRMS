import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { PayrollRunStatus } from '../enums/payroll-status.enum';
import { Payslip } from './payslip.entity';

@Entity('payroll_runs')
export class PayrollRun {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({
        type: 'int',
    })
    month!: number;

    @Column({
        type: 'int',
    })
    year!: number;

    @Column({
        name: 'run_date',
        type: 'date',
        default: () => 'CURRENT_DATE',
    })
    runDate!: Date;

    @Column({
        type: 'varchar',
        length: 50,
        default: PayrollRunStatus.DRAFT,
    })
    status!: PayrollRunStatus;

    @Column({
        name: 'total_employees',
        type: 'int',
        default: 0,
    })
    totalEmployees!: number;

    @Column({
        name: 'total_gross_pay',
        type: 'decimal',
        precision: 14,
        scale: 2,
        default: 0,
    })
    totalGrossPay!: number;

    @Column({
        name: 'total_deductions',
        type: 'decimal',
        precision: 14,
        scale: 2,
        default: 0,
    })
    totalDeductions!: number;

    @Column({
        name: 'total_net_pay',
        type: 'decimal',
        precision: 14,
        scale: 2,
        default: 0,
    })
    totalNetPay!: number;

    @Column({
        name: 'processed_by',
        type: 'varchar',
        length: 100,
    })
    processedBy!: string;

    @Column({
        name: 'approved_by',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    approvedBy!: string | null;

    @Column({
        name: 'paid_at',
        type: 'timestamptz',
        nullable: true,
    })
    paidAt!: Date | null;

    @Column({
        name: 'payment_reference',
        type: 'varchar',
        length: 100,
        nullable: true,
    })
    paymentReference!: string | null;

    @Column({
        type: 'text',
        nullable: true,
    })
    notes!: string | null;

    @OneToMany(() => Payslip, (payslip) => payslip.payrollRun)
    payslips!: Payslip[];

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
