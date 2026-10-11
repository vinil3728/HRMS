import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { ReimbursementStatus } from '../enums/reimbursement-status.enum';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('reimbursements')
export class Reimbursement {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @Column({
        name: 'expense_date',
        type: 'date',
    })
    expenseDate!: Date;

    @Column({
        name: 'category',
    })
    category!: string;

    @Column({
        type: 'text',
    })
    description!: string;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
    })
    amount!: number;

    @Column({
        type: 'varchar',
        length: 3,
        default: 'INR',
    })
    currency!: string;

    @Column({
        type: 'enum',
        enum: ReimbursementStatus,
        default: ReimbursementStatus.DRAFT,
    })
    status!: ReimbursementStatus;

    @Column({
        name: 'rejection_reason',
        type: 'text',
        nullable: true,
    })
    rejectionReason!: string | null;

    @Column({
        name: 'paid_at',
        type: 'timestamp',
        nullable: true,
    })
    paidAt!: Date | null;

    @Column({
        name: 'receipt_file_name',
        nullable: true,
    })
    receiptFileName!: string | null;

    @Column({
        name: 'receipt_file_path',
        nullable: true,
    })
    receiptFilePath!: string | null;

    @Column({
        name: 'receipt_mime_type',
        nullable: true,
    })
    receiptMimeType!: string | null;

    @Column({
        name: 'receipt_file_size',
        type: 'bigint',
        nullable: true,
    })
    receiptFileSize!: number | null;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}