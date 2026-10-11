import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';

import { LeaveType } from '../enums/leave-type.enum';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('leave_balances')
@Unique('UQ_leave_balance_employee_type_year', [
    'employee',
    'leaveType',
    'year',
])
export class LeaveBalance {
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
        type: 'int',
    })
    year!: number;

    @Column({
        name: 'total_days',
        type: 'decimal',
        precision: 5,
        scale: 1,
        default: 0,
    })
    totalDays!: number;

    @Column({
        name: 'used_days',
        type: 'decimal',
        precision: 5,
        scale: 1,
        default: 0,
    })
    usedDays!: number;

    @Column({
        name: 'available_days',
        type: 'decimal',
        precision: 5,
        scale: 1,
        default: 0,
    })
    availableDays!: number;

    @CreateDateColumn({
        name: 'created_at',
    })
    createdAt!: Date;

    @UpdateDateColumn({
        name: 'updated_at',
    })
    updatedAt!: Date;
}