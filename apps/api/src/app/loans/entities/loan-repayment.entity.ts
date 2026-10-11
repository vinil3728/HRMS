import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyLoan } from './company-loan.entity';
import { InstallmentStatus, RepaymentMode } from '../enums/loan.enums';

@Entity('loan_repayments')
export class LoanRepayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CompanyLoan, (loan) => loan.repayments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'loan_id' })
  loan!: CompanyLoan;

  @Column({ name: 'loan_id' })
  loanId!: string;

  @Column({
    name: 'installment_number',
    type: 'integer',
  })
  installmentNumber!: number;

  @Column({
    name: 'due_date',
    type: 'date',
  })
  dueDate!: string;

  @Column({
    name: 'amount_due',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amountDue!: number;

  @Column({
    name: 'amount_paid',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  amountPaid!: number;

  @Column({
    name: 'payment_mode',
    type: 'varchar',
    default: RepaymentMode.SALARY_DEDUCTION,
  })
  paymentMode!: RepaymentMode;

  @Column({
    type: 'varchar',
    default: InstallmentStatus.PENDING,
  })
  status!: InstallmentStatus;

  @Column({
    name: 'paid_at',
    type: 'timestamp',
    nullable: true,
  })
  paidAt!: Date | null;

  @Column({
    name: 'receipt_url',
    type: 'text',
    nullable: true,
  })
  receiptUrl!: string | null;

  @Column({
    name: 'payroll_run_id',
    type: 'uuid',
    nullable: true,
  })
  payrollRunId!: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
