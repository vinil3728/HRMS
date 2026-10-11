import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { LoanRepayment } from './loan-repayment.entity';
import { LoanStatus, LoanType, RepaymentMode } from '../enums/loan.enums';

@Entity('company_loans')
export class CompanyLoan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Employee, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ name: 'employee_id' })
  employeeId!: string;

  @Column({
    name: 'loan_type',
    type: 'varchar',
    default: LoanType.PERSONAL,
  })
  loanType!: LoanType;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  amount!: number;

  @Column({
    name: 'approved_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  approvedAmount!: number | null;

  @Column({
    name: 'tenure_months',
    type: 'integer',
    default: 6,
  })
  tenureMonths!: number;

  @Column({
    type: 'text',
  })
  purpose!: string;

  @Column({
    type: 'varchar',
    default: LoanStatus.PENDING,
  })
  status!: LoanStatus;

  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy!: Employee | null;

  @Column({
    name: 'approved_by_id',
    type: 'uuid',
    nullable: true,
  })
  approvedById!: string | null;

  @Column({
    name: 'approved_at',
    type: 'timestamp',
    nullable: true,
  })
  approvedAt!: Date | null;

  @Column({
    name: 'rejection_reason',
    type: 'text',
    nullable: true,
  })
  rejectionReason!: string | null;

  @Column({
    name: 'disbursed_at',
    type: 'timestamp',
    nullable: true,
  })
  disbursedAt!: Date | null;

  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'disbursed_by_id' })
  disbursedBy!: Employee | null;

  @Column({
    name: 'disbursed_by_id',
    type: 'uuid',
    nullable: true,
  })
  disbursedById!: string | null;

  @Column({
    name: 'disbursement_receipt_url',
    type: 'text',
    nullable: true,
  })
  disbursementReceiptUrl!: string | null;

  @Column({
    name: 'disbursement_reference',
    type: 'varchar',
    nullable: true,
  })
  disbursementReference!: string | null;

  @Column({
    name: 'repayment_mode',
    type: 'varchar',
    nullable: true,
  })
  repaymentMode!: RepaymentMode | null;

  @Column({
    name: 'cash_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  cashAmount!: number;

  @Column({
    name: 'salary_deduction_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  salaryDeductionAmount!: number;

  @Column({
    name: 'monthly_installment',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  monthlyInstallment!: number;

  @Column({
    name: 'total_repaid',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  totalRepaid!: number;

  @Column({
    name: 'remaining_balance',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0.0,
  })
  remainingBalance!: number;

  @Column({
    name: 'repayment_start_date',
    type: 'date',
    nullable: true,
  })
  repaymentStartDate!: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes!: string | null;

  @OneToMany(() => LoanRepayment, (repayment) => repayment.loan, {
    cascade: true,
  })
  repayments!: LoanRepayment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
