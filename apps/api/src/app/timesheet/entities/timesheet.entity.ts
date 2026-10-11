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
import { TimesheetStatus } from '../enums/timesheet-status.enum';

@Entity('timesheets')
export class Timesheet {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @Column({
        name: 'work_date',
        type: 'date',
    })
    workDate!: Date;

    @Column({
        type: 'varchar',
        length: 200,
    })
    project!: string;

    @Column({
        type: 'text',
    })
    description!: string;

    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
    })
    hours!: number;

    @Column({
        type: 'enum',
        enum: TimesheetStatus,
        default: TimesheetStatus.DRAFT,
    })
    status!: TimesheetStatus;

    @Column({
        name: 'rejection_reason',
        type: 'text',
        nullable: true,
    })
    rejectionReason!: string | null;

    @Column({
        name: 'submitted_at',
        type: 'timestamp',
        nullable: true,
    })
    submittedAt!: Date | null;

    @Column({
        name: 'reviewed_at',
        type: 'timestamp',
        nullable: true,
    })
    reviewedAt!: Date | null;

    @ManyToOne(() => Employee, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'reviewed_by' })
    reviewedBy!: Employee | null;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}
