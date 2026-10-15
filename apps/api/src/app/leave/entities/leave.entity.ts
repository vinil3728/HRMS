import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { LeaveStatus } from '../enums/leave-status.enum';
import { LeaveType } from '../enums/leave-type.enum';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('leaves')
export class Leave {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Employee, {
        nullable: false,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'employee_id' })
    employee!: Employee;

    @Column({
        name: 'leave_type',
        type: 'enum',
        enum: LeaveType,
    })
    leaveType!: LeaveType;

    @Column({
        name: 'start_date',
        type: 'date',
    })
    startDate!: Date;

    @Column({
        name: 'end_date',
        type: 'date',
    })
    endDate!: Date;

    @Column({
        name: 'number_of_days',
        type: 'decimal',
        precision: 5,
        scale: 1,
    })
    numberOfDays!: number;

    @Column({
        name: 'is_half_day',
        type: 'boolean',
        default: false,
    })
    isHalfDay!: boolean;

    @Column({
        name: 'half_day_session',
        type: 'varchar',
        length: 20,
        nullable: true,
    })
    halfDaySession!: string | null;

    @Column({
        type: 'enum',
        enum: LeaveStatus,
        default: LeaveStatus.PENDING,
    })
    status!: LeaveStatus;

    @Column({
        type: 'text',
        nullable: true,
    })
    reason!: string | null;

    @Column({
        name: 'rejection_reason',
        type: 'text',
        nullable: true,
    })
    rejectionReason!: string | null;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}